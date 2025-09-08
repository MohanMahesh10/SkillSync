// Minimal Gemini API helper using fetch with Bearer token

import { isApiKeyString } from './util';

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const base = 'https://generativelanguage.googleapis.com/v1beta/models';
    const url = isApiKeyString(apiKey) ? `${base}?key=${encodeURIComponent(apiKey)}` : base;
    const headers = isApiKeyString(apiKey)
      ? {}
      : { Authorization: `Bearer ${apiKey}` };
    const res = await fetch(url, { headers });
    return res.ok;
  } catch {
    return false;
  }
}

type GenerateOptions = {
  apiKey: string;
  model?: string;
  prompt: string;
  temperature?: number;
};

export async function generateText({ apiKey, model = 'gemini-1.5-flash', prompt, temperature = 0.7 }: GenerateOptions): Promise<{ text: string; confidence?: number }> {
  const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const url = isApiKeyString(apiKey) ? `${base}?key=${encodeURIComponent(apiKey)}` : base;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: { temperature },
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!isApiKeyString(apiKey)) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Gemini error: ${msg}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n') || '';
  const confidence = data?.candidates?.[0]?.safetyRatings?.[0]?.probability || undefined;
  return { text, confidence };
}


