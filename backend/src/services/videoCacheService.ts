import { Video, VideoDocument } from "../models/Video";
import { fetchVideoMetadata } from "./oembedService";
import { TranscriptSegment, TranscriptSource } from "../types";

export function getCachedVideo(videoId: string): Promise<VideoDocument | null> {
  return Video.findOne({ videoId });
}

/**
 * Persists a finished (already-translated) transcript so future requests
 * for the same videoId skip the caption/Whisper pipeline entirely. Fetches
 * title/thumbnail once via oEmbed since the pipeline doesn't otherwise need it.
 */
export async function cacheVideo(
  videoId: string,
  source: TranscriptSource,
  segments: TranscriptSegment[]
): Promise<void> {
  const metadata = await fetchVideoMetadata(videoId);

  await Video.findOneAndUpdate(
    { videoId },
    {
      videoId,
      source,
      segments,
      title: metadata.title,
      thumbnailUrl: metadata.thumbnailUrl,
    },
    { upsert: true }
  );
}
