import { cpSync, existsSync, rmSync } from "node:fs";

if (!existsSync("out")) {
  console.error("Next static export folder was not found: out");
  process.exit(1);
}

if (existsSync("dist")) {
  rmSync("dist", { recursive: true, force: true });
}

cpSync("out", "dist", { recursive: true });
console.log("Prepared static deployment folder: dist");
