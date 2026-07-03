import {
  fetchTranscript,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptTooManyRequestError,
} from "youtube-transcript-plus";
import type { TranscriptResult as YtpResult, Thumbnail } from "youtube-transcript-plus";
import { TranscriptResult, TranscriptSegment } from "../types";

function mapSegments(pkgSegments: YtpResult["segments"]): TranscriptSegment[] {
  return pkgSegments.map((s) => ({
    text: s.text,
    start: s.offset, // package field is 'offset', already in seconds
    duration: s.duration,
  }));
}

function pickLargestThumbnail(thumbnails: Thumbnail[]): string | undefined {
  if (thumbnails.length === 0) return undefined;
  return [...thumbnails].sort((a, b) => b.width - a.width)[0].url;
}

/**
 * Fetches captions via youtube-transcript-plus (Innertube API).
 * Prefers an English track; falls back to any available track (sets needsTranslation).
 * Throws on video-level errors (unavailable, rate-limited) so the caller does NOT
 * fall through to Whisper — that would also fail for the same reasons.
 * Throws on disabled/no-captions so the caller CAN fall through to Whisper.
 */
export async function fetchCaptions(videoId: string): Promise<TranscriptResult> {
  let pkgResult: YtpResult;

  try {
    // Step 1: English track
    pkgResult = await fetchTranscript(videoId, { lang: "en", videoDetails: true, retries: 2 });
  } catch (err) {
    if (err instanceof YoutubeTranscriptNotAvailableLanguageError) {
      // Step 2: English isn't available — take whatever track exists
      pkgResult = await fetchTranscript(videoId, { videoDetails: true, retries: 2 });
    } else if (err instanceof YoutubeTranscriptVideoUnavailableError) {
      throw new Error(`Video unavailable or removed (videoId=${videoId})`);
    } else if (err instanceof YoutubeTranscriptTooManyRequestError) {
      throw new Error("YouTube is rate-limiting this server — try again in a few minutes");
    } else {
      // YoutubeTranscriptDisabledError, YoutubeTranscriptNotAvailableError, etc.
      // Re-throw so the route can fall back to Whisper.
      throw err;
    }
  }

  if (pkgResult.segments.length === 0) {
    throw new Error("Caption track returned no segments");
  }

  const segments = mapSegments(pkgResult.segments);
  const firstLang = pkgResult.segments[0]?.lang ?? "";
  const needsTranslation = !firstLang.startsWith("en");

  return {
    source: "captions",
    needsTranslation,
    segments,
    videoTitle: pkgResult.videoDetails.title,
    videoThumbnailUrl: pickLargestThumbnail(pkgResult.videoDetails.thumbnails),
  };
}
