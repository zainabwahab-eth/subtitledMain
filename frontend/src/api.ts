import { HistoryEntry, TranscriptResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export async function fetchTranscript(url: string): Promise<TranscriptResponse> {
  const response = await fetch(`${API_BASE}/api/transcript`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // sends/receives the anonymous session cookie
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.details || body.error || `Request failed (${response.status})`);
  }

  return response.json();
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const response = await fetch(`${API_BASE}/api/history`, {
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.details || body.error || `Request failed (${response.status})`);
  }

  const data = await response.json();
  return data.history;
}

export function extractVideoId(url: string): string | null {
  const patterns = [/(?:v=|\/)([0-9A-Za-z_-]{11}).*/, /^([0-9A-Za-z_-]{11})$/];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
