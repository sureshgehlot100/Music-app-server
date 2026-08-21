const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/music-room";
  try {
    await mongoose.connect(uri);
    console.log("[db] MongoDB connected");
  } catch (err) {
    console.error("[db] MongoDB connection error:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
