import { Supadata, SupadataError } from "@supadata/js";
import type { Transcript, TranscriptOrJobId } from "@supadata/js";
import { TranscriptResult, TranscriptSegment } from "../types";

const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1_000; // 5 minutes

let _client: Supadata | null = null;

function getClient(): Supadata {
  if (!_client) {
    _client = new Supadata({ apiKey: process.env.SUPADATA_API_KEY! });
  }
  return _client;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function translateError(err: SupadataError): Error {
  switch (err.error) {
    case "not-found":
      return new Error("Video not found or is private");
    case "unauthorized":
      return new Error("Video requires authentication or is region-restricted");
    case "transcript-unavailable":
      return new Error("No transcript could be obtained for this video");
    case "upgrade-required":
      return new Error("Supadata account quota exceeded");
    default:
      return new Error(err.details || err.message);
  }
}

async function request(client: Supadata, videoUrl: string): Promise<TranscriptOrJobId> {
  return client.transcript({ url: videoUrl, lang: "en", text: false, mode: "auto" });
}

async function pollJob(jobId: string): Promise<Transcript> {
  const client = getClient();
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const job = await client.transcript.getJobStatus(jobId);

    if (job.status === "completed") {
      if (!job.result) throw new Error("Supadata job completed with no result");
      return job.result;
    }
    if (job.status === "failed") {
      throw new Error(job.error?.message ?? "Supadata transcript job failed");
    }
    // queued | active — keep waiting
  }

  throw new Error("Transcript job timed out after 5 minutes — try again later");
}

function mapTranscript(transcript: Transcript): { segments: TranscriptSegment[]; needsTranslation: boolean } {
  const { content, lang } = transcript;

  if (!Array.isArray(content) || content.length === 0) {
    throw new Error("No speech detected in this video");
  }

  const segments: TranscriptSegment[] = content.map((c) => ({
    text: c.text,
    start: c.offset / 1000,    // Supadata returns milliseconds — convert to seconds
    duration: c.duration / 1000,
  }));

  return { segments, needsTranslation: lang !== "en" };
}

export async function fetchViaSupadata(videoUrl: string): Promise<TranscriptResult> {
  const client = getClient();

  let raw: TranscriptOrJobId;

  try {
    raw = await request(client, videoUrl);
  } catch (err) {
    if (!(err instanceof SupadataError)) throw err;

    if (err.error === "limit-exceeded") {
      // Rate-limited — wait 1s and retry once
      console.warn("[transcript] Supadata rate-limited, retrying in 1s...");
      await sleep(1_000);
      try {
        raw = await request(client, videoUrl);
      } catch (retryErr) {
        if (retryErr instanceof SupadataError) {
          throw retryErr.error === "limit-exceeded"
            ? new Error("Service is busy, try again in a moment")
            : translateError(retryErr);
        }
        throw retryErr;
      }
    } else {
      throw translateError(err);
    }
  }

  // Resolve async job if needed
  let transcript: Transcript;
  if ("jobId" in raw) {
    console.log(`[transcript] Supadata async job (jobId=${raw.jobId}), polling...`);
    transcript = await pollJob(raw.jobId);
  } else {
    transcript = raw;
  }

  const { segments, needsTranslation } = mapTranscript(transcript);

  // Note: @supadata/js does not expose HTTP response headers, so x-billable-requests
  // cannot be logged from the SDK — monitor credit usage in the Supadata dashboard.
  console.log(`[transcript] via supadata (lang=${transcript.lang}, segments=${segments.length})`);

  return { source: "supadata", needsTranslation, segments };
}
