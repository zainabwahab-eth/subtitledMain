import { TranscriptSegment } from "../types";
import dotenv from "dotenv";
dotenv.config();

const DEEPL_API_URL = process.env.DEEPL_API_URL || "https://api-free.deepl.com/v2/translate";
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

// DeepL accepts a batch of strings per request -- we chunk to stay well
// under request size limits and keep individual calls fast.
const BATCH_SIZE = 50;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function translateBatch(texts: string[]): Promise<string[]> {
  if (!DEEPL_API_KEY) {
    throw new Error("DEEPL_API_KEY is not set. Add it to your .env file.");
  }

  const params = new URLSearchParams();
  texts.forEach((t) => params.append("text", t));
  params.append("target_lang", "EN");
  // source_lang omitted on purpose -- DeepL auto-detects it, which is what
  // lets this pipeline translate FROM ANY language TO English.

  const response = await fetch(DEEPL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`DeepL request failed (${response.status}): ${errBody}`);
  }

  const data = (await response.json()) as { translations: { text: string }[] };
  return data.translations.map((t) => t.text);
}

/**
 * Translates an array of timed transcript segments to English,
 * preserving their original timing.
 */
export async function translateSegments(
  segments: TranscriptSegment[]
): Promise<TranscriptSegment[]> {
  const batches = chunk(segments, BATCH_SIZE);
  const translatedSegments: TranscriptSegment[] = [];

  for (const batch of batches) {
    const translatedTexts = await translateBatch(batch.map((s) => s.text));
    batch.forEach((seg, i) => {
      translatedSegments.push({ ...seg, text: translatedTexts[i] });
    });
  }

  return translatedSegments;
}
