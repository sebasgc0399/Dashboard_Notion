import { onRequest } from "firebase-functions/v2/https";

const ALLOWED_PATH_PREFIXES = ["databases/", "search"];
const ALLOWED_METHODS = ["POST"];

export const notionProxy = onRequest({ cors: true }, async (req, res) => {
  if (!ALLOWED_METHODS.includes(req.method)) {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = req.headers["x-notion-token"] as string;
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const path = req.query.path as string;
  if (!path) {
    res.status(400).json({ error: "No path provided" });
    return;
  }

  const isAllowed = ALLOWED_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
  if (!isAllowed) {
    res.status(403).json({ error: "Path not allowed" });
    return;
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/${path}`, {
      method: req.method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: "Proxy error" });
  }
});
