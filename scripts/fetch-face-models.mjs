import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const modelBaseUrl =
  "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";

const files = [
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1",
];

const outputDir = path.join(process.cwd(), "public", "models");

async function downloadFile(fileName) {
  const response = await fetch(`${modelBaseUrl}/${fileName}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${fileName}: ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  await writeFile(path.join(outputDir, fileName), bytes);
}

try {
  await mkdir(outputDir, { recursive: true });
  await Promise.all(files.map(downloadFile));
  console.log("face-api.js tiny face detector models are ready.");
} catch (error) {
  console.warn("Could not fetch face-api.js models during postinstall.");
  console.warn(error instanceof Error ? error.message : error);
  console.warn("The app can still build, but face detection needs public/models files.");
}
