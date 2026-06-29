import { History } from "../models/History";
import { Video } from "../models/Video";
import { TranscriptSource } from "../types";

export interface HistoryEntry {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  source: TranscriptSource;
  createdAt: Date;
}

/**
 * Links a video to the current session's cookie. Re-visiting a video
 * bumps its createdAt instead of creating a duplicate row.
 */
export async function recordHistory(sessionId: string, videoId: string): Promise<void> {
  await History.findOneAndUpdate(
    { sessionId, videoId },
    { sessionId, videoId, createdAt: new Date() },
    { upsert: true }
  );
}

/**
 * Returns this session's watched videos, most recent first, with just
 * enough metadata to render a history card -- no transcript segments.
 */
export async function getHistoryForSession(sessionId: string): Promise<HistoryEntry[]> {
  const entries = await History.find({ sessionId }).sort({ createdAt: -1 }).lean();
  if (entries.length === 0) return [];

  const videos = await Video.find({ videoId: { $in: entries.map((e) => e.videoId) } })
    .select("videoId title thumbnailUrl source")
    .lean();
  const videoById = new Map(videos.map((v) => [v.videoId, v]));

  return entries
    .map((entry): HistoryEntry | null => {
      const video = videoById.get(entry.videoId);
      if (!video) return null; // cache entry missing/evicted -- skip rather than show a broken card
      return {
        videoId: entry.videoId,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
        source: video.source,
        createdAt: entry.createdAt,
      };
    })
    .filter((entry): entry is HistoryEntry => entry !== null);
}
