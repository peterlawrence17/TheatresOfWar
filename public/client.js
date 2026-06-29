const socket = io();
const app = document.querySelector("#app");
const noticeEl = document.querySelector("#notice");
const GAME_TITLE = "Frontline Arcana";
const SOUND_FILES = {
  attack: "/assets/sounds/attack.mp3",
  draw: "/assets/sounds/draw.wav",
  play: "/assets/sounds/play.wav",
  playSoft: "/assets/sounds/play-soft.wav",
  supply: "/assets/sounds/supply.wav",
  toggle: "/assets/sounds/toggle.wav"
};
const TUTORIAL_STORAGE_KEY = "ww2magic:tutorialSeen:v2";
const CORE_GLOSSARY_TERMS = [
  {
    term: "HQ",
    definition: "Your headquarters. Each player starts at 25 HQ; reduce the enemy HQ to 0 to win."
  },
  {
    term: "Supply",
    definition: "The resource used to play units, tactics, and operations. Available supply refreshes at the start of your turn."
  },
  {
    term: "Supply Line",
    definition: "A zero-cost card that increases maximum supply by 1. You can play one Supply Line each turn."
  },
  {
    term: "Unit",
    definition: "A battlefield card with attack and defense. Units attack HQs, block attackers, and can be destroyed by damage."
  },
  {
    term: "Tactic",
    definition: "A one-shot card. Resolve its text, then place it in the scrap pile."
  },
  {
    term: "Operation",
    definition: "A persistent card that stays in play and changes the battle while it remains active."
  },
  {
    term: "Attack / Defense",
    definition: "Attack is damage dealt in combat. Defense is how much damage a unit can take before being destroyed."
  },
  {
    term: "Exhausted",
    definition: "An exhausted unit has already acted or blocked and cannot attack or block again until it readies."
  },
  {
    term: "Scrap",
    definition: "The discard pile for destroyed non-token units and spent tactics."
  },
  {
    term: "Temporary supply",
    definition: "Extra supply for the current turn only. It disappears when the turn ends."
  }
];
const PHASE_GLOSSARY_TERMS = [
  {
    term: "Start of Turn",
    definition: "Your units ready, temporary effects from the prior turn are gone, operations with start-of-turn text resolve, and you draw a card."
  },
  {
    term: "Main Phase",
    definition: "Play one Supply Line, deploy units, establish operations, and use tactics. You can move to combat when ready."
  },
  {
    term: "Declare Attackers",
    definition: "The active player chooses ready units to attack. Units with Garrison cannot attack; newly deployed units need Blitz."
  },
  {
    term: "Declare Blockers",
    definition: "The defender assigns ready units to block attackers. Airborne and Infiltrate can restrict which blockers are legal."
  },
  {
    term: "Resolve Combat",
    definition: "Blocked units exchange damage, Ambush strikes first, Breakthrough can hit HQ, and unblocked attackers damage HQ."
  },
  {
    term: "Second Main",
    definition: "The active player gets one more chance to play cards before ending the turn."
  },
  {
    term: "End Turn",
    definition: "Temporary supply and temporary buffs expire, damage clears from surviving units, then the opponent begins their turn."
  }
];
const TUTORIAL_PAGES = [
  {
    title: "1. Pick a faction and join",
    body: "Create a room or enter a room code, then choose a faction. Every faction has a different doctrine: Germany pressures quickly, France fortifies, Russia grinds, the USA scales, and so on."
  },
  {
    title: "2. Build supply",
    body: "Play one Supply Line each turn. Supply is your resource for units, tactics, and operations. It refreshes at the start of your turn."
  },
  {
    title: "3. Deploy and operate",
    body: "Units go to the battlefield, tactics resolve once and go to scrap, and operations stay in play as ongoing advantages."
  },
  {
    title: "4. Attack and block",
    body: "Move to combat, click ready units to attack, then the defender assigns blockers. Airborne, AA, Ambush, Armor, Breakthrough, and Infiltrate shape combat."
  },
  {
    title: "5. Replace assets later",
    body: "Each card has its own SVG in public/assets/cards, and each sound has its own WAV or MP3 in public/assets/sounds. Swap those files as you make custom art and audio."
  }
];

let catalog = null;
let state = null;
let pendingCard = null;
let selectedBlockerId = null;
let noticeTimer = null;
let animationTimer = null;
let cardAnimationMarks = new Map();
let statAnimationMarks = new Map();
let glossaryOpen = false;
let tutorialOpen = localStorage.getItem(TUTORIAL_STORAGE_KEY) !== "yes";
let tutorialPage = 0;
let audioEnabled = localStorage.getItem("ww2magic:audio") !== "off";
let audioUnlocked = false;
const soundPlayers = new Map();
let playerName = localStorage.getItem("ww2magic:name") || "";
let selectedFactionId = localStorage.getItem("ww2magic:faction") || "uk";
let joinRoomCode = "";

socket.on("catalog", (payload) => {
  catalog = payload;
  if (!catalog.factions.some((faction) => faction.id === selectedFactionId)) {
    selectedFactionId = catalog.factions[0]?.id || "uk";
  }
  render();
});

socket.on("gameState", (payload) => {
  const transitionEffects = getTransitionEffects(state, payload);
  state = payload;
  selectedBlockerId = null;
  if (pendingCard && !getMe()?.hand.some((card) => card.iid === pendingCard.iid)) {
    pendingCard = null;
  }
  cardAnimationMarks = transitionEffects.cardMarks;
  statAnimationMarks = transitionEffects.statMarks;
  render();
  scheduleAnimationCleanup();
  playSoundSequence(transitionEffects.sounds);
});

socket.on("notice", (payload) => {
  showNotice(payload.message || "Something went wrong.");
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.id === "playerName") {
    playerName = target.value;
    localStorage.setItem("ww2magic:name", playerName);
  }
  if (target.id === "roomCode") {
    joinRoomCode = target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
    target.value = joinRoomCode;
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "factionSelect") {
    selectedFactionId = event.target.value;
    localStorage.setItem("ww2magic:faction", selectedFactionId);
    render();
  }
});

document.addEventListener("click", (event) => {
  unlockAudio();

  const actionEl = event.target.closest("[data-action]");
  if (actionEl) {
    handleAction(actionEl.dataset.action);
    return;
  }

  const handEl = event.target.closest("[data-hand-card]");
  if (handEl) {
    handleHandClick(handEl.dataset.handCard);
    return;
  }

  const hqEl = event.target.closest("[data-hq-owner]");
  if (hqEl) {
    handleTargetClick({ kind: "hq", ownerIndex: Number(hqEl.dataset.hqOwner) });
    return;
  }

  const unitEl = event.target.closest("[data-unit-id]");
  if (unitEl) {
    handleUnitClick(unitEl.dataset.unitId, Number(unitEl.dataset.ownerIndex));
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && glossaryOpen) {
    glossaryOpen = false;
    render();
  }
  if (event.key === "Escape" && tutorialOpen) {
    closeTutorial();
  }
});

function render() {
  if (!catalog) {
    app.innerHTML = `<div class="lobby"><div class="lobby-panel"><div class="lobby-copy"><h1>${GAME_TITLE}</h1><p>Loading command deck...</p></div></div></div>`;
    return;
  }

  if (!state || state.status === "lobby") {
    renderLobby();
    return;
  }

  renderGame();
}

function renderLobby() {
  const faction = getSelectedFaction();
  const waiting = state?.status === "lobby" && state.viewerIndex >= 0;
  app.innerHTML = `
    <main class="lobby">
      <section class="lobby-panel">
        <div class="lobby-copy">
          <h1>${GAME_TITLE}</h1>
          <p>Two-player card warfare with supply lines, exhausted units, blockers, aircraft, armor, operations, and faction doctrine.</p>
          <div class="faction-preview">
            ${faction.art ? `<div class="faction-art" role="img" aria-label="${escapeAttr(faction.name)} faction art" style="background-image:url('${escapeAttr(faction.art)}')"></div>` : ""}
            <div class="faction-swatches">
              ${faction.colors.map((color) => `<span class="swatch" style="background:${escapeHtml(color)}"></span>`).join("")}
            </div>
            <h2>${escapeHtml(faction.name)}</h2>
            <p>${escapeHtml(faction.doctrine)}</p>
            <p>${escapeHtml(faction.style)}</p>
          </div>
        </div>
        <div class="lobby-controls">
          <div class="form-grid">
            <label>
              Commander
              <input id="playerName" maxlength="24" value="${escapeAttr(playerName)}" autocomplete="nickname">
            </label>
            <label>
              Faction
              <select id="factionSelect">
                ${catalog.factions.map((entry) => `
                  <option value="${escapeAttr(entry.id)}" ${entry.id === selectedFactionId ? "selected" : ""}>
                    ${escapeHtml(entry.name)}
                  </option>
                `).join("")}
              </select>
            </label>
            <div class="split-actions">
              <button data-action="create">Create Battle</button>
              <button data-action="join">Join Battle</button>
            </div>
            <div class="lobby-mini-actions">
              <button data-action="openTutorial">Tutorial</button>
              <button data-action="toggleGlossary">Glossary</button>
              <button data-action="toggleAudio">${audioEnabled ? "Sound On" : "Sound Off"}</button>
            </div>
            <label>
              Room Code
              <input id="roomCode" maxlength="5" value="${escapeAttr(joinRoomCode)}" autocomplete="off">
            </label>
          </div>
          ${waiting ? `
            <div class="waiting-code">
              <span>Waiting for opponent</span>
              <strong class="room-code">${escapeHtml(state.roomCode)}</strong>
              <button data-action="copyRoom">Copy Room Code</button>
            </div>
          ` : ""}
        </div>
      </section>
      ${renderTutorialModal()}
      ${renderGlossaryPopover()}
    </main>
  `;
}

function renderGame() {
  const me = getMe();
  const opponent = getOpponent();
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark">FA</span>
          <div>
            <h1>${GAME_TITLE}</h1>
            <small>Room ${escapeHtml(state.roomCode)}</small>
          </div>
        </div>
        <div class="phase-chip">
          <strong>${escapeHtml(getPhaseTitle())}</strong>
          <small>${escapeHtml(getTurnLine())}</small>
        </div>
        <div class="top-actions">
          <button data-action="openTutorial">Tutorial</button>
          <button data-action="toggleGlossary">Glossary</button>
          <button class="${audioEnabled ? "" : "muted-button"}" data-action="toggleAudio">${audioEnabled ? "Sound On" : "Sound Off"}</button>
          <button data-action="copyRoom">Copy Code</button>
          <button data-action="surrender">Concede</button>
        </div>
      </header>
      <main class="board">
        ${renderPlayerZone(opponent, "opponent")}
        ${renderCombatBar()}
        ${renderPlayerZone(me, "me")}
      </main>
      ${renderTutorialModal()}
      ${renderGlossaryPopover()}
    </div>
  `;
}

function renderPlayerZone(player, role) {
  const isMe = role === "me";
  const connection = player.connected ? "" : `<span class="connection-badge">Disconnected</span>`;
  return `
    <section class="zone ${isMe ? "friendly-zone" : "enemy-zone"}">
      <div class="zone-header">
        <div class="player-meta">
          <strong>${escapeHtml(player.name)} ${connection}</strong>
          <small>${escapeHtml(player.faction.name)} - ${escapeHtml(player.faction.doctrine)}</small>
        </div>
        <div class="player-stats">
          ${renderHQ(player)}
          <div class="stat"><strong>${player.supplyAvailable}/${player.supplyTotal}</strong> Supply</div>
          <div class="stat ${getStatAnimationClass(player.index, "hand")}"><strong>${player.handCount}</strong> Hand</div>
          <div class="stat"><strong>${player.deckCount}</strong> Deck</div>
          <div class="stat"><strong>${player.discardCount}</strong> Scrap</div>
        </div>
      </div>
      <div class="zone-body">
        <div>
          <div class="row-label"><span>Operations</span><span>${player.operations.length}</span></div>
          ${renderOperationRow(player.operations, player.index)}
        </div>
        <div>
          <div class="row-label"><span>Battlefield</span><span>${player.battlefield.length}</span></div>
          ${renderCardRow(player.battlefield, "battlefield", player.index)}
        </div>
        ${isMe ? `
          <div>
            <div class="row-label"><span>Hand</span><span>${player.hand.length}</span></div>
            ${renderCardRow(player.hand, "hand", player.index)}
          </div>
        ` : ""}
      </div>
    </section>
  `;
}

function renderCombatBar() {
  return `
    <section class="combat-bar">
      <div class="combat-panel">
        <h2>${escapeHtml(getCombatHeadline())}</h2>
        <p>${escapeHtml(getCombatDetail())}</p>
      </div>
      <div class="combat-panel combat-actions">
        ${pendingCard ? `
          <button data-action="cancelTarget">Cancel Target</button>
        ` : `
          <button data-action="nextPhase" ${canAdvancePhase() ? "" : "disabled"}>${escapeHtml(getNextPhaseLabel())}</button>
        `}
      </div>
      <div class="combat-panel">
        ${pendingCard ? `<div class="pending-banner">Targeting ${escapeHtml(pendingCard.name)}</div>` : renderLog()}
      </div>
    </section>
  `;
}

function renderOperationRow(cards, ownerIndex) {
  if (!cards.length) {
    return `<div class="empty-row">No active operations</div>`;
  }
  return `<div class="card-row">${cards.map((card) => renderCard(card, "operation", ownerIndex)).join("")}</div>`;
}

function renderCardRow(cards, zone, ownerIndex) {
  if (!cards.length) {
    return `<div class="empty-row">${zone === "hand" ? "No cards in hand" : "No units deployed"}</div>`;
  }
  const rowClass = zone === "hand" ? "card-row hand-row" : "card-row";
  return `<div class="${rowClass}">${cards.map((card) => renderCard(card, zone, ownerIndex)).join("")}</div>`;
}

function renderCard(card, zone, ownerIndex) {
  const classes = ["game-card"];
  const attrs = [];
  const animationClass = getCardAnimationClass(card.iid);
  if (animationClass) {
    classes.push(animationClass);
  }

  if (zone === "hand") {
    classes.push("hand-card");
    attrs.push(`data-hand-card="${escapeAttr(card.iid)}"`);
  }
  if (zone === "battlefield") {
    classes.push("unit-card");
    attrs.push(`data-unit-id="${escapeAttr(card.iid)}"`);
    attrs.push(`data-owner-index="${ownerIndex}"`);
  }
  if (zone === "operation") {
    classes.push("operation-card");
  }
  if (card.exhausted) {
    classes.push("exhausted");
  }
  if (card.summoningSick) {
    classes.push("summoning");
  }
  if (isAttacking(card.iid)) {
    classes.push("attacking");
  }
  if (isBlocking(card.iid)) {
    classes.push("blocking");
  }
  if (selectedBlockerId === card.iid) {
    classes.push("selected-blocker");
  }
  if (zone === "battlefield" && isTargetable({ kind: "unit", ownerIndex, unit: card })) {
    classes.push("targetable");
  }

  const keywords = card.effectiveKeywords || card.keywords || [];
  const typeLine = card.type === "unit"
    ? `Unit - ${(card.tags || []).join(" / ")}`
    : card.type;
  const artPath = getCardArtPath(card);

  return `
    <article class="${classes.join(" ")}" ${attrs.join(" ")}>
      <div class="card-top">
        <span class="card-name" title="${escapeAttr(card.name)}">${escapeHtml(card.name)}</span>
        <span class="cost">${card.type === "supply" ? "S" : escapeHtml(card.cost)}</span>
      </div>
      <div class="card-art" style="background-image:url('${escapeAttr(artPath)}')"></div>
      <div class="card-body">
        <div class="card-type">${escapeHtml(typeLine)}</div>
        <div class="keywords" title="${escapeAttr(keywords.join(", "))}">${escapeHtml(keywords.join(", "))}</div>
        <p class="rules-text">${escapeHtml(card.text || "")}</p>
      </div>
      <div class="card-bottom">
        ${card.type === "unit" ? `<span class="stats-box">${card.effectiveAttack}/${card.effectiveDefense}</span>` : `<span></span>`}
        ${card.damage > 0 ? `<span class="damage-box">${card.damage} dmg</span>` : `<span></span>`}
      </div>
    </article>
  `;
}

function renderGlossaryPopover() {
  if (!glossaryOpen) {
    return "";
  }

  const terms = getGlossaryTerms();
  return `
    <div class="glossary-overlay" role="dialog" aria-modal="true" aria-labelledby="glossary-title">
      <section class="glossary-panel" data-glossary-panel>
        <header class="glossary-header">
          <div>
            <h2 id="glossary-title">Game Glossary</h2>
            <p>Turn phases, card terms, combat keywords, and faction ability language.</p>
          </div>
          <button data-action="closeGlossary" aria-label="Close glossary">Close</button>
        </header>
        <section class="glossary-section">
          <h3>Turn Phases</h3>
          <div class="glossary-list glossary-phase-list">
            ${PHASE_GLOSSARY_TERMS.map((entry) => `
              <article class="glossary-term">
                <strong>${escapeHtml(entry.term)}</strong>
                <p>${escapeHtml(entry.definition)}</p>
              </article>
            `).join("")}
          </div>
        </section>
        <section class="glossary-section">
          <h3>Game Terms</h3>
        <div class="glossary-list">
          ${terms.map((entry) => `
            <article class="glossary-term">
              <strong>${escapeHtml(entry.term)}</strong>
              <p>${escapeHtml(entry.definition)}</p>
            </article>
          `).join("")}
        </div>
        </section>
      </section>
    </div>
  `;
}

function renderTutorialModal() {
  if (!tutorialOpen) {
    return "";
  }

  const page = TUTORIAL_PAGES[tutorialPage] || TUTORIAL_PAGES[0];
  const isFirst = tutorialPage === 0;
  const isLast = tutorialPage === TUTORIAL_PAGES.length - 1;
  return `
    <div class="tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <section class="tutorial-panel">
        <header class="tutorial-header">
          <div>
            <h2 id="tutorial-title">Quick Tutorial</h2>
            <p>Page ${tutorialPage + 1} of ${TUTORIAL_PAGES.length}</p>
          </div>
          <button data-action="closeTutorial" aria-label="Skip tutorial">Skip</button>
        </header>
        <div class="tutorial-body">
          <div class="tutorial-progress" aria-hidden="true">
            ${TUTORIAL_PAGES.map((_, index) => `<span class="${index === tutorialPage ? "active" : ""}"></span>`).join("")}
          </div>
          <h3>${escapeHtml(page.title)}</h3>
          <p>${escapeHtml(page.body)}</p>
        </div>
        <footer class="tutorial-actions">
          <button data-action="prevTutorial" ${isFirst ? "disabled" : ""}>Back</button>
          <button data-action="${isLast ? "finishTutorial" : "nextTutorial"}">${isLast ? "Start Playing" : "Next"}</button>
        </footer>
      </section>
    </div>
  `;
}

function renderHQ(player) {
  const targetable = isTargetable({ kind: "hq", ownerIndex: player.index });
  return `
    <div class="hq ${targetable ? "targetable" : ""}" data-hq-owner="${player.index}">
      <strong>${Math.max(0, player.hq)}</strong> HQ
    </div>
  `;
}

function renderLog() {
  const entries = state.log.slice(-5).reverse();
  return `
    <ul class="log-list">
      ${entries.map((entry) => `<li>${escapeHtml(entry.message)}</li>`).join("")}
    </ul>
  `;
}

function handleAction(action) {
  if (action === "openTutorial") {
    tutorialOpen = true;
    tutorialPage = 0;
    playSound("toggle");
    render();
    return;
  }
  if (action === "closeTutorial") {
    closeTutorial();
    return;
  }
  if (action === "nextTutorial") {
    tutorialPage = Math.min(TUTORIAL_PAGES.length - 1, tutorialPage + 1);
    playSound("toggle");
    render();
    return;
  }
  if (action === "prevTutorial") {
    tutorialPage = Math.max(0, tutorialPage - 1);
    playSound("toggle");
    render();
    return;
  }
  if (action === "finishTutorial") {
    closeTutorial();
    return;
  }
  if (action === "toggleGlossary") {
    glossaryOpen = !glossaryOpen;
    playSound("toggle");
    render();
    return;
  }
  if (action === "closeGlossary") {
    glossaryOpen = false;
    playSound("toggle");
    render();
    return;
  }
  if (action === "toggleAudio") {
    audioEnabled = !audioEnabled;
    localStorage.setItem("ww2magic:audio", audioEnabled ? "on" : "off");
    if (audioEnabled) {
      unlockAudio();
      playSound("toggle");
    }
    render();
    return;
  }
  if (action === "create") {
    socket.emit("createGame", {
      name: playerName,
      factionId: selectedFactionId
    });
    return;
  }
  if (action === "join") {
    if (joinRoomCode.length !== 5) {
      showNotice("Enter a 5-character room code.");
      return;
    }
    socket.emit("joinGame", {
      roomCode: joinRoomCode,
      name: playerName,
      factionId: selectedFactionId
    });
    return;
  }
  if (action === "nextPhase") {
    socket.emit("nextPhase");
    return;
  }
  if (action === "cancelTarget") {
    pendingCard = null;
    render();
    return;
  }
  if (action === "copyRoom") {
    copyRoomCode();
    return;
  }
  if (action === "surrender") {
    if (window.confirm("Concede this battle?")) {
      socket.emit("surrender");
    }
  }
}

function handleHandClick(cardId) {
  const card = getMe()?.hand.find((candidate) => candidate.iid === cardId);
  if (!card) {
    return;
  }
  if (card.target) {
    pendingCard = card;
    selectedBlockerId = null;
    render();
    return;
  }
  socket.emit("playCard", { cardId });
}

function handleUnitClick(unitId, ownerIndex) {
  if (pendingCard) {
    handleTargetClick({ kind: "unit", ownerIndex, unitId });
    return;
  }

  if (!state || state.status !== "playing") {
    return;
  }

  if (state.phase === "declareAttackers" && state.viewerIndex === state.activePlayer && ownerIndex === state.viewerIndex) {
    socket.emit("toggleAttacker", { unitId });
    return;
  }

  if (state.phase === "declareBlockers" && state.viewerIndex === state.defenderIndex) {
    if (ownerIndex === state.viewerIndex) {
      selectedBlockerId = unitId;
      render();
      return;
    }
    if (selectedBlockerId && isAttacking(unitId)) {
      socket.emit("assignBlocker", { attackerId: unitId, blockerId: selectedBlockerId });
    }
  }
}

function handleTargetClick(target) {
  if (!pendingCard) {
    return;
  }
  if (!isTargetable(target)) {
    showNotice(`${pendingCard.name} cannot target that.`);
    return;
  }
  const payloadTarget = target.kind === "unit"
    ? { kind: "unit", unitId: target.unitId || target.unit.iid }
    : { kind: "hq", ownerIndex: target.ownerIndex };
  socket.emit("playCard", { cardId: pendingCard.iid, target: payloadTarget });
  pendingCard = null;
}

function isTargetable(target) {
  if (!pendingCard || state?.status !== "playing") {
    return false;
  }

  const rule = pendingCard.target;
  const isEnemy = target.ownerIndex === getOpponentIndex(state.viewerIndex);
  const isFriendly = target.ownerIndex === state.viewerIndex;
  const isUnit = target.kind === "unit";
  const isHQ = target.kind === "hq";
  const unit = target.unit || findUnitById(target.unitId);

  return (
    (rule === "enemyUnit" && isUnit && isEnemy) ||
    (rule === "friendlyUnit" && isUnit && isFriendly) ||
    (rule === "anyUnit" && isUnit) ||
    (rule === "enemyUnitOrHQ" && isEnemy && (isUnit || isHQ)) ||
    (rule === "friendlyUnitOrHQ" && isFriendly && (isUnit || isHQ)) ||
    (rule === "exhaustedEnemyUnitOrHQ" && isEnemy && (isHQ || (isUnit && unit?.exhausted)))
  );
}

function canAdvancePhase() {
  if (!state || state.status !== "playing") {
    return false;
  }
  if (state.phase === "main1" || state.phase === "main2" || state.phase === "declareAttackers") {
    return state.viewerIndex === state.activePlayer;
  }
  if (state.phase === "declareBlockers") {
    return state.viewerIndex === state.defenderIndex;
  }
  return false;
}

function getNextPhaseLabel() {
  if (!state || state.status !== "playing") {
    return "Waiting";
  }
  if (state.phase === "main1") {
    return "To Combat";
  }
  if (state.phase === "declareAttackers") {
    return "Commit Attack";
  }
  if (state.phase === "declareBlockers") {
    return "Resolve Combat";
  }
  if (state.phase === "main2") {
    return "End Turn";
  }
  return "Waiting";
}

function getPhaseTitle() {
  if (state.status === "finished") {
    if (state.winnerIndex === null) {
      return "Draw";
    }
    return `${state.players[state.winnerIndex].name} wins`;
  }
  const labels = {
    main1: "Main Phase",
    declareAttackers: "Declare Attackers",
    declareBlockers: "Declare Blockers",
    main2: "Second Main",
    finished: "Finished"
  };
  return labels[state.phase] || state.phase;
}

function getTurnLine() {
  if (!state || !state.players.length) {
    return "";
  }
  const active = state.players[state.activePlayer];
  return `Turn ${state.turn} - ${active?.name || "Waiting"}`;
}

function getCombatHeadline() {
  if (state.status === "finished") {
    return "Battle complete";
  }
  if (pendingCard) {
    return "Select target";
  }
  if (state.phase === "declareAttackers") {
    return state.viewerIndex === state.activePlayer ? "Choose attackers" : "Enemy attack step";
  }
  if (state.phase === "declareBlockers") {
    return state.viewerIndex === state.defenderIndex ? "Assign blockers" : "Enemy blockers";
  }
  return state.viewerIndex === state.activePlayer ? "Your command" : "Opponent command";
}

function getCombatDetail() {
  if (state.status === "finished") {
    return state.winnerIndex === null ? "Both HQs were destroyed." : `${state.players[state.winnerIndex].name} holds the field.`;
  }
  if (pendingCard) {
    return pendingCard.target;
  }
  if (state.phase === "declareAttackers") {
    return "Ready units can attack unless they are Garrison or recently deployed without Blitz.";
  }
  if (state.phase === "declareBlockers") {
    return "Choose one ready blocker, then click an attacking unit.";
  }
  return "Play one Supply Line each turn, deploy units, establish operations, and play tactics.";
}

function isAttacking(unitId) {
  return Boolean(state?.combat?.attackers?.some((attack) => attack.attackerId === unitId));
}

function isBlocking(unitId) {
  return Boolean(state?.combat?.attackers?.some((attack) => attack.blockerId === unitId));
}

function getMe() {
  if (!state || state.viewerIndex < 0) {
    return null;
  }
  return state.players[state.viewerIndex];
}

function getOpponent() {
  if (!state || state.viewerIndex < 0) {
    return null;
  }
  return state.players[getOpponentIndex(state.viewerIndex)];
}

function getOpponentIndex(index) {
  return index === 0 ? 1 : 0;
}

function findUnitById(unitId) {
  for (const player of state?.players || []) {
    const unit = player.battlefield.find((candidate) => candidate.iid === unitId);
    if (unit) {
      return unit;
    }
  }
  return null;
}

function getSelectedFaction() {
  return catalog.factions.find((faction) => faction.id === selectedFactionId) || catalog.factions[0];
}

function getCardArtPath(card) {
  return card.art || `/assets/cards/${card.id}.svg`;
}

function getGlossaryTerms() {
  const keywordTerms = Object.entries(catalog?.keywords || {}).map(([term, definition]) => ({
    term,
    definition
  }));
  return [...CORE_GLOSSARY_TERMS, ...keywordTerms];
}

function getTransitionEffects(previous, next) {
  const cardMarks = new Map();
  const statMarks = new Map();
  const sounds = [];
  if (!next || next.status !== "playing") {
    return { cardMarks, statMarks, sounds };
  }

  const previousWasPlaying = previous?.status === "playing";
  for (const player of next.players) {
    const previousPlayer = previous?.players?.find((candidate) => candidate.index === player.index);
    const previousHandIds = new Set((previousPlayer?.hand || []).map((card) => card.iid));
    const currentHandIds = new Set((player.hand || []).map((card) => card.iid));
    const previousBattlefieldIds = new Set((previousPlayer?.battlefield || []).map((card) => card.iid));
    const previousOperationIds = new Set((previousPlayer?.operations || []).map((card) => card.iid));

    const drawnCards = (player.hand || []).filter((card) => !previousHandIds.has(card.iid));
    for (const card of drawnCards) {
      cardMarks.set(card.iid, "card-draw");
    }

    if (previousPlayer && player.handCount > previousPlayer.handCount) {
      statMarks.set(`${player.index}:hand`, "stat-draw");
      if (previousWasPlaying && player.index === next.viewerIndex) {
        sounds.push("draw");
      }
    }

    const deployedCards = [
      ...(player.battlefield || []).filter((card) => !previousBattlefieldIds.has(card.iid)),
      ...(player.operations || []).filter((card) => !previousOperationIds.has(card.iid))
    ];
    for (const card of deployedCards) {
      cardMarks.set(card.iid, "card-play");
    }

    if (!previousPlayer || !previousWasPlaying) {
      continue;
    }

    const removedHandCards = (previousPlayer.hand || []).filter((card) => !currentHandIds.has(card.iid));
    if (removedHandCards.length && player.index === next.viewerIndex) {
      const playedSupply = removedHandCards.some((card) => card.type === "supply");
      sounds.push(playedSupply ? "supply" : "play");
    } else if (deployedCards.length && player.index !== next.viewerIndex) {
      sounds.push("playSoft");
    }
  }

  if (
    previousWasPlaying &&
    previous.phase === "declareAttackers" &&
    next.phase === "declareBlockers" &&
    (next.combat?.attackers || []).length > 0
  ) {
    sounds.unshift("attack");
  }

  return { cardMarks, statMarks, sounds };
}

function scheduleAnimationCleanup() {
  if (!cardAnimationMarks.size && !statAnimationMarks.size) {
    return;
  }
  clearTimeout(animationTimer);
  animationTimer = setTimeout(() => {
    cardAnimationMarks = new Map();
    statAnimationMarks = new Map();
    render();
  }, 900);
}

function getCardAnimationClass(cardId) {
  return cardAnimationMarks.get(cardId) || "";
}

function getStatAnimationClass(playerIndex, statName) {
  return statAnimationMarks.get(`${playerIndex}:${statName}`) || "";
}

function closeTutorial() {
  tutorialOpen = false;
  localStorage.setItem(TUTORIAL_STORAGE_KEY, "yes");
  playSound("toggle");
  render();
}

function unlockAudio() {
  if (!audioEnabled) {
    return;
  }
  audioUnlocked = true;
  for (const [name, src] of Object.entries(SOUND_FILES)) {
    if (!soundPlayers.has(name)) {
      const audio = new Audio(src);
      audio.preload = "auto";
      soundPlayers.set(name, audio);
    }
  }
}

function playSoundSequence(soundNames) {
  const names = [...new Set(soundNames)].slice(0, 3);
  names.forEach((name, index) => {
    setTimeout(() => playSound(name), index * 110);
  });
}

function playSound(name) {
  if (!audioEnabled || !audioUnlocked) {
    return;
  }
  const source = soundPlayers.get(name);
  if (!source) {
    return;
  }
  const sound = source.cloneNode();
  sound.volume = name === "toggle" ? 0.35 : 0.55;
  sound.play().catch(() => {});
}

function copyRoomCode() {
  const code = state?.roomCode;
  if (!code) {
    return;
  }
  navigator.clipboard?.writeText(code)
    .then(() => showNotice("Room code copied."))
    .catch(() => showNotice(`Room code: ${code}`));
}

function showNotice(message) {
  noticeEl.textContent = message;
  noticeEl.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    noticeEl.hidden = true;
  }, 3200);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}
