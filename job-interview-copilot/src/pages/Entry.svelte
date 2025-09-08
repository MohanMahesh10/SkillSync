<script lang="ts">
  import { apiKeyStore } from '../stores/apiKey';
  import { validateApiKey } from '../lib/gemini';
  import { navigate } from '../lib/router';

  let apiKey = '';
  let loading = false;
  let error = '';

  $: apiKeyStore.subscribe((v) => (apiKey = v || ''));

  async function submit() {
    error = '';
    loading = true;
    try {
      const ok = await validateApiKey(apiKey.trim());
      if (!ok) {
        error = 'Invalid API key. Please verify in Google AI Studio.';
        return;
      }
      apiKeyStore.set(apiKey.trim());
      navigate('/home');
    } catch (e: any) {
      error = e?.message || 'Failed to validate API key.';
    } finally {
      loading = false;
    }
  }
</script>

<section class="max-w-lg mx-auto mt-16 bg-white dark:bg-gray-800 rounded-xl shadow p-6">
  <h1 class="text-2xl font-semibold mb-2">Welcome to Job Interview Copilot</h1>
  <p class="text-gray-600 dark:text-gray-300 mb-6">Enter your Gemini API key to continue.</p>

  <label class="block text-sm font-medium mb-1" for="api">Gemini API key</label>
  <input id="api" bind:value={apiKey} type="password" placeholder="AIza... or OAuth Bearer token"
    class="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" />

  {#if error}
    <div class="mt-3 text-red-600">{error}</div>
  {/if}

  <button on:click={submit} class="mt-6 w-full py-2 rounded-md bg-accent-sky text-white shadow hover:brightness-110 disabled:opacity-50" disabled={loading || !apiKey.trim()}>
    {#if loading}Validating...{/if}
    {#if !loading}Validate & Enter{/if}
  </button>

  <p class="text-xs text-gray-500 mt-4">Your key is stored locally in this browser until you clear it.</p>
</section>


