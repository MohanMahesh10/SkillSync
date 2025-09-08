import { isApiKeyString } from './util';

type Callbacks = {
  onChunk: (partialText: string) => void;
  onError?: (message: string) => void;
};

export function createChunkedTranscriber(apiKey: string, callbacks: Callbacks) {
  let mediaRecorder: MediaRecorder | null = null;
  let running = false;
  let timer: number | null = null;
  let mimeType = 'audio/webm';

  function pickMimeType(): string {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];
    for (const c of candidates) {
      try {
        if ((window as any).MediaRecorder && (MediaRecorder as any).isTypeSupported?.(c)) return c;
      } catch {}
    }
    return 'audio/webm';
  }

  async function transcribe(blob: Blob): Promise<string> {
    // Reuse transcribe logic inline to avoid extra import weight
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    const data = btoa(binary);

    const base = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    const url = isApiKeyString(apiKey) ? `${base}?key=${encodeURIComponent(apiKey)}` : base;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!isApiKeyString(apiKey)) headers.Authorization = `Bearer ${apiKey}`;
    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Transcribe this audio chunk. Return only text.' },
            { inlineData: { mimeType, data } },
          ],
        },
      ],
      generationConfig: { temperature: 0.1 },
    };
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n') || '';
    return text.trim();
  }

  return {
    start: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
          } as MediaTrackConstraints,
        });
        mimeType = pickMimeType();
        mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorder.ondataavailable = async (e) => {
          if (!e.data || e.data.size < 1000) return;
          try {
            const text = await transcribe(e.data);
            if (text) callbacks.onChunk(text);
          } catch (err: any) {
            callbacks.onError?.(err?.message || 'Transcription failed');
          }
        };
        mediaRecorder.start(1000); // 1s chunks for faster perceived latency
        running = true;
      } catch (e: any) {
        callbacks.onError?.(e?.message || 'Mic permission error');
      }
    },
    stop: () => {
      running = false;
      try { mediaRecorder?.stop(); } catch {}
      mediaRecorder = null;
      if (timer) clearInterval(timer);
    },
  };
}


