import { writable } from 'svelte/store';

export type ResumeData = {
  rawText: string;
  skills: string[];
  experience: Array<{ company: string; role: string; duration?: string; details?: string }>; 
  education: Array<{ institution: string; degree?: string; year?: string }>; 
};

export const resumeStore = writable<ResumeData | null>(null);


