import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { MATH_FACTS } from "./constants";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get("/api/math-fact", (req, res) => {
    const level = Math.max(1, parseInt(String(req.query.level), 10) || 1);
    const fact = MATH_FACTS[level % MATH_FACTS.length] ?? MATH_FACTS[0];
    res.json({ fact });
  });
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  const PORT = Number(process.env.PORT) || 3000;

  const rooms = new Map<string, any>();

  wss.on("connection", (ws: WebSocket) => {
    let currentRoom: string | null = null;
    let playerId: string | null = null;

    ws.on("message", (data: string) => {
      try {
        const message = JSON.parse(data);

        if (message.type === "JOIN_ROOM") {
          const { roomId, name } = message;
          currentRoom = roomId;
          playerId = name + "_" + Math.random().toString(36).substr(2, 4);

          if (!rooms.has(roomId)) {
            rooms.set(roomId, { players: [], state: {} });
          }

          const room = rooms.get(roomId);
          if (room.players.length >= 2) {
            ws.send(JSON.stringify({ type: "ERROR", message: "Room is full" }));
            return;
          }

          room.players.push({ ws, id: playerId, name });
          
          room.players.forEach((p: any) => {
            p.ws.send(JSON.stringify({ 
              type: "ROOM_UPDATE", 
              players: room.players.map((pl: any) => ({ id: pl.id, name: pl.name }))
            }));
          });

          if (room.players.length === 2) {
            room.players.forEach((p: any) => {
              p.ws.send(JSON.stringify({ type: "START_GAME" }));
            });
          }
        }

        if (message.type === "PROGRESS_UPDATE" && currentRoom) {
          const room = rooms.get(currentRoom);
          if (room) {
            room.players.forEach((p: any) => {
              if (p.id !== playerId) {
                p.ws.send(JSON.stringify({ 
                  type: "OPPONENT_PROGRESS", 
                  progress: message.progress,
                  score: message.score
                }));
              }
            });
          }
        }

        if (message.type === "GAME_OVER" && currentRoom) {
          const room = rooms.get(currentRoom);
          if (room) {
            room.players.forEach((p: any) => {
              p.ws.send(JSON.stringify({ 
                type: "GAME_OVER", 
                winner: message.winner,
                finalScores: message.finalScores
              }));
            });
          }
        }
      } catch (e) {
        console.error("WS Message Error:", e);
      }
    });

    ws.on("close", () => {
      if (currentRoom && rooms.has(currentRoom)) {
        const room = rooms.get(currentRoom);
        room.players = room.players.filter((p: any) => p.id !== playerId);
        if (room.players.length === 0) {
          rooms.delete(currentRoom);
        } else {
          room.players.forEach((p: any) => {
            p.ws.send(JSON.stringify({ type: "OPPONENT_DISCONNECTED" }));
          });
        }
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
