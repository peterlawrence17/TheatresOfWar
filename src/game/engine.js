import { FACTIONS, getCard, getCatalog, getDeckList, getFaction } from "./cards.js";

export const HQ_MAX = 25;
const HAND_SIZE = 7;

export function createGame(roomCode) {
  return {
    roomCode,
    status: "lobby",
    players: [],
    activePlayer: 0,
    winnerIndex: null,
    turn: 0,
    phase: "lobby",
    combat: { attackers: [] },
    log: [],
    nextCardInstance: 1,
    createdAt: Date.now()
  };
}

export function addPlayer(game, { socketId, name, factionId }) {
  if (game.players.length >= 2) {
    throw new Error("This battle already has two players.");
  }
  if (!getFaction(factionId)) {
    throw new Error("Pick a valid faction.");
  }

  const safeName = String(name || "").trim().slice(0, 24) || `Player ${game.players.length + 1}`;
  const player = {
    socketId,
    name: safeName,
    factionId,
    connected: true,
    hq: HQ_MAX,
    deck: [],
    hand: [],
    discard: [],
    battlefield: [],
    operations: [],
    supplyTotal: 0,
    supplyAvailable: 0,
    supplyPlayed: false
  };

  game.players.push(player);
  writeLog(game, `${safeName} joins as ${getFaction(factionId).shortName}.`);
  return game.players.length - 1;
}

export function startGame(game, options = {}) {
  if (game.players.length !== 2) {
    throw new Error("Two players are required to start.");
  }
  if (game.status === "playing") {
    return;
  }

  for (const [playerIndex, player] of game.players.entries()) {
    player.deck = buildDeck(game, player.factionId, playerIndex, options.shuffle !== false);
    player.hand = [];
    player.discard = [];
    player.battlefield = [];
    player.operations = [];
    player.hq = HQ_MAX;
    player.supplyTotal = 0;
    player.supplyAvailable = 0;
    player.supplyPlayed = false;
    drawCards(game, playerIndex, HAND_SIZE);
    smoothOpeningHand(player);
  }

  game.status = "playing";
  game.turn = 1;
  game.activePlayer = Number.isInteger(options.startingPlayer)
    ? options.startingPlayer
    : Math.floor(Math.random() * 2);
  game.winnerIndex = null;
  game.combat = { attackers: [] };
  beginTurn(game, { skipDraw: true });
  writeLog(game, `${game.players[game.activePlayer].name} takes the first turn and skips the first draw.`);
}

export function playCard(game, playerIndex, cardIid, rawTarget = null) {
  assertPlaying(game);
  assertActiveMainPhase(game, playerIndex);
  const player = game.players[playerIndex];
  const handIndex = player.hand.findIndex((card) => card.iid === cardIid);
  if (handIndex === -1) {
    throw new Error("That card is not in your hand.");
  }

  const card = player.hand[handIndex];
  const target = normalizeTarget(game, rawTarget);
  validateTargetForCard(game, playerIndex, card, target);

  if (card.type === "supply") {
    if (player.supplyPlayed) {
      throw new Error("You can play only one Supply Line each turn.");
    }
    player.hand.splice(handIndex, 1);
    player.supplyPlayed = true;
    player.supplyTotal += 1;
    player.supplyAvailable += 1;
    writeLog(game, `${player.name} extends a Supply Line (${player.supplyTotal} total).`);
    return;
  }

  if (player.supplyAvailable < card.cost) {
    throw new Error(`Not enough supply. ${card.name} costs ${card.cost}.`);
  }

  player.supplyAvailable -= card.cost;
  player.hand.splice(handIndex, 1);

  if (card.type === "unit") {
    card.damage = 0;
    card.exhausted = false;
    card.summoningSick = true;
    card.temp = freshTemp();
    player.battlefield.push(card);
    writeLog(game, `${player.name} deploys ${card.name}.`);
    applyEffects(game, playerIndex, card.effects ?? [], target);
  } else if (card.type === "operation") {
    player.operations.push(card);
    writeLog(game, `${player.name} establishes ${card.name}.`);
    applyEffects(game, playerIndex, card.effects ?? [], target);
  } else if (card.type === "tactic") {
    writeLog(game, `${player.name} plays ${card.name}.`);
    applyEffects(game, playerIndex, card.effects ?? [], target);
    player.discard.push(card);
  } else {
    throw new Error(`Cannot play card type ${card.type}.`);
  }

  cleanupDeadUnits(game);
  checkGameOver(game);
}

export function advancePhase(game, playerIndex) {
  assertPlaying(game);
  if (game.phase === "main1") {
    assertActive(game, playerIndex);
    if (!hasLegalAttackers(game, playerIndex)) {
      writeLog(game, `${game.players[playerIndex].name} has no legal attacks. The turn ends.`);
      endTurn(game);
      return;
    }
    game.phase = "declareAttackers";
    game.combat = { attackers: [] };
    writeLog(game, `${game.players[playerIndex].name} moves to combat.`);
    return;
  }

  if (game.phase === "declareAttackers") {
    assertActive(game, playerIndex);
    if (game.combat.attackers.length === 0) {
      writeLog(game, `${game.players[playerIndex].name} holds the line and declares no attacks.`);
      endTurn(game);
      return;
    }

    for (const attack of game.combat.attackers) {
      const found = findUnit(game, attack.attackerId);
      if (found) {
        applyEffects(game, found.ownerIndex, found.unit.onAttack ?? [], null, { sourceUnit: found.unit });
      }
    }

    cleanupDeadUnits(game);
    game.combat.attackers = game.combat.attackers.filter((attack) => findUnit(game, attack.attackerId));
    if (game.combat.attackers.length === 0 || game.status !== "playing") {
      if (game.status === "playing") {
        endTurn(game);
      }
      return;
    }

    if (!hasLegalBlockAssignments(game)) {
      writeLog(game, `${game.players[getDefenderIndex(game)].name} has no legal blocks.`);
      resolveCombat(game);
      if (game.status === "playing") {
        endTurn(game);
      }
      return;
    }

    game.phase = "declareBlockers";
    writeLog(game, `${game.players[playerIndex].name} commits ${game.combat.attackers.length} attack(s).`);
    return;
  }

  if (game.phase === "declareBlockers") {
    const defenderIndex = getDefenderIndex(game);
    if (playerIndex !== defenderIndex) {
      throw new Error("The defender must resolve blockers.");
    }
    resolveCombat(game);
    if (game.status === "playing") {
      game.phase = "main2";
    }
    return;
  }

  if (game.phase === "main2") {
    assertActive(game, playerIndex);
    endTurn(game);
    return;
  }

  throw new Error("No phase action is available right now.");
}

export function toggleAttacker(game, playerIndex, unitIid) {
  assertPlaying(game);
  assertActive(game, playerIndex);
  if (game.phase !== "declareAttackers") {
    throw new Error("Attackers can only be declared during combat.");
  }

  const found = findUnit(game, unitIid);
  if (!found || found.ownerIndex !== playerIndex) {
    throw new Error("That is not one of your units.");
  }

  const existingIndex = game.combat.attackers.findIndex((attack) => attack.attackerId === unitIid);
  const unit = found.unit;
  if (existingIndex !== -1) {
    game.combat.attackers.splice(existingIndex, 1);
    if (!hasKeyword(game, unit, "Entrenched")) {
      unit.exhausted = false;
    }
    return;
  }

  assertCanAttack(game, unit);

  if (!hasKeyword(game, unit, "Entrenched")) {
    unit.exhausted = true;
  }
  game.combat.attackers.push({ attackerId: unit.iid, blockerId: null });
}

export function assignBlocker(game, playerIndex, attackerIid, blockerIid) {
  assertPlaying(game);
  if (game.phase !== "declareBlockers") {
    throw new Error("Blockers can only be assigned during the block phase.");
  }
  if (playerIndex !== getDefenderIndex(game)) {
    throw new Error("Only the defender can assign blockers.");
  }

  const attack = game.combat.attackers.find((entry) => entry.attackerId === attackerIid);
  if (!attack) {
    throw new Error("That attacker is no longer attacking.");
  }
  if (attack.blockerId) {
    throw new Error("That attacker already has a blocker.");
  }
  if (game.combat.attackers.some((entry) => entry.blockerId === blockerIid)) {
    throw new Error("That unit is already blocking.");
  }

  const attacker = findUnit(game, attackerIid);
  const blocker = findUnit(game, blockerIid);
  if (!attacker || !blocker) {
    throw new Error("Both units must still be in battle.");
  }
  if (blocker.ownerIndex !== playerIndex) {
    throw new Error("You can block only with your own units.");
  }
  if (blocker.unit.exhausted) {
    throw new Error("Exhausted units cannot block.");
  }
  if (!canBlock(game, attacker.unit, blocker.unit)) {
    throw new Error(`${blocker.unit.name} cannot block ${attacker.unit.name}.`);
  }

  blocker.unit.exhausted = true;
  attack.blockerId = blockerIid;
  writeLog(game, `${game.players[playerIndex].name} blocks ${attacker.unit.name} with ${blocker.unit.name}.`);

  if (!hasLegalBlockAssignments(game)) {
    writeLog(game, `${game.players[playerIndex].name} has no further legal blocks.`);
    resolveCombat(game);
    if (game.status === "playing") {
      endTurn(game);
    }
  }
}

export function surrender(game, playerIndex) {
  assertPlaying(game);
  const opponentIndex = getOpponentIndex(playerIndex);
  game.status = "finished";
  game.winnerIndex = opponentIndex;
  game.phase = "finished";
  writeLog(game, `${game.players[playerIndex].name} concedes. ${game.players[opponentIndex].name} wins.`);
}

export function createCardInstance(game, cardId, ownerIndex) {
  const card = cloneCard(getCard(cardId));
  return {
    ...card,
    iid: `c${game.nextCardInstance++}`,
    ownerIndex,
    damage: 0,
    exhausted: false,
    summoningSick: false,
    temp: freshTemp()
  };
}

export function getPublicState(game, viewerSocketId) {
  const viewerIndex = game.players.findIndex((player) => player.socketId === viewerSocketId);
  return {
    roomCode: game.roomCode,
    status: game.status,
    phase: game.phase,
    turn: game.turn,
    activePlayer: game.activePlayer,
    defenderIndex: game.status === "playing" ? getDefenderIndex(game) : null,
    viewerIndex,
    winnerIndex: game.winnerIndex,
    combat: game.combat,
    players: game.players.map((player, index) => serializePlayer(game, player, index, index === viewerIndex)),
    log: game.log.slice(-60),
    catalog: getCatalog()
  };
}

export function getEffectiveStats(game, unit) {
  if (unit.type !== "unit") {
    return { attack: 0, defense: 0, keywords: [] };
  }

  let attack = Number(unit.attack ?? 0) + Number(unit.temp?.attack ?? 0);
  let defense = Number(unit.defense ?? 0) + Number(unit.temp?.defense ?? 0);
  const keywords = getUnitKeywords(unit);
  const owner = game.players[unit.ownerIndex];
  const opponent = game.players[getOpponentIndex(unit.ownerIndex)];

  for (const operation of owner?.operations ?? []) {
    const bonus = operation.passive?.statBonus;
    if (bonus && matchesPassiveFilter(unit, keywords, bonus)) {
      attack += Number(bonus.attack ?? 0);
      defense += Number(bonus.defense ?? 0);
    }
  }

  for (const operation of opponent?.operations ?? []) {
    const penalty = operation.passive?.enemyStatPenalty;
    if (penalty && matchesPassiveFilter(unit, keywords, penalty)) {
      attack += Number(penalty.attack ?? 0);
      defense += Number(penalty.defense ?? 0);
    }
  }

  return {
    attack: Math.max(0, attack),
    defense: Math.max(1, defense),
    keywords
  };
}

export function canBlock(game, attacker, blocker) {
  const blockerStats = getEffectiveStats(game, blocker);
  if (hasKeyword(game, attacker, "Airborne") && !hasKeyword(game, blocker, "Airborne") && !hasKeyword(game, blocker, "AA")) {
    return false;
  }
  if (hasKeyword(game, attacker, "Infiltrate") && blockerStats.attack >= 4) {
    return false;
  }
  return true;
}

function assertCanAttack(game, unit) {
  const stats = getEffectiveStats(game, unit);
  if (stats.attack <= 0) {
    throw new Error("Units with 0 attack cannot attack.");
  }
  if (unit.exhausted) {
    throw new Error("Exhausted units cannot attack.");
  }
  if (hasKeyword(game, unit, "Garrison")) {
    throw new Error("Garrison units cannot attack.");
  }
  if (unit.summoningSick && !hasKeyword(game, unit, "Blitz")) {
    throw new Error("This unit just deployed and needs Blitz to attack.");
  }
}

function canAttack(game, unit) {
  try {
    assertCanAttack(game, unit);
    return true;
  } catch {
    return false;
  }
}

function hasLegalAttackers(game, playerIndex) {
  return game.players[playerIndex]?.battlefield?.some((unit) => canAttack(game, unit)) ?? false;
}

function hasLegalBlockAssignments(game) {
  const defenderIndex = getDefenderIndex(game);
  const defender = game.players[defenderIndex];
  const usedBlockers = new Set(game.combat.attackers.map((attack) => attack.blockerId).filter(Boolean));

  for (const attack of game.combat.attackers) {
    if (attack.blockerId) {
      continue;
    }
    const attacker = findUnit(game, attack.attackerId)?.unit;
    if (!attacker) {
      continue;
    }
    for (const blocker of defender?.battlefield ?? []) {
      if (blocker.exhausted || usedBlockers.has(blocker.iid)) {
        continue;
      }
      if (canBlock(game, attacker, blocker)) {
        return true;
      }
    }
  }

  return false;
}

function buildDeck(game, factionId, ownerIndex, shouldShuffle) {
  const ids = getDeckList(factionId);
  const deck = ids.map((cardId) => createCardInstance(game, cardId, ownerIndex));
  return shouldShuffle ? shuffle(deck) : deck;
}

function beginTurn(game, { skipDraw = false } = {}) {
  const player = game.players[game.activePlayer];
  player.supplyAvailable = player.supplyTotal;
  player.supplyPlayed = false;
  game.phase = "main1";
  game.combat = { attackers: [] };

  for (const unit of player.battlefield) {
    unit.exhausted = false;
    unit.summoningSick = false;
  }

  for (const operation of player.operations) {
    applyEffects(game, game.activePlayer, operation.startOfTurn ?? [], null);
  }

  if (!skipDraw) {
    drawCards(game, game.activePlayer, 1);
  }

  writeLog(game, `Turn ${game.turn}: ${player.name} begins with ${player.supplyAvailable}/${player.supplyTotal} supply.`);
  checkGameOver(game);
}

function endTurn(game) {
  clearUntilEndState(game);
  game.activePlayer = getOpponentIndex(game.activePlayer);
  game.turn += 1;
  beginTurn(game);
}

function resolveCombat(game) {
  const defenderIndex = getDefenderIndex(game);
  const attackerName = game.players[game.activePlayer].name;
  writeLog(game, `${attackerName}'s combat resolves.`);

  for (const attack of [...game.combat.attackers]) {
    const attackerFound = findUnit(game, attack.attackerId);
    if (!attackerFound) {
      continue;
    }
    const attacker = attackerFound.unit;
    const blockerFound = attack.blockerId ? findUnit(game, attack.blockerId) : null;

    if (!blockerFound) {
      strikeHQ(game, attacker, defenderIndex);
      continue;
    }

    const blocker = blockerFound.unit;
    if (blocker.onBlockDamage) {
      dealDamageToUnit(game, attacker, blocker.onBlockDamage, blocker.name);
      cleanupDeadUnits(game);
      if (!findUnit(game, attacker.iid)) {
        continue;
      }
    }

    const attackerHasAmbush = hasKeyword(game, attacker, "Ambush");
    const blockerHasAmbush = hasKeyword(game, blocker, "Ambush");

    if (attackerHasAmbush && !blockerHasAmbush) {
      strikeUnit(game, attacker, blocker, { canBreakthrough: true });
      cleanupDeadUnits(game);
      if (findUnit(game, blocker.iid)) {
        strikeUnit(game, blocker, attacker);
      }
    } else if (blockerHasAmbush && !attackerHasAmbush) {
      strikeUnit(game, blocker, attacker);
      cleanupDeadUnits(game);
      if (findUnit(game, attacker.iid)) {
        strikeUnit(game, attacker, blocker, { canBreakthrough: true });
      }
    } else {
      strikeUnit(game, attacker, blocker, { canBreakthrough: true });
      strikeUnit(game, blocker, attacker);
    }

    cleanupDeadUnits(game);
    if (game.status !== "playing") {
      return;
    }
  }

  game.combat = { attackers: [] };
  cleanupDeadUnits(game);
  checkGameOver(game);
}

function strikeHQ(game, attacker, defenderIndex) {
  const stats = getEffectiveStats(game, attacker);
  if (stats.attack <= 0) {
    return;
  }
  damageHQ(game, defenderIndex, stats.attack, attacker.name);
  applyEffects(game, attacker.ownerIndex, attacker.onHitHQ ?? [], null, { sourceUnit: attacker });
}

function strikeUnit(game, source, target, { canBreakthrough = false } = {}) {
  const sourceStats = getEffectiveStats(game, source);
  if (sourceStats.attack <= 0) {
    return;
  }

  const beforeDefense = getEffectiveStats(game, target).defense;
  const lethalRemaining = Math.max(0, beforeDefense - target.damage);
  const actualDamage = dealDamageToUnit(game, target, sourceStats.attack, source.name);

  if (canBreakthrough && hasKeyword(game, source, "Breakthrough")) {
    const excess = Math.max(0, actualDamage - lethalRemaining);
    if (excess > 0) {
      const defenderIndex = getOpponentIndex(source.ownerIndex);
      damageHQ(game, defenderIndex, excess, `${source.name} breakthrough`);
      applyEffects(game, source.ownerIndex, source.onHitHQ ?? [], null, { sourceUnit: source });
    }
  }
}

function applyEffects(game, playerIndex, effects, selectedTarget, context = {}) {
  for (const effect of effects) {
    applyEffect(game, playerIndex, effect, selectedTarget, context);
    if (game.status !== "playing" && game.status !== "lobby") {
      return;
    }
  }
}

function applyEffect(game, playerIndex, effect, selectedTarget) {
  const player = game.players[playerIndex];
  const target = effect.target === "selected" ? selectedTarget : null;

  if (effect.type === "damage") {
    applyDamageToTarget(game, target, effect.amount, playerIndex, "card effect");
    return;
  }
  if (effect.type === "damageEnemyHQ") {
    damageHQ(game, getOpponentIndex(playerIndex), effect.amount, "card effect");
    return;
  }
  if (effect.type === "damageSelfHQ") {
    damageHQ(game, playerIndex, effect.amount, "card effect");
    return;
  }
  if (effect.type === "healHQ") {
    healHQ(game, playerIndex, effect.amount);
    return;
  }
  if (effect.type === "heal") {
    healTarget(game, target, effect.amount);
    return;
  }
  if (effect.type === "draw") {
    drawCards(game, playerIndex, effect.amount);
    return;
  }
  if (effect.type === "exhaust") {
    if (!target?.unit) {
      throw new Error("That effect needs a unit target.");
    }
    target.unit.exhausted = true;
    writeLog(game, `${target.unit.name} is exhausted.`);
    return;
  }
  if (effect.type === "buff") {
    if (!target?.unit) {
      throw new Error("That effect needs a unit target.");
    }
    applyBuff(target.unit, effect);
    writeLog(game, `${target.unit.name} receives field orders.`);
    return;
  }
  if (effect.type === "buffAll") {
    const side = effect.side === "enemy" ? getOpponentIndex(playerIndex) : playerIndex;
    for (const unit of game.players[side].battlefield) {
      applyBuff(unit, effect);
    }
    writeLog(game, `${player.name}'s formation receives new orders.`);
    return;
  }
  if (effect.type === "supplyBurst") {
    player.supplyAvailable += effect.amount;
    writeLog(game, `${player.name} gains ${effect.amount} temporary supply.`);
    return;
  }
  if (effect.type === "createToken") {
    const token = createCardInstance(game, effect.cardId, playerIndex);
    token.summoningSick = true;
    game.players[playerIndex].battlefield.push(token);
    writeLog(game, `${player.name} creates ${token.name}.`);
    return;
  }

  throw new Error(`Unknown effect: ${effect.type}`);
}

function applyDamageToTarget(game, target, amount, sourcePlayerIndex, sourceName) {
  if (!target) {
    throw new Error("That effect needs a target.");
  }
  if (target.kind === "hq") {
    damageHQ(game, target.ownerIndex, amount, sourceName);
    return;
  }
  if (target.kind === "unit") {
    dealDamageToUnit(game, target.unit, amount, sourceName);
    cleanupDeadUnits(game);
    return;
  }
  throw new Error("Invalid target.");
}

function healTarget(game, target, amount) {
  if (!target) {
    throw new Error("That effect needs a target.");
  }
  if (target.kind === "hq") {
    healHQ(game, target.ownerIndex, amount);
    return;
  }
  if (target.kind === "unit") {
    const before = target.unit.damage;
    target.unit.damage = Math.max(0, target.unit.damage - amount);
    writeLog(game, `${target.unit.name} recovers ${before - target.unit.damage} damage.`);
    return;
  }
}

function dealDamageToUnit(game, unit, amount, sourceName) {
  let actual = Math.max(0, Number(amount) || 0);
  if (actual > 0 && hasKeyword(game, unit, "Armor")) {
    actual = Math.max(0, actual - 1);
  }
  unit.damage += actual;
  writeLog(game, `${sourceName} deals ${actual} damage to ${unit.name}.`);
  return actual;
}

function damageHQ(game, playerIndex, amount, sourceName) {
  const player = game.players[playerIndex];
  const actual = Math.max(0, Number(amount) || 0);
  player.hq -= actual;
  writeLog(game, `${sourceName} deals ${actual} damage to ${player.name}'s HQ (${Math.max(0, player.hq)} left).`);
  checkGameOver(game);
}

function healHQ(game, playerIndex, amount) {
  const player = game.players[playerIndex];
  const before = player.hq;
  player.hq = Math.min(HQ_MAX, player.hq + amount);
  writeLog(game, `${player.name}'s HQ recovers ${player.hq - before}.`);
}

function drawCards(game, playerIndex, amount) {
  const player = game.players[playerIndex];
  for (let i = 0; i < amount; i += 1) {
    if (player.deck.length === 0) {
      damageHQ(game, playerIndex, 2, "Attrition");
      continue;
    }
    player.hand.push(player.deck.shift());
  }
}

function smoothOpeningHand(player) {
  if (player.hand.some((card) => card.type === "supply")) {
    return;
  }
  const deckSupplyIndex = player.deck.findIndex((card) => card.type === "supply");
  if (deckSupplyIndex === -1 || player.hand.length === 0) {
    return;
  }
  const replacement = player.deck[deckSupplyIndex];
  player.deck[deckSupplyIndex] = player.hand[0];
  player.hand[0] = replacement;
}

function cleanupDeadUnits(game) {
  let removedAny = false;
  for (const [ownerIndex, player] of game.players.entries()) {
    for (let i = player.battlefield.length - 1; i >= 0; i -= 1) {
      const unit = player.battlefield[i];
      if (unit.damage >= getEffectiveStats(game, unit).defense) {
        player.battlefield.splice(i, 1);
        if (!unit.token) {
          player.discard.push(unit);
        }
        writeLog(game, `${unit.name} is destroyed.`);
        applyEffects(game, ownerIndex, unit.onDeath ?? [], null, { sourceUnit: unit });
        removedAny = true;
      }
    }
  }
  if (removedAny) {
    cleanupDeadUnits(game);
  }
}

function clearUntilEndState(game) {
  for (const player of game.players) {
    for (const unit of player.battlefield) {
      unit.damage = 0;
      unit.temp = freshTemp();
    }
  }
}

function validateTargetForCard(game, playerIndex, card, target) {
  const rule = card.target;
  if (!rule) {
    return;
  }
  if (!target) {
    throw new Error(`${card.name} needs a target.`);
  }

  const targetOwner = target.ownerIndex;
  const isEnemy = targetOwner === getOpponentIndex(playerIndex);
  const isFriendly = targetOwner === playerIndex;
  const isUnit = target.kind === "unit";
  const isHQ = target.kind === "hq";

  const valid =
    (rule === "enemyUnit" && isUnit && isEnemy) ||
    (rule === "friendlyUnit" && isUnit && isFriendly) ||
    (rule === "anyUnit" && isUnit) ||
    (rule === "enemyUnitOrHQ" && isEnemy && (isUnit || isHQ)) ||
    (rule === "friendlyUnitOrHQ" && isFriendly && (isUnit || isHQ)) ||
    (rule === "exhaustedEnemyUnitOrHQ" && isEnemy && (isHQ || (isUnit && target.unit.exhausted)));

  if (!valid) {
    throw new Error(`${card.name} cannot target that.`);
  }
}

function normalizeTarget(game, rawTarget) {
  if (!rawTarget) {
    return null;
  }
  if (rawTarget.kind === "hq" || rawTarget.type === "hq") {
    const ownerIndex = Number(rawTarget.ownerIndex);
    if (!game.players[ownerIndex]) {
      throw new Error("Invalid HQ target.");
    }
    return { kind: "hq", ownerIndex };
  }
  if (rawTarget.kind === "unit" || rawTarget.type === "unit") {
    const found = findUnit(game, rawTarget.unitId || rawTarget.id);
    if (!found) {
      throw new Error("Invalid unit target.");
    }
    return { kind: "unit", ownerIndex: found.ownerIndex, unit: found.unit };
  }
  throw new Error("Invalid target.");
}

function findUnit(game, unitIid) {
  for (const [ownerIndex, player] of game.players.entries()) {
    const unit = player.battlefield.find((candidate) => candidate.iid === unitIid);
    if (unit) {
      return { unit, ownerIndex };
    }
  }
  return null;
}

function applyBuff(unit, effect) {
  unit.temp ??= freshTemp();
  unit.temp.attack += Number(effect.attack ?? 0);
  unit.temp.defense += Number(effect.defense ?? 0);
  for (const keyword of effect.keywords ?? []) {
    if (!unit.temp.keywords.includes(keyword)) {
      unit.temp.keywords.push(keyword);
    }
  }
}

function matchesPassiveFilter(unit, keywords, filter) {
  if (filter.keyword && !keywords.includes(filter.keyword)) {
    return false;
  }
  if (filter.tag && !(unit.tags ?? []).includes(filter.tag)) {
    return false;
  }
  return true;
}

function getUnitKeywords(unit) {
  return [...new Set([...(unit.keywords ?? []), ...(unit.temp?.keywords ?? [])])];
}

function hasKeyword(game, unit, keyword) {
  return getEffectiveStats(game, unit).keywords.includes(keyword);
}

function serializePlayer(game, player, index, showHand) {
  const faction = getFaction(player.factionId);
  return {
    index,
    name: player.name,
    faction,
    connected: player.connected,
    hq: player.hq,
    supplyTotal: player.supplyTotal,
    supplyAvailable: player.supplyAvailable,
    supplyPlayed: player.supplyPlayed,
    hand: showHand ? player.hand.map((card) => serializeCard(game, card)) : [],
    handCount: player.hand.length,
    deckCount: player.deck.length,
    discardCount: player.discard.length,
    discardTop: player.discard.at(-1) ? serializeCard(game, player.discard.at(-1)) : null,
    battlefield: player.battlefield.map((card) => serializeCard(game, card)),
    operations: player.operations.map((card) => serializeCard(game, card))
  };
}

function serializeCard(game, card) {
  const serialized = {
    ...card,
    temp: card.temp ?? freshTemp()
  };

  if (card.type === "unit") {
    const stats = getEffectiveStats(game, card);
    serialized.effectiveAttack = stats.attack;
    serialized.effectiveDefense = stats.defense;
    serialized.effectiveKeywords = stats.keywords;
  }

  return serialized;
}

function checkGameOver(game) {
  if (game.status !== "playing") {
    return;
  }
  const defeated = game.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.hq <= 0);

  if (defeated.length === 0) {
    return;
  }

  game.status = "finished";
  game.phase = "finished";
  if (defeated.length === 2) {
    game.winnerIndex = null;
    writeLog(game, "Both HQs fall. The battle ends in a draw.");
  } else {
    game.winnerIndex = getOpponentIndex(defeated[0].index);
    writeLog(game, `${game.players[game.winnerIndex].name} wins the battle.`);
  }
}

function assertPlaying(game) {
  if (game.status !== "playing") {
    throw new Error("This battle is not currently in progress.");
  }
}

function assertActive(game, playerIndex) {
  if (game.activePlayer !== playerIndex) {
    throw new Error("It is not your turn.");
  }
}

function assertActiveMainPhase(game, playerIndex) {
  assertActive(game, playerIndex);
  if (game.phase !== "main1" && game.phase !== "main2") {
    throw new Error("Cards can only be played during your main phases.");
  }
}

function getDefenderIndex(game) {
  return getOpponentIndex(game.activePlayer);
}

function getOpponentIndex(playerIndex) {
  return playerIndex === 0 ? 1 : 0;
}

function writeLog(game, message) {
  game.log.push({
    id: `${Date.now()}-${game.log.length}`,
    message
  });
  if (game.log.length > 100) {
    game.log.splice(0, game.log.length - 100);
  }
}

function cloneCard(card) {
  return JSON.parse(JSON.stringify(card));
}

function freshTemp() {
  return { attack: 0, defense: 0, keywords: [] };
}

function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function getAvailableFactions() {
  return FACTIONS;
}
