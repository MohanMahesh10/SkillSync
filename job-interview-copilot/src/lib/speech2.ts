import { session, speech, logCandidate } from '../stores/stores';

export function classifyUtterance(text: string): 'interviewer' | 'candidate' {
  const t = text.trim();
  if (!t) return 'candidate';
  const lower = t.toLowerCase();
  const qWords = ['what', 'how', 'why', 'tell me about', 'can you', 'explain', 'walk me through', 'describe', 'when', 'where', 'which'];
  const isQuestion = /\?\s*$/.test(t) || qWords.some((w) => lower.startsWith(w));
  const isShortImperative = t.split(/\s+/).length <= 20 && /^(explain|describe|compare|list|name|define)\b/i.test(t);
  return isQuestion || isShortImperative ? 'interviewer' : 'candidate';
}

export function createAndroidSR(callback: (finalText: string) => void) {
  const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  if (!SR) throw new Error('SpeechRecognition not supported');
  const rec = new SR();
  rec.lang = 'en-US';
  rec.continuous = false; // Android stability
  rec.interimResults = false;
  let running = false;
  let backoff = 250;

  rec.onstart = () => session.update((s) => ({ ...s, status: 'listening' }));
  rec.onend = () => {
    session.update((s) => ({ ...s, status: 'paused' }));
    if (running) setTimeout(() => { try { rec.start(); } catch {} }, Math.min(backoff, 800));
    backoff = Math.min(backoff + 100, 800);
  };
  rec.onerror = (e: any) => {
    const code = e?.error;
    if (code === 'not-allowed' || code === 'audio-capture') {
      running = false;
    }
  };
  rec.onresult = (ev: any) => {
    let text = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) text += ev.results[i][0].transcript;
    const role = classifyUtterance(text);
    const isInterviewer = role === 'interviewer';
    speech.set({ partial: '', final: text.trim(), isInterviewer });
    if (!isInterviewer) logCandidate(text);
    callback(text.trim());
  };

  async function start() {
    try {
      // User gesture gate required
      await navigator.mediaDevices.getUserMedia({ audio: true });
      // Resume AudioContext if needed
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') await ctx.resume();
      running = true;
      backoff = 250;
      rec.start();
    } catch (e) {
      running = false;
      throw e;
    }
  }

  function stop() {
    running = false;
    try { rec.stop(); } catch {}
  }

  return { start, stop };
}


