// api/player_api.js
const https = require("https");

// Minimal test function for Smarters
module.exports = async (req, res) => {
  // Log method and query
  console.log("Method:", req.method);
  console.log("Query:", req.query);

  let body = "";
  req.on("data", chunk => body += chunk.toString());
  await new Promise(resolve => req.on("end", resolve));
  console.log("Body:", body);

  // Get username/password from query or POST body
  const params = new URLSearchParams(body);
  const username = req.query.username || params.get("username") || "alice";
  const password = req.query.password || params.get("password") || "hunter2";
  console.log("Received credentials:", { username, password });

  // Hardcoded users for testing
  const USERS = { alice: "hunter2" };

  if (!username || !password || USERS[username] !== password) {
    return res.json({
      user_info: { auth: 0, status: "Invalid", message: "Invalid username/password" },
      server_info: {}
    });
  }

  // Return minimal Xtream Codes JSON
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
    movie_stream: [
      {
        num: 1,
        name: "Test Movie",
        stream_type: "movie",
        stream_id: "test123",
        stream_icon: "",
        added: Date.now().toString(),
        category_id: 1,
        container_extension: "mp4",
        direct_source: "https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4"
      }
    ]
  };

  res.setHeader("Content-Type", "application/json");
  res.json(response);
};
