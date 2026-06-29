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
}
