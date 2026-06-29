"""
whisper_translate.py

Used as a fallback when a YouTube video has no captions available.
Downloads the audio track with yt-dlp, then runs Whisper with
task="translate" so it goes directly from source-language audio
to English text (works great for Chinese, Spanish, etc -> English).

Usage:
    python whisper_translate.py <youtube_url> <model_size>

Outputs a JSON array of timed segments to stdout:
    [{ "text": "...", "start": 0.0, "duration": 3.2 }, ...]

All progress/log output goes to stderr so stdout stays pure JSON.
"""

import sys
import json
import tempfile
import os
import subprocess


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def download_audio(url: str, out_dir: str) -> str:
    out_template = os.path.join(out_dir, "audio.%(ext)s")
    log(f"Downloading audio for {url} ...")
    subprocess.run(
        [
            "yt-dlp",
            "-x",
            "--audio-format", "mp3",
            "-o", out_template,
            url,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    audio_path = os.path.join(out_dir, "audio.mp3")
    if not os.path.exists(audio_path):
        raise RuntimeError("yt-dlp did not produce an audio file")
    return audio_path


def transcribe_and_translate(audio_path: str, model_size: str):
    import whisper  # imported here so --help/arg errors fail fast without loading the model

    log(f"Loading Whisper model '{model_size}' (first run downloads it, may take a while)...")
    model = whisper.load_model(model_size)

    log("Running transcription + translation (task=translate)...")
    result = model.transcribe(audio_path, task="translate")

    segments = []
    for seg in result.get("segments", []):
        segments.append({
            "text": seg["text"].strip(),
            "start": seg["start"],
            "duration": seg["end"] - seg["start"],
        })
    return segments


def main():
    if len(sys.argv) < 2:
        log("Usage: python whisper_translate.py <youtube_url> [model_size]")
        sys.exit(1)

    url = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"

    with tempfile.TemporaryDirectory() as tmp_dir:
        try:
            audio_path = download_audio(url, tmp_dir)
            segments = transcribe_and_translate(audio_path, model_size)
            # Only the final JSON goes to stdout
            print(json.dumps(segments))
        except subprocess.CalledProcessError as e:
            log(f"yt-dlp failed: {e.stderr.decode() if e.stderr else e}")
            sys.exit(1)
        except Exception as e:
            log(f"Error: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
