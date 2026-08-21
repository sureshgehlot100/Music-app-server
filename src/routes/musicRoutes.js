const express = require("express");
const { searchTracks, featuredTracks } = require("../controllers/musicController");

const router = express.Router();

router.get("/search", searchTracks);
router.get("/featured", featuredTracks);

module.exports = router;
