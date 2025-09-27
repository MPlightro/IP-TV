// api/player_api.js
const playlist = require("./playlist.js");

// Parse USERS env var into { username: password }
function parseUsers() {
  const raw = process.env.USERS || "";
  const map = {};
  raw.split(",").forEach(pair => {
    const [u, p] = pair.split(":");
    if (u && p) map[u] = p;
  });
  return map;
}

// Get credentials from query string or POST body
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

  // Map playlist.js entries to Xtream Codes JSON
  const movie_stream = playlist.map((f, i) => ({
    num: i + 1,
    name: f.name,
    stream_type: f.stream_type || "movie",
    stream_id: f.stream_id,
    stream_icon: f.stream_icon || "",
    added: Date.now().toString(),
    category_id: 1,
    container_extension: "m3u8", // treat as HLS
    // replace .mp4 with .m3u8 so Smarters sees it as HLS
    direct_source: f.direct_source.replace(/\.mp4$/, ".m3u8")
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
    categories: [{ category_id: 1, category_name: "Movies", parent_id: 0 }],
    movie_stream
  };

  res.setHeader("Content-Type", "application/json");
  res.json(response);
};
