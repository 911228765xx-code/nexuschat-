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

/**
 * Inline the Vite preload helper into index.js to break the
 * index.js → vendor-metamask → vendor-web3 synchronous loading chain.
 *
 * Rollup places the __vite__preloadCSS helper in the first chunk that
 * contains a dynamic import (vendor-metamask, because MetaMask SDK uses
 * Stencil.js lazy loading). index.js then imports the helper from
 * vendor-metamask, which forces vendor-metamask (and its dep vendor-web3)
 * to be loaded synchronously.
 *
 * This plugin post-processes the built chunks:
 * 1. Finds the preload helper definition in vendor-metamask.
 * 2. Inlines it directly into index.js.
 * 3. Removes the `import { _ as l } from "./vendor-metamask-*.js"` line
 *    from index.js (the only symbol index.js needs from vendor-metamask).
 */
function vitePluginInlinePreloadHelper(): Plugin {
  let outDir = "";
  return {
    name: "inline-preload-helper",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    // Use closeBundle (after all files written) to post-process on disk
    closeBundle() {
      const assetsDir = path.join(outDir, "assets");
      if (!fs.existsSync(assetsDir)) return;

      const files = fs.readdirSync(assetsDir);
      const indexFile = files.find(f => f.startsWith("index-") && f.endsWith(".js"));
      const metamaskFile = files.find(f => f.startsWith("vendor-metamask-") && f.endsWith(".js"));

      if (!indexFile || !metamaskFile) return;

      const indexPath = path.join(assetsDir, indexFile);
      const metamaskPath = path.join(assetsDir, metamaskFile);

      let indexCode = fs.readFileSync(indexPath, "utf8");
      const mmCode = fs.readFileSync(metamaskPath, "utf8");

      // Check if index.js actually imports from vendor-metamask
      const importPattern = /import\{[^}]+\}from"\.\/(vendor-metamask-[^"]+\.js)"/;
      const importMatch = indexCode.match(importPattern);
      if (!importMatch) {
        console.log("[inline-preload-helper] No vendor-metamask import found in index.js");
        return;
      }

      // Get the local alias used for _ in index.js (e.g. "l")
      const aliasMatch = importMatch[0].match(/_ as (\w+)/);
      if (!aliasMatch) {
        console.log("[inline-preload-helper] No _ alias found in vendor-metamask import");
        return;
      }
      const localAlias = aliasMatch[1]; // e.g. "l"

      // Find the internal name of the preload function in vendor-metamask
      const exportMatch = mmCode.match(/export\{(\w+) as _/);
      if (!exportMatch) {
        console.log("[inline-preload-helper] No _ export found in vendor-metamask");
        return;
      }
      const internalName = exportMatch[1]; // e.g. "jh"

      // Find the preload function definition
      const preloadFnIdx = mmCode.indexOf(`${internalName}=function(`);
      if (preloadFnIdx < 0) {
        console.log(`[inline-preload-helper] Preload function ${internalName} not found`);
        return;
      }

      // Find the start of the helper block (includes feature detection + URL resolver + cache)
      let blockStart = preloadFnIdx;
      const featureDetectIdx = mmCode.lastIndexOf('"modulepreload"', preloadFnIdx);
      if (featureDetectIdx > 0) {
        const commaStart = mmCode.lastIndexOf(',', featureDetectIdx);
        const semicolonStart = mmCode.lastIndexOf(';', featureDetectIdx);
        blockStart = Math.max(commaStart, semicolonStart) + 1;
      }

      // Find the end of the preload function (matching braces)
      const fnStart = mmCode.indexOf('{', preloadFnIdx);
      let depth = 0;
      let fnEnd = fnStart;
      for (let i = fnStart; i < mmCode.length; i++) {
        if (mmCode[i] === '{') depth++;
        else if (mmCode[i] === '}') {
          depth--;
          if (depth === 0) { fnEnd = i + 1; break; }
        }
      }

      let helperCode = mmCode.slice(blockStart, fnEnd).trim();

      // Replace the internal name with the local alias used in index.js
      helperCode = helperCode.replace(new RegExp(`\\b${internalName}\\b`, 'g'), localAlias);

      // Build the inline replacement: declare all variables from the helper block
      const inlineDecl = `const ${helperCode};`;

      // Replace the import statement with the inline declaration
      const patchedIndex = indexCode.replace(importMatch[0], inlineDecl);

      if (patchedIndex === indexCode) {
        console.log("[inline-preload-helper] No changes made to index.js");
        return;
      }

      fs.writeFileSync(indexPath, patchedIndex, "utf8");
      console.log(`[inline-preload-helper] Successfully inlined preload helper into ${indexFile}`);
      console.log(`[inline-preload-helper] Removed sync dependency on ${metamaskFile}`);
    },
  };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector(), vitePluginDisableReownAnalytics(), vitePluginInlinePreloadHelper()];

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
    // Disable automatic modulepreload injection to prevent mobile white screen
    // (10MB+ JS preloaded on first visit caused blank page on mobile)
    modulePreload: false,
    rollupOptions: {
      output: {
        // Prevent Rollup from hoisting transitive imports of dynamic chunks
        // to the entry chunk's synchronous dependencies.
        // This keeps vendor-web3, vendor-misc etc. as truly async chunks.
        hoistTransitiveImports: false,
        manualChunks(id: string) {
          // DEBUG: log modules that end up in vendor-misc
          if (process.env.DEBUG_CHUNKS && id.includes('node_modules') && 
              !id.includes('wagmi') && !id.includes('@rainbow') && !id.includes('viem') &&
              !id.includes('@reown') && !id.includes('@walletconnect') && !id.includes('@noble') &&
              !id.includes('@scure') && !id.includes('@adraffy') && !id.includes('@coinbase') &&
              !id.includes('coinbase-wallet') && !id.includes('react-dom') && !id.includes('react/') &&
              !id.includes('scheduler') && !id.includes('@tanstack') && !id.includes('@trpc') &&
              !id.includes('socket.io') && !id.includes('engine.io') && !id.includes('qrcode') &&
              !id.includes('@radix-ui') && !id.includes('superjson') && !id.includes('wouter') &&
              !id.includes('clsx') && !id.includes('tailwind-merge') && !id.includes('next-themes') &&
              !id.includes('sonner') && !id.includes('lucide-react') && !id.includes('framer-motion') &&
              !id.includes('recharts') && !id.includes('d3-') && !id.includes('WalletContext') &&
              !id.includes('Web3ProviderImpl') && !id.includes('/lib/wagmi') && !id.includes('/lib/trpc') &&
              !id.includes('/_core/hooks/useAuth') && !id.includes('xmlhttprequest-ssl')
          ) {
            console.log('[vendor-misc candidate]', id.replace(/.*node_modules\//, '').split('/').slice(0,2).join('/'));
          }
          // MetaMask SDK (separate chunk to prevent Stencil.js dynamic import
          // from placing Vite preload function in vendor-web3)
          if (
            id.includes("@metamask/sdk") ||
            id.includes("@metamask/sdk-analytics")
          ) {
            return "vendor-metamask";
          }
          // Wallet / Web3 libs — ALL packages that wagmi/RainbowKit depend on
          // CRITICAL: Must include ALL transitive deps to prevent vendor-misc from
          // importing vendor-web3 (which would re-create the sync loading chain)
          if (
            // Core wagmi/viem/rainbowkit
            id.includes("wagmi") ||
            id.includes("@rainbow-me") ||
            id.includes("viem") ||
            id.includes("@reown") ||
            id.includes("@walletconnect") ||
            id.includes("@noble") ||
            id.includes("@scure") ||
            id.includes("@adraffy") ||
            id.includes("@coinbase") ||
            id.includes("coinbase-wallet") ||
            // NOTE: @metamask/sdk is in vendor-metamask (separate chunk) to prevent
            // its Stencil.js dynamic import from placing the Vite preload function in vendor-web3
            // MetaMask SDK dependencies (non-SDK packages)
            id.includes("@metamask/rpc-errors") ||
            id.includes("@metamask/safe-event-emitter") ||
            id.includes("@metamask/superstruct") ||
            id.includes("@metamask/utils") ||
            // Base/Coinbase wallet
            id.includes("@base-org") ||
            // Safe wallet
            id.includes("@safe-global") ||
            // Ethereum JSON-RPC infrastructure
            id.includes("eth-block-tracker") ||
            id.includes("eth-json-rpc-filters") ||
            id.includes("eth-query") ||
            id.includes("eth-rpc-errors") ||
            id.includes("json-rpc-engine") ||
            id.includes("json-rpc-random-id") ||
            // ox (Ethereum primitives used by viem)
            id.includes("/ox/") ||
            id.includes("/ox/_") ||
            // MIPD (Multi Injected Provider Discovery)
            id.includes("mipd") ||
            // abitype (TypeScript types for Ethereum ABIs)
            id.includes("abitype") ||
            // Crypto primitives used by Web3
            id.includes("keccak") ||
            id.includes("sha.js") ||
            id.includes("/bs58/") ||
            id.includes("/bn.js/") ||
            id.includes("multiformats") ||
            id.includes("uint8arrays") ||
            id.includes("to-buffer") ||
            // Vanilla Extract (used by RainbowKit for CSS-in-JS)
            id.includes("@vanilla-extract") ||
            // Lit (used by some wallet connectors)
            id.includes("@lit/") ||
            id.includes("/lit-element/") ||
            id.includes("/lit-html/") ||
            id.includes("/lit/") ||
            // valtio (state management used by wagmi)
            id.includes("valtio") ||
            id.includes("derive-valtio") ||
            id.includes("proxy-compare") ||
            // zustand (state management used by wagmi)
            id.includes("zustand") ||
            // openapi-fetch (used by Safe wallet)
            id.includes("openapi-fetch") ||
            // idb-keyval (IndexedDB, used by wallet connectors)
            id.includes("idb-keyval") ||
            // async-mutex (used by eth-block-tracker)
            id.includes("async-mutex") ||
            // pify (used by eth-block-tracker)
            id.includes("/pify/") ||
            // detect-browser/detect-node (used by MetaMask SDK)
            id.includes("detect-browser") ||
            id.includes("detect-node-es") ||
            // ua-parser-js (used by MetaMask SDK)
            id.includes("ua-parser-js") ||
            // eventemitter2 (used by MetaMask SDK)
            id.includes("eventemitter2") ||
            // pino (used by MetaMask SDK)
            id.includes("/pino/") ||
            // get-nonce (used by SIWE/RainbowKit)
            id.includes("get-nonce") ||
            // cross-fetch (used by wallet connectors)
            id.includes("cross-fetch") ||
            // html2canvas (used by some wallet UIs)
            id.includes("html2canvas") ||
            // react-remove-scroll and related (used by RainbowKit modal)
            // These share the __webpack_nonce__ getter with @vanilla-extract
            // so they MUST be in the same chunk to avoid cross-chunk deps
            // NOTE: use-callback-ref is in vendor-core (shared with Radix UI)
            id.includes("react-remove-scroll") ||
            id.includes("react-style-singleton") ||
            id.includes("use-sidecar") ||
            // Source files
            id.includes("WalletContext") ||
            id.includes("Web3ProviderImpl") ||
            id.includes("/lib/wagmi")
          ) {
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
          // @tanstack/react-query in its own chunk - shared by both tRPC and wagmi.
          // Keeping it separate prevents wagmi from being merged into vendor-trpc
          // and avoids vendor-web3 being hoisted into index.js's sync deps.
          if (id.includes("@tanstack")) {
            return "vendor-query";
          }
          // tRPC only (~50KB)
          // Also include source files that use tRPC to prevent them from being
          // merged into vendor-web3 by Rollup's shared-module algorithm
          if (
            id.includes("@trpc") ||
            id.includes("/lib/trpc") ||
            id.includes("/_core/hooks/useAuth") ||
            id.includes("/hooks/useAuth")
          ) {
            return "vendor-trpc";
          }
          // NOTE: shiki, mermaid, katex, streamdown have been removed from the app
          // LightMarkdown component is used instead (pure JS, ~0KB extra)
          // Socket.IO client (lazy-loaded for chat pages)
          if (id.includes("socket.io") || id.includes("engine.io") || id.includes("xmlhttprequest-ssl")) {
            return "vendor-socketio";
          }
          // QR code (used only in wallet/invite pages)
          if (id.includes("qrcode") || id.includes("qr-code") || id.includes("qrcode.react")) {
            return "vendor-qrcode";
          }
          // D3 (used only in charts/trading pages)
          if (id.includes("/d3-") || id.includes("d3-array") || id.includes("d3-scale") || id.includes("d3-shape") || id.includes("d3-path") || id.includes("d3-color") || id.includes("d3-format") || id.includes("d3-interpolate") || id.includes("d3-time")) {
            return "vendor-charts";
          }
          // Radix UI primitives
          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }
          // Superjson (used in tRPC, keep small)
          if (id.includes("superjson")) {
            return "vendor-trpc";
          }
          // Core routing + utility libs used directly by App.tsx/main.tsx
          // These MUST be in a separate chunk so vendor-misc can be deferred
          // NOTE: use-callback-ref is used by BOTH Radix UI (vendor-react/vendor-radix)
          // AND RainbowKit (vendor-web3). It MUST be in vendor-core to avoid
          // vendor-react/vendor-radix importing from vendor-web3 (sync chain!)
          if (
            id.includes("/wouter") ||
            id.includes("/clsx") ||
            id.includes("/clsx/") ||
            id.includes("/tailwind-merge") ||
            id.includes("/class-variance-authority") ||
            id.includes("/next-themes") ||
            id.includes("/sonner") ||
            id.includes("/cmdk") ||
            id.includes("/vaul") ||
            // use-callback-ref: shared by Radix UI AND RainbowKit
            id.includes("use-callback-ref")
          ) {
            return "vendor-core";
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
