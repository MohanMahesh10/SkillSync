import { writable } from 'svelte/store';

export type QAItem = {
  id: string;
  question: string;
  answer: string;
  ts: number;
};

function createHistoryStore(limit: number = 3) {
  const { subscribe, update, set } = writable<QAItem[]>([]);

  return {
    subscribe,
    add: (question: string, answer: string) =>
      update((items) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const next: QAItem[] = [{ id, question, answer, ts: Date.now() }, ...items];
        return next.slice(0, limit);
      }),
    clear: () => set([]),
  };
}

export const historyStore = createHistoryStore(3);


