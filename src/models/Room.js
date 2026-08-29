const mongoose = require("mongoose");

const TrackSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    artist: { type: String, default: "Unknown Artist" },
    album: { type: String, default: "Unknown Album" },
    albumUrl: { type: String, default: "" },
    image: { type: String, default: "" },
    audioUrl: { type: String, required: true },
    duration: { type: Number, default: 0 },
    language: { type: String, default: "" },
    releaseDate: { type: String, default: "" },
    providerUrl: { type: String, default: "" },
    copyrightText: { type: String, default: "" },
    addedBy: { type: String, default: "Someone" },
  },
  { _id: false }
);

const ParticipantSchema = new mongoose.Schema(
  {
    socketId: { type: String, required: true },
    username: { type: String, required: true },
    isHost: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const RoomSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "Listening Room" },
    hostSocketId: { type: String, default: null },
    participants: { type: [ParticipantSchema], default: [] },
    queue: { type: [TrackSchema], default: [] },
    currentIndex: { type: Number, default: -1 },
    isPlaying: { type: Boolean, default: false },
    currentTime: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  }
);

module.exports = mongoose.model("Room", RoomSchema);
