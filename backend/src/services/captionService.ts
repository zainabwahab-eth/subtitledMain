import { YoutubeTranscript } from "youtube-transcript";
import { TranscriptResult, TranscriptSegment } from "../types";

function toSegments(raw: { text: string; offset: number; duration: number }[]): TranscriptSegment[] {
  return raw.map((r) => ({
    text: r.text,
    start: r.offset / 1000,
    duration: r.duration / 1000,
  }));
}

/**
 * Tries to fetch captions that are already in English first (no translation needed).
 * Falls back to whatever caption track exists in the video's original language.
 * Throws if no captions exist at all -- caller should fall back to Whisper.
 */
export async function fetchCaptions(videoId: string): Promise<TranscriptResult> {
  // 1. Try an English track directly -- cheapest, no translation step needed
  try {
    const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
    return {
      source: "captions",
      needsTranslation: false,
      segments: toSegments(raw),
    };
  } catch {
    // no English track, fall through
  }

  // 2. Fall back to the default/original-language track
  const raw = await YoutubeTranscript.fetchTranscript(videoId);
  return {
    source: "captions",
    needsTranslation: true,
    segments: toSegments(raw),
  };
}
