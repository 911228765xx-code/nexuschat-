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

      // Strategy: Extract the COMPLETE preload block from vendor-metamask by finding
      // the start of the const declaration that contains the IIFE feature detection.
      // The block looks like:
      //   const Bh=(function(){...return..."modulepreload"...})(),Kh=function(e){return"/"+e},ya={},jh=function(t,n,r){...}
      // We need to find the 'const' keyword that starts this block.

      // Find the preload function definition end first (to know the full block boundary)
      const preloadFnIdx = mmCode.indexOf(`${internalName}=function(`);
      if (preloadFnIdx < 0) {
        console.log(`[inline-preload-helper] Preload function ${internalName} not found`);
        return;
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

      // Find the start of the const block by locating the last import statement.
      // The preload helper block starts right after all import statements.
      // Pattern in vendor-metamask: import{...}from"...";const Bh=(function(){...})(),...,jh=function(...){...}
      // We need to find the position right after the last import statement ends.
      let blockStart = -1;
      
      // Find all import statement end positions (they end with ';" or just '"')
      // The last import ends with from"..."; and then const starts
      const lastImportEnd = (() => {
        // Find all positions of 'from"' in the code before preloadFnIdx
        let lastPos = -1;
        let searchFrom = 0;
        while (searchFrom < preloadFnIdx) {
          const fromIdx = mmCode.indexOf('from"', searchFrom);
          if (fromIdx < 0 || fromIdx >= preloadFnIdx) break;
          // Find the end of this import (closing quote + semicolon)
          const closeQuote = mmCode.indexOf('"', fromIdx + 5);
          if (closeQuote < 0) break;
          // After the closing quote, there may be a semicolon
          let endPos = closeQuote + 1;
          if (mmCode[endPos] === ';') endPos++;
          lastPos = endPos;
          searchFrom = endPos;
        }
        return lastPos;
      })();
      
      if (lastImportEnd > 0) {
        // Skip any whitespace after the last import
        let pos = lastImportEnd;
        while (pos < mmCode.length && (mmCode[pos] === ' ' || mmCode[pos] === '\n' || mmCode[pos] === '\r')) pos++;
        if (mmCode.startsWith('const ', pos)) {
          blockStart = pos;
        }
      }

      if (blockStart < 0) {
        console.log("[inline-preload-helper] Could not find block start after imports, falling back to preloadFnIdx");
        blockStart = preloadFnIdx;
      }

      let helperCode = mmCode.slice(blockStart, fnEnd).trim();

      // Replace the internal name with the local alias used in index.js
      helperCode = helperCode.replace(new RegExp(`\\b${internalName}\\b`, 'g'), localAlias);

      // Build the inline declaration - only the preload function itself (not the IIFE helper vars)
      // We just need: const <alias>=function(t,n,r){...}
      // The IIFE feature detection (Bh, Kh, ya) are helpers for the preload function
      // We need to inline the ENTIRE block: const Bh=...,Kh=...,ya={},<alias>=function(...){...}
      // But rename the internal name to the local alias used in index.js
      const inlineDecl = `${helperCode};`;

      // CRITICAL FIX: ES Module spec requires ALL import statements to be at the top.
      // We must NOT replace an import statement in the middle of the import list with non-import code.
      // Instead:
      //   1. REMOVE the vendor-metamask import statement from index.js
      //   2. INSERT the inline declaration AFTER all import statements
      
      // Step 1: Remove the vendor-metamask import statement
      let patchedIndex = indexCode.replace(importMatch[0], '');
      
      // Step 2: Find the position AFTER all import statements in the patched code
      // Find the last import statement end position using exec loop
      const importRe = /import\{[^}]+\}from"[^"]+";?/g;
      let lastImportMatch: RegExpExecArray | null = null;
      let m: RegExpExecArray | null;
      while ((m = importRe.exec(patchedIndex)) !== null) {
        lastImportMatch = m;
      }
      if (!lastImportMatch) {
        console.error('[inline-preload-helper] No imports found in index.js after removal');
        return;
      }
      const insertPos = lastImportMatch.index + lastImportMatch[0].length;
      
      // Step 3: Insert the inline declaration right after the last import
      patchedIndex = patchedIndex.slice(0, insertPos) + inlineDecl + patchedIndex.slice(insertPos);

      if (patchedIndex === indexCode) {
        console.log("[inline-preload-helper] No changes made to index.js");
        return;
      }

      // Validate: ensure no import statement appears AFTER the inline declaration
      // (i.e., after the last original import position + inlineDecl length)
      const afterInlinePos = insertPos + inlineDecl.length;
      const codeAfterInline = patchedIndex.slice(afterInlinePos, afterInlinePos + 200);
      if (/^import\{/.test(codeAfterInline)) {
        console.error('[inline-preload-helper] VALIDATION FAILED: import statement found right after inline code!');
        console.error('[inline-preload-helper] Code after inline:', codeAfterInline.substring(0, 100));
        return;
      }

      fs.writeFileSync(indexPath, patchedIndex, "utf8");
      console.log(`[inline-preload-helper] Successfully inlined preload helper into ${indexFile}`);
      console.log(`[inline-preload-helper] Removed sync dependency on ${metamaskFile}`);
      console.log(`[inline-preload-helper] Inline code preview: ${inlineDecl.substring(0, 150)}`);
    },
  };
}


const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector(), vitePluginDisableReownAnalytics(), vitePluginInlinePreloadHelper()];

export default defineConfig({
  plugins,
  resolve: {
    // Force Vite to use a single copy of React across all packages.
    // Without this, @sentry/react (and wagmi/rainbowkit) can resolve their own
    // peer-dep copy of React, causing "Invalid hook call" crashes at runtime.
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      // Replace framer-motion with a no-op shim to fix Android Chrome black screen.
      // framer-motion's AnimatePresence causes component tree to unmount without
      // remounting on Android WebView, resulting in permanent black screen.
      // The shim exports the same API surface but renders plain HTML elements.
      "framer-motion": path.resolve(import.meta.dirname, "client", "src", "lib", "motion-shim.tsx"),
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
    // Use Terser for better compression (15% smaller than esbuild default)
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging
        drop_debugger: true,
        pure_funcs: ['console.debug'],
        passes: 2, // Two compression passes for better results
      },
      mangle: {
        safari10: true, // Fix Safari 10 bugs
      },
      format: {
        comments: false, // Remove all comments
      },
    },
    // Disable automatic modulepreload injection to prevent mobile white screen
    // (10MB+ JS preloaded on first visit caused blank page on mobile)
    modulePreload: false,
    // Merge chunks smaller than 20KB into their importers to reduce file count
    // This reduces 8 tiny chunks (1-15KB) into larger ones, cutting upload count
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Merge small chunks (< 20KB) into their importers automatically
        experimentalMinChunkSize: 20_000,
        // Prevent Rollup from hoisting transitive imports of dynamic chunks
        // to the entry chunk's synchronous dependencies.
        // This keeps vendor-web3, vendor-misc etc. as truly async chunks.
        hoistTransitiveImports: false,
        manualChunks(id: string) {
          // ================================================================
          // SIMPLIFIED CHUNK STRATEGY - Eliminates circular dependencies
          // 
          // Root cause of white screen: The previous strategy split React
          // ecosystem packages (react-dom, use-callback-ref, sonner, etc.)
          // across multiple chunks (vendor-react, vendor-core, vendor-misc,
          // vendor-radix), creating circular import chains:
          //   vendor-react → vendor-core → vendor-react (TDZ error!)
          //
          // Fix: Keep ALL non-Web3 packages in a single "vendor" chunk.
          // Only isolate Web3 packages (wagmi/RainbowKit/MetaMask) which
          // are lazily loaded and don't participate in the React init chain.
          // ================================================================

          // MetaMask SDK — separate chunk to prevent Stencil.js dynamic import
          // from placing the Vite preload helper in vendor-web3
          if (
            id.includes("@metamask/sdk") ||
            id.includes("@metamask/sdk-analytics")
          ) {
            return "vendor-metamask";
          }

          // All Web3 / wallet packages — lazily loaded, never in the React init chain
          if (
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
            id.includes("@metamask/rpc-errors") ||
            id.includes("@metamask/safe-event-emitter") ||
            id.includes("@metamask/superstruct") ||
            id.includes("@metamask/utils") ||
            id.includes("@base-org") ||
            id.includes("@safe-global") ||
            id.includes("eth-block-tracker") ||
            id.includes("eth-json-rpc-filters") ||
            id.includes("eth-query") ||
            id.includes("eth-rpc-errors") ||
            id.includes("json-rpc-engine") ||
            id.includes("json-rpc-random-id") ||
            id.includes("/ox/") ||
            id.includes("/ox/_") ||
            id.includes("mipd") ||
            id.includes("abitype") ||
            id.includes("keccak") ||
            id.includes("sha.js") ||
            id.includes("/bs58/") ||
            id.includes("/bn.js/") ||
            id.includes("multiformats") ||
            id.includes("uint8arrays") ||
            id.includes("to-buffer") ||
            id.includes("@vanilla-extract") ||
            id.includes("@lit/") ||
            id.includes("/lit-element/") ||
            id.includes("/lit-html/") ||
            id.includes("/lit/") ||
            id.includes("valtio") ||
            id.includes("derive-valtio") ||
            id.includes("proxy-compare") ||
            id.includes("zustand") ||
            id.includes("openapi-fetch") ||
            id.includes("idb-keyval") ||
            id.includes("async-mutex") ||
            id.includes("/pify/") ||
            id.includes("detect-browser") ||
            id.includes("detect-node-es") ||
            id.includes("ua-parser-js") ||
            id.includes("eventemitter2") ||
            id.includes("/pino/") ||
            id.includes("get-nonce") ||
            id.includes("cross-fetch") ||
            id.includes("html2canvas") ||
            // NOTE: react-remove-scroll, react-style-singleton, use-sidecar are intentionally NOT here.
            // They depend on use-callback-ref which is in the main vendor chunk.
            // Putting them in vendor-web3 creates: vendor -> vendor-web3 -> vendor (circular!)
            // causing 'A is not a function' on mobile browsers.
            // NOTE: use-callback-ref is intentionally NOT here.
            // It is shared by both @radix-ui (in vendor) and RainbowKit (vendor-web3).
            // Putting it in vendor-web3 would create: vendor -> vendor-web3 -> vendor (circular!)
            // Leaving it in vendor means vendor-web3 imports from vendor (one-way, no cycle).
            //
            // NOTE: WalletContext is intentionally NOT here.
            // WalletContext imports trpc (lib/trpc.ts), and trpc is needed by index.js.
            // If WalletContext were in vendor-web3, Rollup would put trpc in vendor-web3 too,
            // causing index.js to statically import vendor-web3 (4.5MB sync load = white screen!)
            // WalletContext is only used inside Web3ProviderImpl (lazy loaded), so it's safe
            // to leave it in the default vendor chunk.
            id.includes("Web3ProviderImpl") ||
            id.includes("/lib/wagmi")
          ) {
            return "vendor-web3";
          }

          // Heavy async-only libraries — lazy loaded, isolated to prevent
          // them from inflating the initial bundle
          if (id.includes("socket.io") || id.includes("engine.io") || id.includes("xmlhttprequest-ssl")) {
            return "vendor-socketio";
          }
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory")) {
            return "vendor-charts";
          }
          // framer-motion is used across all pages, keep in main vendor
          // (no separate chunk needed — avoids extra file upload)

          // All remaining node_modules → single "vendor" chunk
          // This prevents circular dependencies between vendor sub-chunks
          // by keeping all React ecosystem packages together.
          if (id.includes("node_modules")) {
            return "vendor";
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
    // HMR: use the proxied domain so the browser can reach the WebSocket
    // without this, Vite tries ws://localhost:5173 which is blocked by the proxy
    hmr: {
      clientPort: 443,
      protocol: "wss",
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
