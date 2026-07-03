export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export type TranscriptSource = "captions" | "whisper";

export interface TranscriptResult {
  source: TranscriptSource;
  needsTranslation: boolean; // true if captions are NOT already in English
  segments: TranscriptSegment[];
  // Set by captionService when the package returns videoDetails; undefined on Whisper path.
  videoTitle?: string;
  videoThumbnailUrl?: string;
}
