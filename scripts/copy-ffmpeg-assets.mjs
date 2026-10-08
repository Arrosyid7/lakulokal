import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const source = path.resolve("node_modules/@ffmpeg/core/dist/umd");
const destination = path.resolve("public/ffmpeg");

await mkdir(destination, { recursive: true });
for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  await copyFile(path.join(source, file), path.join(destination, file));
}
