export interface VideoMetadata {
  title: string;
  thumbnailUrl: string;
}

/**
 * YouTube's oEmbed endpoint needs no API key and gives us title +
 * thumbnail for the history list without pulling in the full Data API.
 */
export async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata> {
  const watchUrl = `https://youtube.com/watch?v=${videoId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;

  const response = await fetch(oembedUrl);
  if (!response.ok) {
    throw new Error(`oEmbed request failed (${response.status})`);
  }

  const data = (await response.json()) as { title: string; thumbnail_url: string };
  return { title: data.title, thumbnailUrl: data.thumbnail_url };
}
