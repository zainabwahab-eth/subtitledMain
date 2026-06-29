import { Schema, model, Document } from "mongoose";

export interface HistoryDocument extends Document {
  sessionId: string;
  videoId: string;
  createdAt: Date;
}

const historySchema = new Schema<HistoryDocument>({
  sessionId: { type: String, required: true },
  videoId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// One entry per (session, video) -- rewatching bumps createdAt instead of duplicating.
historySchema.index({ sessionId: 1, videoId: 1 }, { unique: true });
// Supports "most recent first" lookups for a given session.
historySchema.index({ sessionId: 1, createdAt: -1 });

export const History = model<HistoryDocument>("History", historySchema);
