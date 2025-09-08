<script lang="ts">
  import { routeStore, navigate } from './lib/router';
  import ThemeToggle from './components/ThemeToggle.svelte';
  import { apiKeyStore } from './stores/apiKey';
  import { onMount } from 'svelte';
  import Entry from './pages/Entry.svelte';
  import Home from './pages/Home.svelte';
  import Interview from './pages/Interview.svelte';
  import Practice from './pages/Practice.svelte';

  let hasKey = false;
  const unsubscribe = apiKeyStore.subscribe((v) => (hasKey = !!v));
  onMount(() => {
    // Always land on API validation page on fresh load
    navigate('/');
    return () => unsubscribe();
  });
</script>

<div class="min-h-screen flex flex-col">
  <header class="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-gray-900/70 shadow-sm">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <a href="#/home" class="font-semibold text-lg">Job Interview Copilot</a>
      <nav class="flex items-center gap-3">
        <a href="#/" class="hover:underline">API Key</a>
        {#if hasKey}
          <a href="#/home" class="hover:underline">Home</a>
          <a href="#/interview" class="hover:underline">Interview</a>
          <a href="#/practice" class="hover:underline">Practice</a>
        {/if}
        <ThemeToggle />
      </nav>
    </div>
  </header>

  <main class="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
    {#if $routeStore === '/'}
      <Entry />
    {:else if !hasKey}
      <Entry />
    {:else}
      {#if $routeStore === '/' || $routeStore === '/home'}
        <Home />
      {:else if $routeStore === '/interview'}
        <Interview />
      {:else if $routeStore === '/practice'}
        <Practice />
      {:else}
        <Home />
      {/if}
    {/if}
  </main>

  <footer class="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
    Built with Svelte + Tailwind • Gemini API
  </footer>
</div>


