<script lang="ts">
  export let confidence: number | undefined;

  $: pct = (() => {
    if (confidence === undefined) return 0;
    // Confidence can be in [0,1] or categorical; assume numeric 0..1
    const value = Math.max(0, Math.min(1, Number(confidence)));
    return Math.round(value * 100);
  })();
</script>

<div class="w-full">
  <div class="flex items-center justify-between mb-1 text-sm text-gray-600 dark:text-gray-300">
    <span>Confidence</span>
    <span>{pct}%</span>
  </div>
  <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded">
    <div class="h-2 rounded bg-accent-sky" style={`width:${pct}%`}></div>
  </div>
  </div>


