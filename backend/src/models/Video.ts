import { Schema, model, Document } from "mongoose";
import { TranscriptSegment, TranscriptSource } from "../types";

export interface VideoDocument extends Document {
  videoId: string;
  source: TranscriptSource;
  segments: TranscriptSegment[];
  title: string;
  thumbnailUrl: string;
  createdAt: Date;
}

const segmentSchema = new Schema<TranscriptSegment>(
  {
    text: { type: String, required: true },
    start: { type: Number, required: true },
    duration: { type: Number, required: true },
  },
  { _id: false }
);

const videoSchema = new Schema<VideoDocument>({
  videoId: { type: String, required: true, unique: true },
  source: { type: String, enum: ["captions", "whisper"], required: true },
  segments: { type: [segmentSchema], required: true },
  title: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Video = model<VideoDocument>("Video", videoSchema);
