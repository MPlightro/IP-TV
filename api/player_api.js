const https = require("https");

// Helper: fetch JSON from Google Drive API
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk.toString());
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } 
        catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

// Parse USERS from environment variable: "alice:hunter2,bob:letmein"
function parseUsers() {
  const raw = process.env.USERS || "";
  const map = {};
  raw.split(",").forEach(pair => {
    const [u, p] = pair.split(":");
    if (u && p) map[u] = p;
  });
  return map;
}

// Get username/password from query or POST body
async function getCredentials(req) {
  let username = req.query.username;
  let password = req.query.password;

  let body = "";
  req.on("data", chunk => body += chunk.toString());
  await new Promise(resolve => req.on("end", resolve));

  const params = new URLSearchParams(body);
  username = username || params.get("username");
  password = password || params.get("password");

  return { username, password };
}

module.exports = async (req, res) => {
  const { username, password } = await getCredentials(req);
  const USERS = parseUsers();

  if (!username || !password || USERS[username] !== password) {
    return res.json({
      user_info: { auth: 0, status: "Invalid", message: "Invalid username/password" },
      server_info: {}
    });
  }

  const API_KEY = process.env.GOOGLE_API_KEY;
  const FOLDER_ID = process.env.FOLDER_ID;
  if (!API_KEY || !FOLDER_ID) return res.status(500).json({ error: "Server not configured" });

  try {
    // Fetch all files from the Drive folder
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&key=${API_KEY}&fields=files(id,name)`;
    const data = await fetchJson(url);
    const files = data.files || [];

    // Build Smarters-compatible movies array
    const movies = files.map((f, i) => ({
      name: f.name,
      stream_type: "movie",
      stream_id: f.id,
      stream_icon: "",
      added: Date.now().toString(),
      category_id: 1,
      container_extension: "mp4",
      // Google Drive direct download link (works if file is public)
      direct_source: `https://drive.google.com/uc?id=${f.id}&export=download`
    }));

    res.json({
      user_info: { username, password, auth: 1, status: "Active", message: "Welcome" },
      server_info: {
        url: req.headers.host,
        port: 80,
        https_port: 443,
        server_protocol: "https",
        timezone: "UTC"
      },
      categories: [{ category_id: 1, category_name: "Movies", parent_id: 0 }],
      movies
    });

  } catch (err) {
    console.error("Error fetching Drive files:", err);
    res.status(500).json({ error: "Error fetching playlist" });
  }
};
