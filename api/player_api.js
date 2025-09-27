// api/player_api.js
// Xtream Codes–compatible Player API for IPTV Smarters

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

// Parse USERS env var: "alice:hunter2,bob:letmein"
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
    return res.json({
      user_info: { auth: 0, status: "Invalid", message: "Invalid username/password" },
      server_info: {}
    });
  }

  const API_KEY = process.env.GOOGLE_API_KEY;
  const FOLDER_ID = process.env.FOLDER_ID;

  if (!API_KEY || !FOLDER_ID) {
    return res.status(500).json({ error: "Server not configured" });
  }

  try {
    // Fetch Google Drive folder files
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&key=${API_KEY}&fields=files(id,name)`;
    const data = await fetchJson(url);
    const files = data.files || [];

    // Build movie_stream array
    const movie_stream = files.map((f, i) => ({
      num: i + 1,
      name: f.name,
      stream_type: "movie",
      stream_id: f.id,
      stream_icon: "",
      added: Date.now().toString(),
      category_id: 1,
      container_extension: "mp4",
      direct_source: `https://drive.google.com/uc?id=${f.id}&export=download`
    }));

    // Return full Xtream Codes–compatible JSON
    const response = {
      user_info: { username, password, auth: 1, status: "Active", message: "Welcome" },
      server_info: {
        url: "ip-tv-psi.vercel.app",
        port: 80,
        https_port: 443,
        server_protocol: "https",
        timezone: "UTC"
      },
      categories: [
        { category_id: 1, category_name: "Movies", parent_id: 0 }
      ],
      movie_stream
    };

    res.setHeader("Content-Type", "application/json");
    res.json(response);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generating playlist" });
  }
};
