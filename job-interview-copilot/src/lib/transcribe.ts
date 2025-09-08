import { isApiKeyString } from './util';

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function transcribeWithGemini(apiKey: string, blob: Blob, mimeType = 'audio/webm'): Promise<string> {
  const base = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  const url = isApiKeyString(apiKey) ? `${base}?key=${encodeURIComponent(apiKey)}` : base;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!isApiKeyString(apiKey)) headers.Authorization = `Bearer ${apiKey}`;

  const data = await blobToBase64(blob);
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Transcribe this audio to plain text. Only return the transcript.' },
          { inlineData: { mimeType, data } },
        ],
      },
    ],
    generationConfig: { temperature: 0.2 },
  };

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Transcription failed: ${await res.text()}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n') || '';
  return text.trim();
}


