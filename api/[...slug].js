// Catch-all endpoint to log everything Smarters sends
module.exports = async (req, res) => {
  let body = "";
  req.on("data", chunk => body += chunk.toString());
  await new Promise(resolve => req.on("end", resolve));

  console.log("------ REQUEST RECEIVED ------");
  console.log("Path:", req.url);
  console.log("Method:", req.method);
  console.log("Headers:", req.headers);
  console.log("Query:", req.query);
  console.log("Body:", body);
  console.log("-------------------------------");

  // Respond with generic Xtream Codes JSON so Smarters can at least parse it
  const username = req.query.username || new URLSearchParams(body).get("username") || "alice";
  const password = req.query.password || new URLSearchParams(body).get("password") || "hunter2";

  res.setHeader("Content-Type", "application/json");
  res.json({
    user_info: { username, password, auth: 1, status: "Active", message: "Logged" },
    server_info: { url: "ip-tv-psi.vercel.app", port: 80, https_port: 443, server_protocol: "https", timezone: "UTC" },
    categories: [{ category_id: 1, category_name: "Movies", parent_id: 0 }],
    movie_stream: []
  });
};
