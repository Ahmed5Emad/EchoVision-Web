import { initWhisper, type WhisperContext } from "@fugood/whisper.node";
import { getModelPath, type WhisperModel } from "./models";

export class Transcriber {
  private context: WhisperContext | null = null;
  private currentModel: WhisperModel | null = null;

  async init(model: WhisperModel = "tiny.en") {
    if (this.currentModel === model && this.context) return;
    
    if (this.context) {
      console.log("Releasing previous Whisper context...");
      await this.context.release();
    }

    const modelPath = getModelPath(model);
    console.log(`Initializing Native Whisper with model: ${modelPath}`);
    
    this.context = await initWhisper({
      filePath: modelPath,
      useGpu: true,
      useFlashAttn: true
    });
    
    this.currentModel = model;
    console.log(`Native Whisper initialized with model: ${model} (CUDA 13)`);
  }

  async transcribe(audioBuffer: ArrayBuffer, language: string = "en", onNewSegments?: (text: string) => void) {
    if (!this.context) throw new Error("Transcriber not initialized");

    const start = performance.now();
    const result = this.context.transcribeData(audioBuffer, {
      language: language,
      maxThreads: 4,
      temperature: 0,
      onNewSegments: (segments) => {
        if (onNewSegments) {
          onNewSegments(segments.result);
        }
      },
    });

    const output = await result.promise;
    const end = performance.now();
    
    const audioDuration = (audioBuffer.byteLength / (16000 * 2)).toFixed(2);
    const procTime = ((end - start) / 1000).toFixed(2);
    console.log(`Native transcription (${this.currentModel}, lang: ${language}) took ${procTime}s for ${audioDuration}s of audio`);
    
    return output;
  }

  async release() {
    if (this.context) {
      await this.context.release();
      this.context = null;
      this.currentModel = null;
    }
  }
}
