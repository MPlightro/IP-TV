// api/player_api.js
// Vercel Serverless Function for IPTV Player API

const https = require("https");

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

function parseUsers() {
  const raw = process.env.USERS || "";
  const map = {};
  raw.split(",").forEach((pair) => {
    const [u, p] = pair.split(":");
    if (u && p) map[u] = p;
  });
  return map;
}

module.exports = async (req, res) => {
  const users = parseUsers();
  const { username, password } = req.query;

  if (!username || !password || users[username] !== password) {
    return res.status(401).json({ user_info: { auth: 0, status: "Unauthorized" } });
  }

  const API_KEY = process.env.GOOGLE_API_KEY;
  const FOLDER_ID = process.env.FOLDER_ID;

  if (!API_KEY || !FOLDER_ID) {
    return res.status(500).json({ error: "Server not configured" });
  }

  try {
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&key=${API_KEY}&fields=files(id,name)`;
    const data = await fetchJson(url);
    const files = data.files || [];

    // Fake Xtream Codes style response
    const response = {
      user_info: {
        username,
        password,
        auth: 1,
        status: "Active"
      },
      available_channels: files.length,
      vod: files.map((f) => ({
        stream_id: f.id,
        name: f.name,
        stream_type: "movie",
        stream_url: `https://drive.google.com/uc?id=${f.id}&export=download`
      }))
    };

    res.setHeader("Content-Type", "application/json");
    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generating player API" });
  }
};
