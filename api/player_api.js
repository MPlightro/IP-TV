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

// Helper: list folders inside a parent folder
async function listFolders(parentId, apiKey) {
  const url = `https://www.googleapis.com/drive/v3/files?q='${parentId}'+in+parents+and mimeType='application/vnd.google-apps.folder'&key=${apiKey}&fields=files(id,name)`;
  const data = await fetchJson(url);
  return data.files || [];
}

// Helper: list files inside a folder
async function listFiles(folderId, apiKey) {
  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name)`;
  const data = await fetchJson(url);
  return data.files || [];
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
    // 1. List all movie folders
    const folders = await listFolders(FOLDER_ID, API_KEY);

    // 2. Build Smarters-compatible movies array
    const movies = [];
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i];

      // List files inside this folder
      const files = await listFiles(folder.id, API_KEY);

      // Find the .m3u8 file
      const hlsFile = files.find(f => f.name.endsWith(".m3u8"));
      if (!hlsFile) continue; // skip if no HLS playlist

      movies.push({
        name: folder.name,
        stream_type: "movie",
        stream_id: folder.id,
        stream_icon: "",
        added: Date.now().toString(),
        category_id: 1,
        container_extension: "m3u8",
        direct_source: `https://drive.google.com/uc?id=${hlsFile.id}&export=download`
      });
    }

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
