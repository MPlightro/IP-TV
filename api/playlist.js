// api/playlist.js
// Vercel Serverless Function for IPTV playlist

const https = require("https");

// Helper: fetch JSON from Google API
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

// Parse USERS env var into { user: pass }
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
    res.status(401).send("Unauthorized");
    return;
  }

  const API_KEY = process.env.GOOGLE_API_KEY;
  const FOLDER_ID = process.env.FOLDER_ID;

  if (!API_KEY || !FOLDER_ID) {
    res.status(500).send("Server not configured (missing env vars).");
    return;
  }

  try {
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&key=${API_KEY}&fields=files(id,name)`;
    const data = await fetchJson(url);
    const files = data.files || [];

    let playlist = "#EXTM3U\n\n";
    for (const f of files) {
      const title = f.name.replace(/\r?\n/g, " ");
      const fileUrl = `https://drive.google.com/uc?id=${f.id}&export=download`;
      playlist += `#EXTINF:-1,${title}\n${fileUrl}\n\n`;
    }

    res.setHeader("Content-Type", "audio/x-mpegurl; charset=utf-8");
    res.send(playlist);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating playlist: " + String(err.message || err));
  }
};
