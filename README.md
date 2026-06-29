# subtitled. — YouTube → English Subtitle Translator

Paste a YouTube URL, get synced English subtitles — whether the video
already has captions or not.

## How it works

1. **Cache check first.** Every translated video is cached in MongoDB
   keyed by video ID. If it's already been translated by anyone, the
   cached transcript is returned instantly and none of the steps below run.
2. **Backend checks for existing captions** (`youtube-transcript`). If found
   in English, it's used directly. If found in another language, it's sent
   to DeepL for translation.
3. **No captions at all?** Backend falls back to downloading the audio
   (`yt-dlp`) and running it through OpenAI Whisper locally with
   `task=translate`, which transcribes *and* translates to English in one
   step — works for any source language.
4. **Frontend** embeds the video via the YouTube IFrame Player API and
   overlays the matching subtitle line based on the player's current time.

### Caching & history

- On first visit, the backend sets an anonymous, httpOnly "remember this
  device" cookie — no login involved.
- The transcript cache (MongoDB, collection `videos`) is **global** —
  shared across everyone using the app, since a transcript for a given
  video doesn't depend on who asked for it. Title + thumbnail are fetched
  once via YouTube's oEmbed endpoint when a video is first cached.
- Watch history (collection `history`) is **per-session** — it links your
  device's cookie to the videoIds you've translated, most recent first,
  and powers the HISTORY panel in the UI. Re-translating a video you've
  already seen hits the cache and re-surfaces it in your history instantly.

## Project structure

```
yt-translator/
├── backend/        Express + TypeScript API
│   ├── scripts/    Python helper for the Whisper fallback
│   └── src/
└── frontend/       React + Vite app
```

---

## Setup

### 1. Backend

```bash
cd backend
npm install
```

Open `.env` and paste in your DeepL API key.

**MongoDB** (powers the transcript cache + watch history — the backend
won't start without it):

- Local: install MongoDB Community Server, or run it in Docker —
  `docker run -d -p 27017:27017 --name yt-translator-mongo mongo:7`
- Or use a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster.

Either way, set `MONGODB_URI` in `.env` to point at it (defaults to
`mongodb://localhost:27017/yt-translator`).

If your frontend runs anywhere other than `http://localhost:5173`, update
`FRONTEND_ORIGIN` in `.env` too — it has to match exactly for the session
cookie to be sent.

**Python dependencies** (only needed for the Whisper fallback — videos with
existing captions never touch this):

```bash
pip install -r scripts/requirements.txt
```

You'll also need **ffmpeg** on your PATH:

```powershell
winget install ffmpeg
```

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

### 3. Docker (backend, production)

`backend/Dockerfile` builds a self-contained image for deploying the
backend (e.g. to Render or any container host) — you don't need this for
local development, `npm run dev` is simpler. It's a multi-stage build that
compiles the TypeScript, then bakes Python, ffmpeg, yt-dlp, and Whisper
itself into the runtime image so the Whisper fallback works with no extra
setup on the host.

```bash
docker build -t yt-translator-backend ./backend
```

The image pre-downloads the Whisper model at build time so the first
Whisper request in production doesn't stall on a model download. It
defaults to `base`; override with `--build-arg WHISPER_MODEL=small` (etc.)
to bake in a different size.

Run it with your real env vars:

```bash
docker run -p 3001:3001 --env-file backend/.env yt-translator-backend
```

Two things to get right when running in a container:
- `MONGODB_URI` must point somewhere reachable from *inside* the
  container — `localhost` there is the container itself, not your host.
  An Atlas connection string (or a Mongo container on the same Docker
  network) works; a bare local `mongod` on your host does not.
- On platforms like Render, leave `PORT` unset — the platform injects it
  at runtime and `server.ts` already reads `process.env.PORT`.

---

## Usage

1. Paste a YouTube URL into the input.
2. Hit Translate.
3. If the video has captions, this resolves in a couple seconds.
4. If not, the backend downloads audio + runs Whisper — expect 20s to a
   couple minutes depending on video length and which Whisper model size
   you set in `.env` (`WHISPER_MODEL`). `base` is the default and a
   reasonable speed/accuracy tradeoff; `small` or `medium` are more
   accurate but slower.
5. Hit the HISTORY button to see every video you've translated on this
   device. Clicking one reloads it instantly from cache.
