// api/player_api.js
const https = require("https");

// Helper: fetch JSON from Google Drive API
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

// Helper: get username/password from GET or POST
async function getCredentials(req) {
  let username = req.query.username;
  let password = req.query.password;

  if ((!username || !password) && req.method === "POST") {
    try {
      const body = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", chunk => data += chunk);
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });

      const params = new URLSearchParams(body);
      username = params.get("username");
      password = params.get("password");
    } catch (err) {
      console.error("Error parsing POST body:", err);
    }
  }

  return { username, password };
}

module.exports = async (req, res) => {
  const { username, password } = await getCredentials(req);
  console.log("Received credentials:", { username, password }); // Log in Vercel

  const users = parseUsers();

  if (!username || !password || users[username] !== password) {
    console.log("Authentication failed");
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
    // Fetch files from Google Drive folder
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&key=${API_KEY}&fields=files(id,name)`;
    const data = await fetchJson(url);
    const files = data.files || [];

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
