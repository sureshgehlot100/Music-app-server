const Room = require("../models/Room");

/** Serialize a room doc into the shape the frontend expects. */
function serializeRoom(room) {
  return {
    roomCode: room.roomCode,
    name: room.name,
    hostSocketId: room.hostSocketId,
    participants: room.participants,
    queue: room.queue,
    currentIndex: room.currentIndex,
    isPlaying: room.isPlaying,
    currentTime: room.currentTime,
    updatedAt: room.updatedAt,
  };
}

async function broadcastState(io, roomCode) {
  const room = await Room.findOne({ roomCode });
  if (!room) return null;
  io.to(roomCode).emit("room:state", serializeRoom(room));
  return room;
}

function registerRoomSocket(io) {
  io.on("connection", (socket) => {
    let currentRoomCode = null;
    let currentUsername = null;

    // ---- Join a room ----
    socket.on("room:join", async ({ roomCode, username }, callback) => {
      try {
        roomCode = (roomCode || "").toUpperCase().trim();
        username = (username || "Guest").trim().slice(0, 24);

        const room = await Room.findOne({ roomCode });
        if (!room) {
          return callback?.({ ok: false, message: "No room found with that code." });
        }

        socket.join(roomCode);
        currentRoomCode = roomCode;
        currentUsername = username;

        const isHost = room.participants.length === 0;
        room.participants.push({
          socketId: socket.id,
          username,
          isHost,
          joinedAt: new Date(),
        });
        if (isHost || !room.hostSocketId) {
          room.hostSocketId = socket.id;
        }
        await room.save();

        callback?.({ ok: true, room: serializeRoom(room) });
        io.to(roomCode).emit("room:state", serializeRoom(room));
        socket.to(roomCode).emit("room:toast", `${username} joined the room`);
      } catch (err) {
        console.error("[room:join]", err);
        callback?.({ ok: false, message: "Could not join the room." });
      }
    });

    // ---- Queue: add track ----
    socket.on("track:add", async ({ roomCode, track }) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || !track) return;

        room.queue.push({
          id: String(track.id),
          title: track.title,
          artist: track.artist || "Unknown Artist",
          album: track.album || "Unknown Album",
          albumUrl: track.albumUrl || "",
          image: track.image || "",
          audioUrl: track.audioUrl,
          duration: track.duration || 0,
          language: track.language || "",
          releaseDate: track.releaseDate || "",
          providerUrl: track.providerUrl || "",
          copyrightText: track.copyrightText || "",
          addedBy: currentUsername || "Someone",
        });

        // Only touch the playhead when playback actually starts (first track).
        // Adding to an already-playing queue must NOT change currentTime/
        // updatedAt, otherwise every client re-seeks the current song.
        if (room.currentIndex === -1) {
          room.currentIndex = 0;
          room.isPlaying = true;
          room.currentTime = 0;
          room.updatedAt = new Date();
        }
        await room.save();
        await broadcastState(io, roomCode);
      } catch (err) {
        console.error("[track:add]", err);
      }
    });

    // ---- Queue: remove track ----
    socket.on("track:remove", async ({ roomCode, index }) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room) return;
        if (index < 0 || index >= room.queue.length) return;

        room.queue.splice(index, 1);
        if (index < room.currentIndex) {
          room.currentIndex -= 1;
        } else if (index === room.currentIndex) {
          // Removing the playing track restarts the now-current track at 0
          room.currentTime = 0;
          room.updatedAt = new Date();
          if (room.currentIndex >= room.queue.length) {
            room.currentIndex = room.queue.length - 1;
          }
          if (room.queue.length === 0) {
            room.currentIndex = -1;
            room.isPlaying = false;
          }
        }
        await room.save();
        await broadcastState(io, roomCode);
      } catch (err) {
        console.error("[track:remove]", err);
      }
    });

    // ---- Playback: play ----
    socket.on("playback:play", async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.currentIndex === -1) return;
        room.isPlaying = true;
        room.updatedAt = new Date();
        await room.save();
        await broadcastState(io, roomCode);
      } catch (err) {
        console.error("[playback:play]", err);
      }
    });

    // ---- Playback: pause ----
    socket.on("playback:pause", async ({ roomCode, currentTime }) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room) return;
        room.isPlaying = false;
        if (typeof currentTime === "number") room.currentTime = currentTime;
        room.updatedAt = new Date();
        await room.save();
        await broadcastState(io, roomCode);
      } catch (err) {
        console.error("[playback:pause]", err);
      }
    });

    // ---- Playback: seek ----
    socket.on("playback:seek", async ({ roomCode, time }) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room) return;
        room.currentTime = Math.max(0, time || 0);
        room.updatedAt = new Date();
        await room.save();
        await broadcastState(io, roomCode);
      } catch (err) {
        console.error("[playback:seek]", err);
      }
    });

    // ---- Playback: next track ----
    socket.on("playback:next", async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.queue.length === 0) return;
        room.currentIndex = (room.currentIndex + 1) % room.queue.length;
        room.currentTime = 0;
        room.isPlaying = true;
        room.updatedAt = new Date();
        await room.save();
        await broadcastState(io, roomCode);
      } catch (err) {
        console.error("[playback:next]", err);
      }
    });

    // ---- Playback: previous track ----
    socket.on("playback:prev", async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.queue.length === 0) return;
        room.currentIndex =
          (room.currentIndex - 1 + room.queue.length) % room.queue.length;
        room.currentTime = 0;
        room.isPlaying = true;
        room.updatedAt = new Date();
        await room.save();
        await broadcastState(io, roomCode);
      } catch (err) {
        console.error("[playback:prev]", err);
      }
    });

    // ---- Playback: jump to a specific queue item ----
    socket.on("playback:select", async ({ roomCode, index }) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || index < 0 || index >= room.queue.length) return;
        room.currentIndex = index;
        room.currentTime = 0;
        room.isPlaying = true;
        room.updatedAt = new Date();
        await room.save();
        await broadcastState(io, roomCode);
      } catch (err) {
        console.error("[playback:select]", err);
      }
    });

    // ---- Periodic drift-correction heartbeat (host's clock is source of truth) ----
    socket.on("playback:heartbeat", async ({ roomCode, currentTime }) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.hostSocketId !== socket.id) return;
        room.currentTime = currentTime;
        room.updatedAt = new Date();
        await room.save();
        socket.to(roomCode).emit("playback:correction", {
          currentTime: room.currentTime,
          updatedAt: room.updatedAt,
          isPlaying: room.isPlaying,
        });
      } catch (err) {
        console.error("[playback:heartbeat]", err);
      }
    });

    // ---- Leave / disconnect ----
    async function handleLeave() {
      if (!currentRoomCode) return;
      try {
        const room = await Room.findOne({ roomCode: currentRoomCode });
        if (!room) return;

        room.participants = room.participants.filter(
          (p) => p.socketId !== socket.id
        );

        if (room.hostSocketId === socket.id) {
          room.hostSocketId = room.participants[0]?.socketId || null;
          if (room.participants[0]) room.participants[0].isHost = true;
        }

        await room.save();
        io.to(currentRoomCode).emit("room:state", serializeRoom(room));
        if (currentUsername) {
          io.to(currentRoomCode).emit(
            "room:toast",
            `${currentUsername} left the room`
          );
        }
      } catch (err) {
        console.error("[handleLeave]", err);
      }
    }

    socket.on("room:leave", async ({ roomCode }) => {
      await handleLeave();
      socket.leave(roomCode);
      currentRoomCode = null;
    });

    socket.on("disconnect", handleLeave);
  });
}

module.exports = registerRoomSocket;
