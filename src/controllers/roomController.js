const Room = require("../models/Room");
const generateRoomCode = require("../utils/generateRoomCode");

// POST /api/rooms  { name, username }
async function createRoom(req, res) {
  try {
    const { name, username } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ message: "A display name is required." });
    }

    let roomCode;
    let exists = true;
    // Guarantee a unique, collision-free room code
    while (exists) {
      roomCode = generateRoomCode();
      exists = await Room.exists({ roomCode });
    }

    const room = await Room.create({
      roomCode,
      name: name?.trim() || "Listening Room",
      queue: [],
      currentIndex: -1,
      isPlaying: false,
      currentTime: 0,
    });

    return res.status(201).json({ room });
  } catch (err) {
    console.error("[createRoom]", err);
    return res.status(500).json({ message: "Could not create the room." });
  }
}

// GET /api/rooms/:roomCode
async function getRoom(req, res) {
  try {
    const roomCode = req.params.roomCode.toUpperCase();
    const room = await Room.findOne({ roomCode });
    if (!room) {
      return res.status(404).json({ message: "No room found with that code." });
    }
    return res.json({ room });
  } catch (err) {
    console.error("[getRoom]", err);
    return res.status(500).json({ message: "Could not fetch the room." });
  }
}

module.exports = { createRoom, getRoom };
