import fs from "node:fs";
import path from "node:path";

export const AVAILABLE_MODELS = [
  "tiny.en", "tiny",
  "base.en", "base",
  "small.en", "small",
  "medium.en", "medium",
  "large-v1", "large-v2", "large-v3", "large-v3-turbo"
] as const;

export type WhisperModel = typeof AVAILABLE_MODELS[number];

const MODELS_DIR = path.resolve("models");

export function getModelPath(model: WhisperModel) {
  return path.join(MODELS_DIR, `ggml-${model}.bin`);
}

export function isModelDownloaded(model: WhisperModel) {
  return fs.existsSync(getModelPath(model));
}

export async function downloadModel(model: WhisperModel, onProgress?: (progress: number) => void) {
  const url = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${model}.bin`;
  const dest = getModelPath(model);

  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  console.log(`Downloading ${model} from ${url}...`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download model: ${response.statusText}`);

  const totalSize = parseInt(response.headers.get("content-length") || "0", 10);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Failed to get response reader");

  const fileStream = fs.createWriteStream(dest);
  let downloadedSize = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    fileStream.write(value);
    downloadedSize += value.length;
    
    if (onProgress && totalSize > 0) {
      onProgress(Math.round((downloadedSize / totalSize) * 100));
    }
  }

  fileStream.end();
  console.log(`Finished downloading ${model}`);
}

export function listLocalModels() {
  if (!fs.existsSync(MODELS_DIR)) return [];
  const files = fs.readdirSync(MODELS_DIR);
  return files
    .filter(f => f.startsWith("ggml-") && f.endsWith(".bin"))
    .map(f => f.replace("ggml-", "").replace(".bin", "")) as WhisperModel[];
}
