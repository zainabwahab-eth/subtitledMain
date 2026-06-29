import { spawn } from "child_process";
import path from "path";
import { TranscriptResult, TranscriptSegment } from "../types";

const PYTHON_PATH = process.env.PYTHON_PATH || "python";
const WHISPER_MODEL = process.env.WHISPER_MODEL || "base";
const SCRIPT_PATH = path.join(__dirname, "..", "..", "scripts", "whisper_translate.py");

/**
 * Fallback path for videos with no captions at all.
 * Spawns the Python script which downloads audio (yt-dlp) and runs
 * Whisper with task=translate, going straight from source audio to
 * English text -- no separate DeepL call needed for this path.
 *
 * This is slow (20s-2min+ depending on video length and model size)
 * and runs entirely on your machine, so there's no per-call cost.
 */
export function fetchViaWhisper(videoUrl: string): Promise<TranscriptResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_PATH, [SCRIPT_PATH, videoUrl, WHISPER_MODEL]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
      // Whisper/yt-dlp progress -- forward to server logs so you can
      // see it's actually working during the long wait.
      console.log(`[whisper] ${data.toString().trim()}`);
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Whisper script exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        const segments: TranscriptSegment[] = JSON.parse(stdout);
        resolve({
          source: "whisper",
          needsTranslation: false, // task=translate already produced English
          segments,
        });
      } catch (e) {
        reject(new Error(`Failed to parse Whisper output as JSON: ${stdout}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to start Whisper process: ${err.message}`));
    });
  });
}
