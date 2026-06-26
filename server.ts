import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route for sheets proxying (bypassing CORS)
  app.get("/api/fetch-sheet", async (req, res) => {
    const sheetUrl = req.query.url;
    if (!sheetUrl || typeof sheetUrl !== "string") {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    try {
      const targetUrl = sheetUrl.trim();
      let spreadsheetId: string | null = null;

      if (targetUrl.includes("docs.google.com/spreadsheets")) {
        const match = targetUrl.match(/\/d\/([^\/]+)/);
        if (match && match[1] && match[1] !== "e") {
          spreadsheetId = match[1];
        }
      }

      if (spreadsheetId) {
        // Try the export format URL first (works for anyone with standard link access, no Publish to web needed!)
        const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
        try {
          console.log(`[Proxy] Fetching from export URL: ${exportUrl}`);
          const response = await fetch(exportUrl);
          if (response.ok) {
            const text = await response.text();
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            return res.send(text);
          }
          console.warn(`[Proxy] Export URL returned status ${response.status}`);
        } catch (e) {
          console.error("[Proxy] Export URL fetch failed:", e);
        }

        // Try the published CSV output next
        const pubUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/pub?output=csv`;
        try {
          console.log(`[Proxy] Fetching from pub URL: ${pubUrl}`);
          const response = await fetch(pubUrl);
          if (response.ok) {
            const text = await response.text();
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            return res.send(text);
          }
          console.warn(`[Proxy] Pub URL returned status ${response.status}`);
        } catch (e) {
          console.error("[Proxy] Pub URL fetch failed:", e);
        }
      }

      // Fallback to directly fetching the URL as provided
      console.log(`[Proxy] Fetching fallback URL: ${targetUrl}`);
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet from source. Status: ${response.status}`);
      }
      const text = await response.text();
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.send(text);
    } catch (error: any) {
      console.error("[Proxy] Error fetching sheet:", error);
      res.status(500).json({ error: error.message || "Failed to fetch spreadsheet data" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
