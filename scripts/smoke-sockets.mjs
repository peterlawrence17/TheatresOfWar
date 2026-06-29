import assert from "node:assert/strict";
import { io } from "socket.io-client";

const url = process.env.SMOKE_URL || "http://localhost:3000";

const alpha = io(url, {
  forceNew: true,
  reconnection: false,
  transports: ["websocket"]
});
const bravo = io(url, {
  forceNew: true,
  reconnection: false,
  transports: ["websocket"]
});

try {
  await Promise.all([waitForConnect(alpha), waitForConnect(bravo)]);

  alpha.emit("createGame", { name: "Smoke Alpha", factionId: "uk" });
  const lobbyState = await waitForState(alpha, (payload) => payload.status === "lobby" && payload.roomCode);
  assert.equal(lobbyState.players.length, 1);

  bravo.emit("joinGame", { roomCode: lobbyState.roomCode, name: "Smoke Bravo", factionId: "germany" });
  const [alphaState, bravoState] = await Promise.all([
    waitForState(alpha, (payload) => payload.status === "playing"),
    waitForState(bravo, (payload) => payload.status === "playing")
  ]);

  assert.equal(alphaState.players.length, 2);
  assert.equal(bravoState.players.length, 2);
  assert.equal(alphaState.players[alphaState.viewerIndex].hand.length, 7);
  assert.equal(bravoState.players[bravoState.viewerIndex].hand.length, 7);
  assert.equal(alphaState.players[1].hand.length, 0);
  assert.equal(bravoState.players[0].hand.length, 0);
  assert.equal(alphaState.phase, "main1");

  console.log(`Socket smoke passed at ${url} in room ${lobbyState.roomCode}`);
} finally {
  alpha.disconnect();
  bravo.disconnect();
}

function waitForConnect(socket) {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }
    const timer = setTimeout(() => reject(new Error("Timed out waiting for socket connection.")), 5000);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function waitForState(socket, predicate) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("gameState", onState);
      reject(new Error("Timed out waiting for game state."));
    }, 5000);

    function onState(payload) {
      if (!predicate(payload)) {
        return;
      }
      clearTimeout(timer);
      socket.off("gameState", onState);
      resolve(payload);
    }

    socket.on("gameState", onState);
  });
}
