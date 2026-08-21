const { customAlphabet } = require("nanoid");

// Unambiguous uppercase alphabet (no 0/O, 1/I) — easy to read aloud/type to friends
const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

function generateRoomCode() {
  return nanoid();
}

module.exports = generateRoomCode;
