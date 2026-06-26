import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

if (!existsSync("out")) {
  console.error("Next static export folder was not found: out");
  process.exit(1);
}

if (existsSync("dist")) {
  rmSync("dist", { recursive: true, force: true });
}

cpSync("out", "dist", { recursive: true });

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function listFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    return statSync(fullPath).isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

const assets = Object.fromEntries(
  listFiles("out").map((filePath) => {
    const routePath = `/${path.relative("out", filePath).replaceAll(path.sep, "/")}`;
    const type = mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream";
    const body = readFileSync(filePath).toString("base64");
    return [routePath, { type, body }];
  }),
);

const worker = `const assets = ${JSON.stringify(assets)};

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const asset = assets[pathname] ?? assets[\`\${pathname}.html\`] ?? assets["/index.html"];

    return new Response(decodeBase64(asset.body), {
      headers: {
        "content-type": asset.type,
        "cache-control": pathname.startsWith("/_next/static/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      },
    });
  },
};
`;

writeFileSync("dist/index.js", worker);
console.log("Prepared static deployment folder with vinext entrypoint: dist");
