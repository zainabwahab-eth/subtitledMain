export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptResponse {
  videoId: string;
  source: "captions" | "whisper";
  segments: TranscriptSegment[];
}

export interface HistoryEntry {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  source: "captions" | "whisper";
  createdAt: string;
}
