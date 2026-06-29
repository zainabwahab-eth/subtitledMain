import { useState } from "react";
import { fetchTranscript, extractVideoId } from "./api";
import { TranscriptSegment } from "./types";
import VideoPlayer from "./VideoPlayer";
import HistoryPanel from "./components/HistoryPanel";

type Status = "idle" | "loading" | "error" | "ready";

export default function App() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [source, setSource] = useState<"captions" | "whisper" | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  async function loadTranscript(rawUrl: string) {
    setStatus("loading");
    setError("");

    try {
      const result = await fetchTranscript(rawUrl);
      setVideoId(result.videoId);
      setSegments(result.segments);
      setSource(result.source);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    const id = extractVideoId(url.trim());
    if (!id) {
      setStatus("error");
      setError("Couldn't find a valid video ID in that URL.");
      return;
    }

    await loadTranscript(url.trim());
  }

  function handleSelectHistory(id: string) {
    setShowHistory(false);
    setUrl(`https://www.youtube.com/watch?v=${id}`);
    loadTranscript(id);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <h1>
            subtitled<span className="dot">.</span>
          </h1>
          <button
            type="button"
            className="history-toggle"
            onClick={() => setShowHistory((open) => !open)}
          >
            {showHistory ? "CLOSE" : "HISTORY"}
          </button>
        </div>
        <p>Paste a YouTube link. Get English subtitles, even if the original has none.</p>
      </header>

      {showHistory && (
        <HistoryPanel onSelect={handleSelectHistory} onClose={() => setShowHistory(false)} />
      )}

      <form className="url-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={status === "loading"}
        />
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "WORKING..." : "TRANSLATE"}
        </button>
      </form>

      {status === "loading" && (
        <div className="status-banner">
          <span className="pulse" />
          Checking for captions first — if there are none, this falls back to
          downloading audio and transcribing it, which can take a minute or two.
        </div>
      )}

      {status === "error" && <div className="status-banner error">{error}</div>}

      {status === "ready" && videoId && (
        <>
          <VideoPlayer videoId={videoId} segments={segments} />
          <span className="source-tag">
            SOURCE: <span className="accent">{source === "captions" ? "YOUTUBE CAPTIONS" : "WHISPER (AUDIO)"}</span>
          </span>
        </>
      )}
    </div>
  );
}
