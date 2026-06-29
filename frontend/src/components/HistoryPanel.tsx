import { useEffect, useState } from "react";
import { fetchHistory } from "../api";
import { HistoryEntry } from "../types";

type Status = "loading" | "error" | "ready";

interface Props {
  onSelect: (videoId: string) => void;
  onClose: () => void;
}

export default function HistoryPanel({ onSelect, onClose }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetchHistory()
      .then((data) => {
        if (cancelled) return;
        setEntries(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load history");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="history-panel">
      <div className="history-panel-header">
        <span>HISTORY</span>
        <button type="button" className="history-close" onClick={onClose} aria-label="Close history">
          ×
        </button>
      </div>

      {status === "loading" && <p className="history-empty">Loading...</p>}
      {status === "error" && <p className="history-empty error">{error}</p>}
      {status === "ready" && entries.length === 0 && (
        <p className="history-empty">No videos translated yet.</p>
      )}

      <div className="history-list">
        {entries.map((entry) => (
          <button
            key={entry.videoId}
            type="button"
            className="history-card"
            onClick={() => onSelect(entry.videoId)}
          >
            <img src={entry.thumbnailUrl} alt="" className="history-thumb" />
            <div className="history-card-info">
              <span className="history-title">{entry.title}</span>
              <span className="history-source">
                {entry.source === "captions" ? "CAPTIONS" : "WHISPER"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
