/**
 * stamp-build.cjs
 * 在每次构建前将时间戳写入 client/src/main.tsx 的第一行注释。
 * 这确保每次构建都产生不同的 bundle hash，防止 CDN 缓存旧版本。
 */
const fs = require("fs");
const path = require("path");

const target = path.resolve(__dirname, "../client/src/main.tsx");
let content = fs.readFileSync(target, "utf8");

const stamp = `// build:${new Date().toISOString()}`;

// 替换已有的 build stamp，或在文件开头插入
if (content.startsWith("// build:")) {
  content = stamp + "\n" + content.slice(content.indexOf("\n") + 1);
} else {
  content = stamp + "\n" + content;
}

fs.writeFileSync(target, content, "utf8");
console.log(`[stamp-build] ${stamp}`);
