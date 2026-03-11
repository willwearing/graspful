"""
Kokoro TTS serverless deployment on Modal.

Exposes an OpenAI-compatible TTS endpoint.
All endpoints require proxy auth (Modal-Key + Modal-Secret headers).

Deploy: modal deploy modal/kokoro_tts.py
Test:   modal run modal/kokoro_tts.py
"""

import io
import modal

MODEL_DIR = "/models"

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("espeak-ng", "libsndfile1")
    .pip_install(
        "kokoro-onnx>=0.4.0",
        "soundfile",
        "numpy",
        "fastapi[standard]",
    )
    .run_commands(
        f"mkdir -p {MODEL_DIR} && "
        f"python -c \""
        f"import urllib.request; "
        f"urllib.request.urlretrieve("
        f"'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx', "
        f"'{MODEL_DIR}/kokoro-v1.0.onnx'); "
        f"urllib.request.urlretrieve("
        f"'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin', "
        f"'{MODEL_DIR}/voices-v1.0.bin'); "
        f"print('Models downloaded')\""
    )
)

app = modal.App("kokoro-tts", image=image)

VOICES = {
    "af_heart", "af_alloy", "af_aoede", "af_bella", "af_jessica",
    "af_kore", "af_nicole", "af_nova", "af_river", "af_sarah", "af_sky",
    "am_adam", "am_echo", "am_eric", "am_fenrir", "am_liam",
    "am_michael", "am_onyx", "am_puck", "am_santa",
    "bf_alice", "bf_emma", "bf_isabella", "bf_lily",
    "bm_daniel", "bm_fable", "bm_george", "bm_lewis",
}


@app.cls(
    gpu="T4",
    scaledown_window=120,
    min_containers=0,
    timeout=300,
)
@modal.concurrent(max_inputs=10)
class KokoroTTS:
    @modal.enter()
    def load_model(self):
        from kokoro_onnx import Kokoro
        self.kokoro = Kokoro(
            f"{MODEL_DIR}/kokoro-v1.0.onnx",
            f"{MODEL_DIR}/voices-v1.0.bin",
        )
        self.kokoro.create("Warmup.", voice="af_heart", speed=1.0, lang="en-us")
        print("Kokoro model loaded and warmed up.")

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=True, docs=True)
    def speech(self, request: dict):
        """OpenAI-compatible TTS endpoint. Requires proxy auth."""
        import soundfile as sf
        from fastapi.responses import Response

        text = request.get("input", "").strip()
        if not text:
            return Response(
                content='{"detail":"No input text provided"}',
                status_code=400, media_type="application/json",
            )

        voice = request.get("voice", "af_heart")
        if voice not in VOICES:
            return Response(
                content=f'{{"detail":"Invalid voice. Available: {sorted(VOICES)}"}}',
                status_code=400, media_type="application/json",
            )

        speed = float(request.get("speed", 1.0))
        response_format = request.get("response_format", "wav")

        samples, sample_rate = self.kokoro.create(
            text, voice=voice, speed=speed, lang="en-us"
        )

        buf = io.BytesIO()
        sf.write(buf, samples, sample_rate, format=response_format.upper())
        buf.seek(0)

        return Response(
            content=buf.read(),
            media_type=f"audio/{response_format}",
            headers={"Content-Disposition": f"inline; filename=speech.{response_format}"},
        )

    @modal.fastapi_endpoint(method="GET", requires_proxy_auth=True, docs=True)
    def health(self):
        return {"status": "ok"}

    @modal.fastapi_endpoint(method="GET", requires_proxy_auth=True, docs=True)
    def voices(self):
        return {"voices": sorted(VOICES)}


@app.local_entrypoint()
def main():
    tts = KokoroTTS()
    result = tts.speech.remote({
        "input": "Hello! This is a test of Kokoro on Modal.",
        "voice": "af_heart",
        "response_format": "wav",
    })
    print(f"Status: {result.status_code}, Size: {len(result.body)} bytes")
