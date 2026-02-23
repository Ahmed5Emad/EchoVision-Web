import { serve } from "bun";
import index from "./index.html";
import { Transcriber } from "./transcriber";
import { AVAILABLE_MODELS, isModelDownloaded, downloadModel, listLocalModels, type WhisperModel } from "./models";

const transcriber = new Transcriber();

// Initialize with a default model if it exists
if (isModelDownloaded("tiny.en")) {
  await transcriber.init("tiny.en");
}

const server = serve({
  routes: {
    "/*": index,
    "/ws": async (req) => {
      if (server.upgrade(req, { 
        data: { 
          audioBuffer: new Int16Array(0), 
          isTranscribing: false,
          language: "en" 
        } 
      })) {
        return undefined;
      }
      return new Response("Upgrade failed", { status: 400 });
    },
  },

  websocket: {
    open(ws) {
      console.log("WebSocket opened");
      // Send initial state
      ws.send(JSON.stringify({ 
        type: "models", 
        available: AVAILABLE_MODELS, 
        downloaded: listLocalModels() 
      }));
    },
    async message(ws, message) {
      const data = ws.data as { audioBuffer: Int16Array; isTranscribing: boolean; language: string };
      
      if (typeof message === "string") {
        const payload = JSON.parse(message);
        
        if (payload.type === "reset") {
          data.audioBuffer = new Int16Array(0);
          ws.send(JSON.stringify({ type: "reset" }));
        } 
        else if (payload.type === "set_language") {
          data.language = payload.language || "en";
          console.log(`Language set to: ${data.language}`);
        }
        else if (payload.type === "download_model") {
// ... existing model code ...
          const model = payload.model as WhisperModel;
          try {
            ws.send(JSON.stringify({ type: "download_start", model }));
            await downloadModel(model, (progress) => {
              ws.send(JSON.stringify({ type: "download_progress", model, progress }));
            });
            ws.send(JSON.stringify({ type: "download_complete", model, downloaded: listLocalModels() }));
          } catch (err) {
            ws.send(JSON.stringify({ type: "error", message: `Download failed: ${err}` }));
          }
        }
        else if (payload.type === "switch_model") {
          const model = payload.model as WhisperModel;
          if (!isModelDownloaded(model)) {
            ws.send(JSON.stringify({ type: "error", message: "Model not downloaded" }));
            return;
          }
          try {
            ws.send(JSON.stringify({ type: "switching_model", model }));
            await transcriber.init(model);
            ws.send(JSON.stringify({ type: "switched_model", model }));
          } catch (err) {
            ws.send(JSON.stringify({ type: "error", message: `Switch failed: ${err}` }));
          }
        }
        return;
      }

      // Audio processing
      const chunk = new Int16Array(message.buffer, message.byteOffset, message.byteLength / 2);
      const newBuffer = new Int16Array(data.audioBuffer.length + chunk.length);
      newBuffer.set(data.audioBuffer);
      newBuffer.set(chunk, data.audioBuffer.length);
      data.audioBuffer = newBuffer;

      const MAX_SAMPLES = 16000 * 30; // 30s rolling window
      if (data.audioBuffer.length > MAX_SAMPLES) {
        data.audioBuffer = data.audioBuffer.slice(-MAX_SAMPLES);
      }

      if (!data.isTranscribing && data.audioBuffer.length >= 16000 * 1.5) {
        data.isTranscribing = true;
        try {
          const currentBuffer = data.audioBuffer.slice();
          const result = await transcriber.transcribe(currentBuffer.buffer, data.language, (text) => {
            ws.send(JSON.stringify({ type: "partial", text }));
          });
          ws.send(JSON.stringify({ type: "final", text: result.result }));
        } catch (err) {
          console.error("Transcription error:", err);
        } finally {
          data.isTranscribing = false;
        }
      }
    },
    close(ws) {
      console.log("WebSocket closed");
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
