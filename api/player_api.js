const https = require("https");

// Helper to fetch M3U playlist
function fetchPlaylist(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk.toString());
      res.on("end", () => resolve(body));
    }).on("error", reject);
  });
};

function parseUsers() {
  const raw = process.env.USERS || "";
  const map = {};
  raw.split(",").forEach(pair => {
    const [u, p] = pair.split(":");
    if (u && p) map[u] = p;
  });
  return map;
}

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

  try {
    const playlistM3U = await fetchPlaylist(
      `https://ip-tv-psi.vercel.app/api/playlist.js?username=${username}&password=${password}`
    );

    // Parse M3U into movie_stream
    const lines = playlistM3U.split("\n").filter(l => l && !l.startsWith("#EXTM3U") && !l.startsWith("#EXTINF"));
    const movie_stream = lines.map((url, i) => ({
      num: i + 1,
      name: `Movie ${i+1}`,
      stream_type: "movie",
      stream_id: `m${i+1}`,
      stream_icon: "",
      added: Date.now().toString(),
      category_id: 1,
      container_extension: "mp4",
      direct_source: url
    }));

    const response = {
      user_info: { username, password, auth: 1, status: "Active", message: "Welcome" },
      server_info: { url: "ip-tv-psi.vercel.app", port: 80, https_port: 443, server_protocol: "https", timezone: "UTC" },
      categories: [{ category_id: 1, category_name: "Movies", parent_id: 0 }],
      movie_stream
    };

    res.setHeader("Content-Type", "application/json");
    res.json(response);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching playlist: " + String(err.message || err) });
  }
};
