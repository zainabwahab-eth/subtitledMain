import { Router, Request, Response } from "express";
import {
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptTooManyRequestError,
} from "youtube-transcript-plus";
import { fetchCaptions } from "../services/captionService";
import { fetchViaWhisper } from "../services/whisperService";
import { fetchViaSupadata } from "../services/supadataService";
import { translateSegments } from "../services/translateService";
import { getCachedVideo, cacheVideo } from "../services/videoCacheService";
import { recordHistory } from "../services/historyService";
import { TranscriptResult } from "../types";

const router = Router();

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:v=|\/)([0-9A-Za-z_-]{11}).*/, // standard watch?v= and most variants
    /^([0-9A-Za-z_-]{11})$/, // bare ID
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

router.post("/transcript", async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };

  if (!url) {
    return res.status(400).json({ error: "Missing 'url' in request body" });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({ error: "Could not extract a video ID from that URL" });
  }

  try {
    const cached = await getCachedVideo(videoId);
    let result: Pick<TranscriptResult, "source" | "segments">;

    if (cached) {
      console.log(`[transcript] Cache hit (videoId=${videoId})`);
      result = { source: cached.source, segments: cached.segments };
    } else {
      let pipelineResult: TranscriptResult;

      if (process.env.SUPADATA_API_KEY) {
        // Production path: Supadata handles everything (native captions + AI fallback).
        // No Whisper fallback — Supadata's auto mode already covers the AI generation case,
        // and yt-dlp/Whisper is blocked on our host anyway. Surface errors directly.
        pipelineResult = await fetchViaSupadata(url);
      } else {
        // Local dev path: youtube-transcript-plus → Whisper fallback.
        try {
          pipelineResult = await fetchCaptions(videoId);
          console.log(`[transcript] via captions (needsTranslation=${pipelineResult.needsTranslation})`);
        } catch (captionErr) {
          // Video-level failures mean Whisper will also fail — surface them directly.
          if (
            captionErr instanceof YoutubeTranscriptVideoUnavailableError ||
            captionErr instanceof YoutubeTranscriptTooManyRequestError
          ) {
            throw captionErr;
          }
          // Captions disabled or not available — Whisper can still transcribe.
          console.warn(
            "[transcript] Caption fetch failed:",
            captionErr instanceof Error ? captionErr.message : captionErr
          );
          console.log("[transcript] Falling back to Whisper. This may take a while...");
          pipelineResult = await fetchViaWhisper(url);
        }
      }

      // Translate only if the text isn't already in English
      if (pipelineResult.needsTranslation) {
        console.log("[transcript] Translating segments via DeepL...");
        pipelineResult.segments = await translateSegments(pipelineResult.segments);
      }

      result = { source: pipelineResult.source, segments: pipelineResult.segments };

      try {
        await cacheVideo(videoId, result.source, result.segments, pipelineResult.videoTitle, pipelineResult.videoThumbnailUrl);
      } catch (cacheErr) {
        // Don't fail the request just because caching/oEmbed lookup failed.
        console.error("[transcript] Failed to cache video:", cacheErr);
      }
    }

    try {
      await recordHistory(req.sessionId, videoId);
    } catch (historyErr) {
      console.error("[transcript] Failed to record history:", historyErr);
    }

    return res.json({
      videoId,
      source: result.source,
      segments: result.segments,
    });
  } catch (err) {
    console.error("[transcript] Failed:", err);
    return res.status(500).json({
      error: "Failed to generate transcript",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
