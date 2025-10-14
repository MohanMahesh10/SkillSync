// Minimal Gemini API helper using fetch with Bearer token

import { isApiKeyString } from './util';
import { GoogleGenerativeAI } from '@google/genai';

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

export async function generateText({ apiKey, model = 'gemini-2.5-flash', prompt, temperature = 0.7 }: GenerateOptions): Promise<{ text: string; confidence?: number }> {
  const client = new GoogleGenerativeAI({ apiKey });
  const res = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature },
  });
  const text = (res as any)?.text || (res as any)?.response?.text || '';
  return { text, confidence: undefined };
}


