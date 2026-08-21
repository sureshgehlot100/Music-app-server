const axios = require("axios");

const SAAVN_API_BASE =
  process.env.SAAVN_API_BASE || "https://saavnapi-nine.vercel.app";

function normalizeTrack(track) {
  return {
    id: String(track.id),
    title: track.song || track.title || "Unknown title",
    artist:
      track.primary_artists ||
      track.singers ||
      track.music ||
      "Unknown Artist",
    album: track.album || "Unknown Album",
    albumUrl: track.album_url || "",
    image: track.image || "",
    audioUrl: track.media_url || track.media_preview_url || "",
    duration: Number(track.duration) || 0,
    language: track.language || "",
    releaseDate: track.release_date || "",
    providerUrl: track.perma_url || "",
    copyrightText: track.copyright_text || "",
  };
}

async function fetchTracks(query) {
  const { data } = await axios.get(`${SAAVN_API_BASE}/result/`, {
    params: { query },
    timeout: 15000,
  });

  const results = Array.isArray(data)
    ? data
    : data.results || data.data || data.songs || [];

  return results.map(normalizeTrack).filter((track) => track.audioUrl);
}

// GET /api/music/search?q=lofi
async function searchTracks(req, res) {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      return res.status(400).json({ message: "Provide a search query with ?q=" });
    }

    const tracks = await fetchTracks(q);

    return res.json({ tracks });
  } catch (err) {
    console.error("[searchTracks]", err.message);
    return res.status(502).json({ message: "Could not reach the music provider." });
  }
}

// GET /api/music/featured — a curated/popular starter playlist
async function featuredTracks(req, res) {
  try {
    const tracks = await fetchTracks("Hindi Bollywood hits");

    return res.json({ tracks });
  } catch (err) {
    console.error("[featuredTracks]", err.message);
    return res.status(502).json({ message: "Could not reach the music provider." });
  }
}

module.exports = { searchTracks, featuredTracks };
