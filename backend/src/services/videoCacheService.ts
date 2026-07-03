import { Video, VideoDocument } from "../models/Video";
import { fetchVideoMetadata } from "./oembedService";
import { TranscriptSegment, TranscriptSource } from "../types";

export function getCachedVideo(videoId: string): Promise<VideoDocument | null> {
  return Video.findOne({ videoId });
}

/**
 * Persists a finished (already-translated) transcript so future requests
 * for the same videoId skip the caption/Whisper pipeline entirely.
 * When prefetchedTitle / prefetchedThumbnailUrl are supplied (captions path),
 * oEmbed is skipped entirely. Missing values fall back to an oEmbed call
 * (Whisper path, or when youtube-transcript-plus returns no thumbnail).
 */
export async function cacheVideo(
  videoId: string,
  source: TranscriptSource,
  segments: TranscriptSegment[],
  prefetchedTitle?: string,
  prefetchedThumbnailUrl?: string,
): Promise<void> {
  let title = prefetchedTitle;
  let thumbnailUrl = prefetchedThumbnailUrl;

  if (!title || !thumbnailUrl) {
    const metadata = await fetchVideoMetadata(videoId);
    title ??= metadata.title;
    thumbnailUrl ??= metadata.thumbnailUrl;
  }

  await Video.findOneAndUpdate(
    { videoId },
    { videoId, source, segments, title, thumbnailUrl },
    { upsert: true }
  );
}
