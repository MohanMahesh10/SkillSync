import { writable } from 'svelte/store';

export type RoutePath = '/' | '/home' | '/interview' | '/practice';

function normalize(hash: string): RoutePath {
  const clean = (hash || '').replace(/^#/, '') || '/';
  const valid: RoutePath[] = ['/', '/home', '/interview', '/practice'];
  return (valid.includes(clean as RoutePath) ? clean : '/') as RoutePath;
}

function getHash(): RoutePath {
  return normalize(location.hash);
}

export const routeStore = writable<RoutePath>(getHash());

window.addEventListener('hashchange', () => {
  routeStore.set(getHash());
});

export function navigate(path: RoutePath) {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (location.hash !== target) location.hash = target;
  else routeStore.set(normalize(target));
}


