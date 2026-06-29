import assert from "node:assert/strict";
import test from "node:test";
import {
  addPlayer,
  advancePhase,
  assignBlocker,
  createCardInstance,
  createGame,
  playCard,
  startGame,
  toggleAttacker
} from "../src/game/engine.js";

function startedGame() {
  const game = createGame("TEST1");
  addPlayer(game, { socketId: "a", name: "Alpha", factionId: "uk" });
  addPlayer(game, { socketId: "b", name: "Bravo", factionId: "germany" });
  startGame(game, { shuffle: false, startingPlayer: 0 });
  return game;
}

test("starting decks are 40 cards and draw opening hands", () => {
  const game = startedGame();
  assert.equal(game.players[0].hand.length, 7);
  assert.equal(game.players[1].hand.length, 7);
  assert.equal(game.players[0].deck.length, 33);
  assert.equal(game.players[1].deck.length, 33);
  assert.equal(game.phase, "main1");
});

test("a player can play one supply line per turn", () => {
  const game = startedGame();
  const player = game.players[0];
  const firstSupply = player.hand.find((card) => card.type === "supply");
  playCard(game, 0, firstSupply.iid);
  assert.equal(player.supplyTotal, 1);
  assert.equal(player.supplyAvailable, 1);

  const secondSupply = player.hand.find((card) => card.type === "supply");
  assert.throws(() => playCard(game, 0, secondSupply.iid), /only one Supply Line/);
});

test("Airborne attackers require Airborne or AA blockers", () => {
  const game = startedGame();
  const stuka = createCardInstance(game, "de-stuka-wing", 0);
  const legion = createCardInstance(game, "fr-foreign-legion", 1);
  stuka.summoningSick = false;
  legion.summoningSick = false;
  game.players[0].battlefield = [stuka];
  game.players[1].battlefield = [legion];
  game.phase = "declareAttackers";
  game.activePlayer = 0;

  toggleAttacker(game, 0, stuka.iid);
  advancePhase(game, 0);
  assert.equal(game.phase, "declareBlockers");
  assert.throws(() => assignBlocker(game, 1, stuka.iid, legion.iid), /cannot block/);
});

test("AA units can block Airborne attackers", () => {
  const game = startedGame();
  const stuka = createCardInstance(game, "de-stuka-wing", 0);
  const destroyer = createCardInstance(game, "uk-destroyer-escort", 1);
  stuka.summoningSick = false;
  destroyer.summoningSick = false;
  game.players[0].battlefield = [stuka];
  game.players[1].battlefield = [destroyer];
  game.phase = "declareAttackers";
  game.activePlayer = 0;

  toggleAttacker(game, 0, stuka.iid);
  advancePhase(game, 0);
  assignBlocker(game, 1, stuka.iid, destroyer.iid);
  assert.equal(game.combat.attackers[0].blockerId, destroyer.iid);
});
