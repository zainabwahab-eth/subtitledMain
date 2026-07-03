# subtitled. — YouTube → English Subtitle Translator

Paste a YouTube URL, get synced English subtitles — whether the video
already has captions or not.

## How it works

### Production (Render / any deployed host)

1. **Cache check first.** Every translated video is stored in MongoDB
   keyed by video ID. If it's already been processed by anyone, the cached
   transcript is returned instantly and nothing below runs.
2. **Supadata transcript.** The backend calls the
   [Supadata](https://supadata.ai) API with `mode=auto` — it returns native
   captions when they exist, or an AI-generated transcript when they don't,
   all in one call. No Whisper or yt-dlp needed on the server.
3. **Translation.** If the transcript isn't already in English, it's sent
   to DeepL for translation before caching and returning.

### Local development (no `SUPADATA_API_KEY`)

1. **Cache check** (same as above).
2. **youtube-transcript-plus.** Tries the English caption track first via
   YouTube's Innertube API; falls back to any available track if English
   isn't present (non-English sets `needsTranslation`).
3. **Whisper fallback.** If no captions exist at all, the backend downloads
   the audio with `yt-dlp` and runs OpenAI Whisper locally with
   `task=translate`, which transcribes *and* translates in one step.
4. **Translation.** Same DeepL step if needed.

### Frontend

The React app embeds the video via the YouTube IFrame Player API and
overlays the matching subtitle line based on the player's current time
(polled every 250ms — there's no event-driven time API on the iframe player).

### Caching & history

- On first visit, the backend sets an anonymous, httpOnly "remember this
  device" cookie — no login involved.
- The transcript cache (MongoDB collection `videos`) is **global** —
  shared across everyone using the app. Video title and thumbnail are
  fetched via YouTube's oEmbed endpoint when a video is first cached (on
  the local dev path, title also comes from the youtube-transcript-plus
  `videoDetails` response, avoiding an extra oEmbed call).
- Watch history (collection `history`) is **per-session** — it links your
  device's cookie to the videoIds you've translated, most recent first,
  and powers the HISTORY panel in the UI. Re-translating a video hits the
  cache and re-surfaces it in your history instantly. History cards scroll
  horizontally inside the panel.

---

## Project structure

```
yt-translator/
├── backend/        Express + TypeScript API
│   ├── scripts/    Python helper for the Whisper fallback (local dev only)
│   └── src/
│       └── services/
│           ├── captionService.ts    youtube-transcript-plus (local dev)
│           ├── supadataService.ts   Supadata SDK (production)
│           ├── whisperService.ts    Whisper fallback (local dev)
│           ├── translateService.ts  DeepL
│           ├── videoCacheService.ts MongoDB transcript cache
│           └── historyService.ts    Per-session watch history
└── frontend/       React + Vite app
```

---

## Setup

### 1. Backend

```bash
cd backend
npm install
```

Edit `.env` — the values you need depend on how you're running it:

**MongoDB** (required in all cases — the backend won't start without it):

- Local: `docker run -d -p 27017:27017 --name yt-translator-mongo mongo:7`
  or install MongoDB Community Server directly.
- Deployed: use a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
  cluster and paste the connection string as `MONGODB_URI`.

**Supadata** (production / Render only):

Set `SUPADATA_API_KEY` to your key from [supadata.ai](https://supadata.ai).
When this variable is set, the backend uses Supadata for all transcript
fetching — no Python, ffmpeg, yt-dlp, or Whisper needed. When it's unset,
the local dev path (youtube-transcript-plus → Whisper) is used instead.

**DeepL** (both paths, only when a transcript isn't already in English):

Set `DEEPL_API_KEY`. Free tier keys use `api-free.deepl.com`; update
`DEEPL_API_URL` accordingly.

**Python / Whisper** (local dev only, ignored when `SUPADATA_API_KEY` is set):

```bash
pip install -r scripts/requirements.txt
```

You'll also need **ffmpeg** and the `yt-dlp` CLI on your PATH:

```powershell
winget install ffmpeg
pip install yt-dlp
```

Set `PYTHON_PATH=python` (Windows) or `python3` (Mac/Linux) and optionally
`WHISPER_MODEL` (`tiny` / `base` / `small` / `medium` / `large`, default `base`).

Run the backend:

```bash
npm run dev
```

Should print `YT Translator backend running on http://localhost:3001`.

### 2. Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

If your frontend runs somewhere other than `http://localhost:5173`, update
`FRONTEND_ORIGIN` in `.env` — it must match exactly for the session cookie
to flow cross-domain.

### 3. Docker (backend)

`backend/Dockerfile` builds a self-contained image with Python, ffmpeg,
yt-dlp, and the Whisper model baked in — mainly useful for testing the
Whisper path in a container, or for deploying to hosts where you want the
Python fallback. For Render deployments using Supadata you don't need
the Python toolchain at all (the Supadata path is pure Node).

```bash
docker build -t yt-translator-backend ./backend
docker run -p 3001:3001 --env-file backend/.env yt-translator-backend
```

Two things to get right when running in a container:
- `MONGODB_URI` must point somewhere reachable from *inside* the
  container — `localhost` there is the container itself, not your host.
  An Atlas connection string works; a bare local `mongod` on your host
  does not.
- On Render, leave `PORT` unset — the platform injects it at runtime.

---

## Usage

1. Paste a YouTube URL into the input and hit **TRANSLATE**.
2. **With Supadata (production):** resolves in a few seconds for any video
   regardless of whether it has native captions — Supadata's `auto` mode
   handles both.
3. **With Whisper (local dev, no captions):** the backend downloads audio
   and runs Whisper locally — expect 20 seconds to a couple of minutes
   depending on video length and `WHISPER_MODEL` size.
4. Hit **HISTORY** to see every video you've translated on this device.
   Cards scroll horizontally. Clicking one reloads instantly from cache.
