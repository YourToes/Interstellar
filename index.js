import http from "node:http";
import path from "node:path";
import { createBareServer } from "@tomphttp/bare-server-node";
import chalk from "chalk";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import basicAuth from "express-basic-auth";
import mime from "mime";
import fetch from "node-fetch";
import { setupMasqr } from "./Masqr.js";
import config from "./config.js";

console.log(chalk.yellow("🚀 Starting server..."));

const __dirname = process.cwd();
const server = http.createServer();
const app = express();
// Enhanced Bare Server configuration for WebSocket support
const bareServer = createBareServer("/ov/", {
  logErrors: false,
  localAddress: undefined,
  maintainer: {
    email: "support@interstellar.network",
    website: "https://interstellar.network"
  }
});
const PORT = process.env.PORT || 8080;
const cache = new Map();
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // Cache for 30 Days
const MAX_CACHE_SIZE = 200; // Increased cache size for better game performance

if (config.challenge) {
  console.log(
    chalk.green("🔒 Password protection is enabled! Listing logins below"),
  );
  // biome-ignore lint/complexity/noForEach:
  Object.entries(config.users).forEach(([username, password]) => {
    console.log(chalk.blue(`Username: ${username}, Password: ${password}`));
  });
  app.use(basicAuth({ users: config.users, challenge: true }));
}

app.get("/e/*", async (req, res, next) => {
  try {
    if (cache.has(req.path)) {
      const { data, contentType, timestamp } = cache.get(req.path);
      if (Date.now() - timestamp > CACHE_TTL) {
        cache.delete(req.path);
      } else {
        res.writeHead(200, { "Content-Type": contentType });
        return res.end(data);
      }
    }

    const baseUrls = {
      "/e/1/": "https://raw.githubusercontent.com/v-5x/x/fixy/",
      "/e/2/": "https://raw.githubusercontent.com/ypxa/y/main/",
      "/e/3/": "https://raw.githubusercontent.com/ypxa/w/master/",
    };

    let reqTarget;
    for (const [prefix, baseUrl] of Object.entries(baseUrls)) {
      if (req.path.startsWith(prefix)) {
        reqTarget = baseUrl + req.path.slice(prefix.length);
        break;
      }
    }

    if (!reqTarget) {
      return next();
    }

    const asset = await fetch(reqTarget);
    if (!asset.ok) {
      return next();
    }

    const data = Buffer.from(await asset.arrayBuffer());
    const ext = path.extname(reqTarget);
    const no = [".unityweb"];
    const contentType = no.includes(ext)
      ? "application/octet-stream"
      : mime.getType(ext);

    // Limit cache size - remove oldest entries if cache is full
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    
    cache.set(req.path, { data, contentType, timestamp: Date.now() });
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch (error) {
    console.error("Error fetching asset:", error);
    res.setHeader("Content-Type", "text/html");
    res.status(500).send("Error fetching the asset");
  }
});

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enhanced CORS for games - improved headers for game sites (CrazyGames, Poki, etc.)
app.use((req, res, next) => {
  // Allow all origins for game sites
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Frame-Options, Referer, User-Agent, Cache-Control, Pragma, If-Modified-Since, If-None-Match, Range, Accept-Ranges, Content-Range');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Range, Accept-Ranges, ETag, Last-Modified');
  res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  
  // Additional headers for game compatibility
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('Referrer-Policy', 'no-referrer-when-downgrade');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none'); // Allow game embeds
  res.header('Cross-Origin-Opener-Policy', 'unsafe-none'); // Allow popups
  res.header('Cross-Origin-Resource-Policy', 'cross-origin'); // Allow cross-origin resources
  
  // CRITICAL: Remove X-Frame-Options for ALL proxied content to allow nested iframes
  // This is essential for CrazyGames/Poki games that load in nested iframes
  res.removeHeader('X-Frame-Options');
  
  // CRITICAL: Remove CSP headers for ALL proxied content (not just specific paths)
  // Games need to load resources from multiple domains (gamedistribution.com, cdn.crazygames.com, etc.)
  // The UV proxy will handle CSP rewriting, but we need to ensure nothing blocks it
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Content-Security-Policy-Report-Only');
  
  // Additional header removal for game compatibility
  res.removeHeader('X-Content-Security-Policy');
  res.removeHeader('X-WebKit-CSP');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

if (process.env.MASQR === "true") {
  setupMasqr(app);
}

app.use(express.static(path.join(__dirname, "static"), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));
app.use("/ov", cors({ origin: true, credentials: true }));

const routes = [
  { path: "/as", file: "apps.html" },
  { path: "/gm", file: "games.html" },
  { path: "/st", file: "settings.html" },
  { path: "/ta", file: "tabs.html" },
  { path: "/ts", file: "tools.html" },
  { path: "/", file: "index.html" },
  { path: "/tos", file: "tos.html" },
  { path: "/privacy", file: "privacy.html" },
];

// biome-ignore lint/complexity/noForEach:
routes.forEach(route => {
  app.get(route.path, (_req, res) => {
    res.sendFile(path.join(__dirname, "static", route.file));
  });
});

app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, "static", "404.html"));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, "static", "404.html"));
});

// Enhanced request handling with better error handling
server.on("request", (req, res) => {
  if (bareServer.shouldRoute(req)) {
    try {
      bareServer.routeRequest(req, res);
    } catch (error) {
      console.error("Bare Server request error:", error);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Proxy error occurred");
    }
  } else {
    app(req, res);
  }
});

// Enhanced WebSocket upgrade handling for game sites
server.on("upgrade", (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    try {
      bareServer.routeUpgrade(req, socket, head);
    } catch (error) {
      console.error("WebSocket upgrade error:", error);
      socket.end();
    }
  } else {
    // Allow WebSocket upgrades for other paths if needed
    socket.end();
  }
});

server.on("listening", () => {
  console.log(chalk.green(`🌍 Server is running on http://localhost:${PORT}`));
});

server.listen({ port: PORT });
