<script lang="ts">
  import { onMount } from 'svelte';

  let dark = false;
  const STORAGE_KEY = 'jic_theme';

  onMount(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme();
  });

  function toggle() {
    dark = !dark;
    applyTheme();
  }

  function applyTheme() {
    const root = document.documentElement;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  }
</script>

<button on:click={toggle} class="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800">
  {#if dark}🌙 Dark{/if}
  {#if !dark}☀️ Light{/if}
  Mode
  </button>


