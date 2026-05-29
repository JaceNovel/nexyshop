import express from "express";
import helmet from "helmet";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
app.use(helmet());
app.get("/health", (_req, res) => res.json({ status: "ok", service: "nexy-socket" }));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL?.split(",") ?? ["http://localhost:3000", "https://nexy.gg"],
    credentials: true
  }
});

const slowMode = new Map();

io.on("connection", (socket) => {
  socket.join("live");

  socket.emit("notification", {
    type: "system",
    message: "Bienvenue dans l'arena NEXY."
  });

  socket.on("chat:message", (payload) => {
    const now = Date.now();
    const last = slowMode.get(socket.id) ?? 0;
    if (now - last < 2500) {
      socket.emit("chat:blocked", { reason: "slow_mode" });
      return;
    }
    slowMode.set(socket.id, now);
    io.to("live").emit("chat:message", {
      id: crypto.randomUUID(),
      user: payload.user ?? "Player",
      badge: payload.badge ?? "viewer",
      message: String(payload.message ?? "").slice(0, 240),
      createdAt: new Date().toISOString()
    });
  });

  socket.on("tournament:score", (payload) => {
    io.to("live").emit("leaderboard:update", payload);
  });
});

setInterval(() => {
  io.to("live").emit("live:metrics", {
    viewers: 18000 + Math.floor(Math.random() * 900),
    remainingTeams: 8 + Math.floor(Math.random() * 12),
    kills: 300 + Math.floor(Math.random() * 120)
  });
}, 5000);

server.listen(process.env.PORT ?? 4000, "127.0.0.1", () => {
  console.log("NEXY socket server listening");
});
