import express from "express";
import { app } from "./app";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = process.env.PORT || 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    // Ensure we find the dist folder correctly relative to the project root
    const distPath = path.resolve(process.cwd(), "dist");
    
    console.log(`Production mode: Serving static files from ${distPath}`);
    
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.warn("WARNING: 'dist' directory not found at " + distPath);
      app.get("*", (req, res) => {
        res.status(404).send("Frontend build not found. Please run 'npm run build' or check your deployment configuration.");
      });
    }
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
