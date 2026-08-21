require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./src/config/db");
const roomRoutes = require("./src/routes/roomRoutes");
const musicRoutes = require("./src/routes/musicRoutes");
const registerRoomSocket = require("./src/sockets/roomSocket");

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/rooms", roomRoutes);
app.use("/api/music", musicRoutes);

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});

registerRoomSocket(io);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`[server] Music Room backend listening on port ${PORT}`);
  });
});
