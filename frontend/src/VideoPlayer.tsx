import { TranscriptSegment } from "./types";
import { useYouTubePlayer } from "./useYouTubePlayer";

interface Props {
  videoId: string;
  segments: TranscriptSegment[];
}

function findActiveSegment(segments: TranscriptSegment[], time: number): TranscriptSegment | null {
  return (
    segments.find((seg) => time >= seg.start && time < seg.start + seg.duration) ?? null
  );
}

export default function VideoPlayer({ videoId, segments }: Props) {
  const { currentTime } = useYouTubePlayer("yt-player", videoId);
  const activeSegment = findActiveSegment(segments, currentTime);

  return (
    <div className="player-wrapper">
      <div id="yt-player" />
      {activeSegment && <div className="subtitle-overlay">{activeSegment.text}</div>}
    </div>
  );
}
