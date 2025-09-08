import { writable, derived } from 'svelte/store';

export type SessionStatus = 'idle' | 'listening' | 'paused';
export const session = writable<{ status: SessionStatus; timerMin: number }>({ status: 'idle', timerMin: 15 });

export type ResumeContext = {
  rawText?: string;
  skills?: string[];
  experience?: Array<{ company?: string; role?: string; duration?: string; details?: string }>;
  education?: Array<{ institution?: string; degree?: string; year?: string }>;
  targetRole?: string;
  company?: string;
  jobDescription?: string;
  language?: string;
};
export const resumeContext = writable<ResumeContext>({});

export type Suggestion = { id: string; question: string; answer: string; confidence?: number };
export const aiSuggestions = writable<Suggestion[]>([]);
export function addSuggestion(question: string, answer: string, confidence?: number) {
  aiSuggestions.update((arr) => [{ id: `${Date.now()}`, question, answer, confidence }, ...arr].slice(0, 3));
}

export const candidateTranscript = writable<string[]>([]);
export function logCandidate(text: string) {
  if (!text?.trim()) return;
  candidateTranscript.update((arr) => [...arr, text.trim()]);
}

export const speech = writable<{ partial: string; final: string; isInterviewer: boolean }>({ partial: '', final: '', isInterviewer: false });

// Simple clock for header
export const clock = derived([], () => new Date());


