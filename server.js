import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import {
  addPlayer,
  advancePhase,
  assignBlocker,
  createGame,
  getPublicState,
  playCard,
  startGame,
  surrender,
  toggleAttacker
} from "./src/game/engine.js";
import { getCatalog } from "./src/game/cards.js";

const PORT = process.env.PORT || 3000;
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  serveClient: true
});

const games = new Map();

app.use(express.static("public"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, rooms: games.size });
});

app.get("/api/catalog", (_req, res) => {
  res.json(getCatalog());
});

io.on("connection", (socket) => {
  socket.emit("catalog", getCatalog());

  socket.on("createGame", (payload = {}) => {
    safely(socket, () => {
      leaveCurrentGame(socket);
      const roomCode = createRoomCode();
      const game = createGame(roomCode);
      games.set(roomCode, game);
      const playerIndex = addPlayer(game, {
        socketId: socket.id,
        name: payload.name,
        factionId: payload.factionId
      });
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.playerIndex = playerIndex;
      emitGame(game);
    });
  });

  socket.on("joinGame", (payload = {}) => {
    safely(socket, () => {
      leaveCurrentGame(socket);
      const roomCode = String(payload.roomCode || "").trim().toUpperCase();
      const game = games.get(roomCode);
      if (!game) {
        throw new Error("Battle room not found.");
      }
      if (game.status !== "lobby") {
        throw new Error("That battle has already started.");
      }
      const playerIndex = addPlayer(game, {
        socketId: socket.id,
        name: payload.name,
        factionId: payload.factionId
      });
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.playerIndex = playerIndex;
      if (game.players.length === 2) {
        startGame(game);
      }
      emitGame(game);
    });
  });

  socket.on("playCard", (payload = {}) => {
    withCurrentGame(socket, (game, playerIndex) => {
      playCard(game, playerIndex, payload.cardId, payload.target);
      emitGame(game);
    });
  });

  socket.on("nextPhase", () => {
    withCurrentGame(socket, (game, playerIndex) => {
      advancePhase(game, playerIndex);
      emitGame(game);
    });
  });

  socket.on("toggleAttacker", (payload = {}) => {
    withCurrentGame(socket, (game, playerIndex) => {
      toggleAttacker(game, playerIndex, payload.unitId);
      emitGame(game);
    });
  });

  socket.on("assignBlocker", (payload = {}) => {
    withCurrentGame(socket, (game, playerIndex) => {
      assignBlocker(game, playerIndex, payload.attackerId, payload.blockerId);
      emitGame(game);
    });
  });

  socket.on("surrender", () => {
    withCurrentGame(socket, (game, playerIndex) => {
      surrender(game, playerIndex);
      emitGame(game);
    });
  });

  socket.on("disconnect", () => {
    const game = games.get(socket.data.roomCode);
    if (!game) {
      return;
    }
    const player = game.players.find((candidate) => candidate.socketId === socket.id);
    if (player) {
      player.connected = false;
    }
    emitGame(game);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Theatres of War card game listening on http://localhost:${PORT}`);
});

function withCurrentGame(socket, handler) {
  safely(socket, () => {
    const game = games.get(socket.data.roomCode);
    const playerIndex = socket.data.playerIndex;
    if (!game || !Number.isInteger(playerIndex)) {
      throw new Error("Create or join a battle first.");
    }
    handler(game, playerIndex);
  });
}

function safely(socket, handler) {
  try {
    handler();
  } catch (error) {
    socket.emit("notice", { level: "error", message: error.message || "Something went wrong." });
  }
}

function emitGame(game) {
  for (const player of game.players) {
    io.to(player.socketId).emit("gameState", getPublicState(game, player.socketId));
  }
}

function leaveCurrentGame(socket) {
  const roomCode = socket.data.roomCode;
  if (!roomCode) {
    return;
  }
  socket.leave(roomCode);
  socket.data.roomCode = null;
  socket.data.playerIndex = null;
}

function createRoomCode() {
  let code = "";
  do {
    code = Array.from({ length: 5 }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join("");
  } while (games.has(code));
  return code;
}
