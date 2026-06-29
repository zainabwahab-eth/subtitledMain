# ---- Build stage: compile TypeScript ----
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage ----
FROM node:20-slim

WORKDIR /app

# System deps needed by the Whisper fallback path:
# - python3/pip to run scripts/whisper_translate.py
# - ffmpeg for yt-dlp's audio extraction and Whisper's audio decoding
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Python deps (yt-dlp + openai-whisper). Debian's Python is "externally
# managed" (PEP 668), so --break-system-packages is required here --
# this is an isolated container, not a shared system, so it's safe.
COPY scripts/requirements.txt ./scripts/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r scripts/requirements.txt

# Pre-download the Whisper model at build time, not request time.
# Without this, the FIRST video that needs the Whisper fallback in
# production would stall for a while downloading model weights.
ARG WHISPER_MODEL=base
RUN python3 -c "import whisper; whisper.load_model('${WHISPER_MODEL}')"

# Node production dependencies only (no ts-node-dev etc.)
COPY package*.json ./
RUN npm install --omit=dev

# Compiled app + the Python helper script
COPY --from=builder /app/dist ./dist
COPY scripts ./scripts

ENV NODE_ENV=production
ENV PYTHON_PATH=python3

# Render injects PORT at runtime; server.ts already reads process.env.PORT
EXPOSE 3001

CMD ["node", "dist/server.js"]