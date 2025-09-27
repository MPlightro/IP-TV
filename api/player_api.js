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
  const { username, password, action } = req.query;

  if (!username || !password || users[username] !== password) {
    return res.json({ user_info: { auth: 0, status: "Invalid" }, server_info: {} });
  }

  const API_KEY = process.env.GOOGLE_API_KEY;
  const FOLDER_ID = process.env.FOLDER_ID;

  // --- Case 1: No action, just user + server info ---
  if (!action) {
    return res.json({
      user_info: {
        username,
        password,
        status: "Active",
        auth: 1
      },
      server_info: {
        url: "ip-tv-psi.vercel.app",
        port: "80",
        https_port: "443",
        server_protocol: "https",
        timezone: "UTC"
      }
    });
  }

  // --- Case 2: Get VOD streams ---
  if (action === "get_vod_streams") {
    try {
      const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&key=${API_KEY}&fields=files(id,name)`;
      const data = await fetchJson(url);
      const files = data.files || [];

      const vod = files.map((f, i) => ({
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

      return res.json(vod);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Error fetching Google Drive files" });
    }
  }

  // --- Other actions can be added later ---
  return res.json({ error: "Action not supported" });
};
