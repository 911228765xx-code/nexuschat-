import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

// Disable Reown/WalletConnect analytics to prevent domain allowlist errors
// Note: Only replace analytics:true in source files during dev transform.
// Do NOT modify method bodies with regex (nested braces break the pattern).
function vitePluginDisableReownAnalytics(): Plugin {
  return {
    name: "disable-reown-analytics",
    transform(code, id) {
      // Only apply to appkit-controllers source files (not pre-bundled chunks)
      if (id.includes("appkit-controllers") && !id.includes("node_modules/.vite")) {
        return {
          code: code.replace(/analytics:\s*true/g, "analytics: false"),
          map: null,
        };
      }
    },
  };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector(), vitePluginDisableReownAnalytics()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  define: {
    // Inject platform-injected VITE_ env vars that are in process.env but not in .env files
    "import.meta.env.VITE_WALLETCONNECT_PROJECT_ID": JSON.stringify(
      process.env.VITE_WALLETCONNECT_PROJECT_ID || ""
    ),
    "import.meta.env.VITE_FRONTEND_FORGE_API_KEY": JSON.stringify(
      process.env.VITE_FRONTEND_FORGE_API_KEY || ""
    ),
    "import.meta.env.VITE_FRONTEND_FORGE_API_URL": JSON.stringify(
      process.env.VITE_FRONTEND_FORGE_API_URL || ""
    ),
  },
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Disable automatic modulepreload injection so browsers load chunks on-demand
    // instead of preloading all vendor chunks at startup (prevents mobile white screen)
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Wallet / Web3 libs (~400KB)
          if (id.includes("wagmi") || id.includes("@rainbow-me") || id.includes("viem") || id.includes("@reown") || id.includes("@walletconnect")) {
            return "vendor-web3";
          }
          // Charts / data-viz (~300KB)
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory")) {
            return "vendor-charts";
          }
          // Animation (~200KB)
          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }
          // Icons (~150KB)
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
          // React core (~150KB)
          if (id.includes("react-dom") || id.includes("react/") || id.includes("scheduler")) {
            return "vendor-react";
          }
          // tRPC + tanstack-query (~100KB)
          if (id.includes("@trpc") || id.includes("@tanstack")) {
            return "vendor-trpc";
          }
          // Shiki syntax highlighting (languages + themes ~8MB) — lazy only
          if (id.includes("@shikijs") || id.includes("shiki")) {
            return "vendor-shiki";
          }
          // Mermaid diagrams (~3MB) — lazy only
          if (id.includes("mermaid") || id.includes("elkjs") || id.includes("dagre") || id.includes("cytoscape")) {
            return "vendor-mermaid";
          }
          // KaTeX math rendering (~1MB) — lazy only
          if (id.includes("katex")) {
            return "vendor-katex";
          }
          // Streamdown — must be in its own chunk so shiki/mermaid deps stay lazy
          if (id.includes("streamdown")) {
            return "vendor-streamdown";
          }
          // Markdown / remark / rehype utilities
          if (id.includes("react-markdown") || id.includes("remark-") || id.includes("rehype-") || id.includes("unified") || id.includes("mdast") || id.includes("hast") || id.includes("micromark") || id.includes("marked")) {
            return "vendor-markdown";
          }
          // Socket.IO
          if (id.includes("socket.io")) {
            return "vendor-socketio";
          }
          // Radix UI primitives
          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }
          // Form handling
          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) {
            return "vendor-forms";
          }
          // Date utilities
          if (id.includes("date-fns") || id.includes("react-day-picker")) {
            return "vendor-date";
          }
          // QR code (only used in Wallet Receive modal)
          if (id.includes("qrcode")) {
            return "vendor-qrcode";
          }
          // Canvas / image export (only used in specific features)
          if (id.includes("html2canvas")) {
            return "vendor-canvas";
          }
          // Carousel / slider
          if (id.includes("embla-carousel") || id.includes("vaul") || id.includes("input-otp") || id.includes("cmdk")) {
            return "vendor-ui-extra";
          }
          // Superjson + serialization
          if (id.includes("superjson") || id.includes("nanoid") || id.includes("class-variance") || id.includes("clsx") || id.includes("tailwind-merge")) {
            return "vendor-utils";
          }
          // Remaining node_modules
          if (id.includes("node_modules")) {
            return "vendor-misc";
          }
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
