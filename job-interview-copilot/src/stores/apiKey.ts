import { writable } from 'svelte/store';

const LOCAL_STORAGE_KEY = 'jic_api_key';

function createApiKeyStore() {
  const initial = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
  const { subscribe, set } = writable<string>(initial);

  return {
    subscribe,
    set: (value: string) => {
      set(value);
      if (value) {
        localStorage.setItem(LOCAL_STORAGE_KEY, value);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    },
    clear: () => {
      set('');
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    },
  };
}

export const apiKeyStore = createApiKeyStore();


