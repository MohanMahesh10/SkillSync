<script lang="ts">
  import { resumeStore, type ResumeData } from '../stores/resume';
  import { parsePdf, parseDocx } from '../lib/parsers';
  import { onDestroy } from 'svelte';

  let dragging = false;
  let parsing = false;
  let error = '';
  let resume: ResumeData | null = null;

  const unsubscribe = resumeStore.subscribe((v) => (resume = v));
  onDestroy(unsubscribe);

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    dragging = true;
  }
  function onDragLeave() { dragging = false; }

  async function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) await handleFile(file);
  }

  async function onChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) await handleFile(file);
  }

  async function handleFile(file: File) {
    error = '';
    parsing = true;
    try {
      let data: ResumeData;
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        data = await parsePdf(file);
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.docx')
      ) {
        data = await parseDocx(file);
      } else {
        throw new Error('Unsupported file. Please upload PDF or DOCX.');
      }
      resumeStore.set(data);
    } catch (e: any) {
      error = e?.message || 'Failed to parse resume.';
    } finally {
      parsing = false;
    }
  }
</script>

<section class="grid gap-6">
  <div
    class="p-8 rounded-xl border border-dashed shadow-sm bg-white dark:bg-gray-800"
    class:hover:shadow-md={true}
    class:border-accent-sky={dragging}
    on:dragover={onDragOver}
    on:dragleave={onDragLeave}
    on:drop={onDrop}
  >
    <div class="text-center">
      <div class="text-lg font-medium mb-2">Upload your resume (PDF or DOCX)</div>
      <p class="text-gray-600 dark:text-gray-300 mb-4">Drag and drop here or choose a file</p>
      <input type="file" accept=".pdf,.docx" on:change={onChange} class="mx-auto" />
      {#if parsing}
        <div class="mt-3 text-sm">Parsing...</div>
      {/if}
      {#if error}
        <div class="mt-3 text-red-600">{error}</div>
      {/if}
    </div>
  </div>

  {#if resume}
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <h2 class="text-xl font-semibold mb-4">Parsed Resume</h2>
      <div class="grid md:grid-cols-3 gap-6">
        <div>
          <h3 class="font-medium mb-2">Skills</h3>
          <div class="flex flex-wrap gap-2">
            {#each resume.skills as s}
              <span class="px-2 py-1 rounded bg-accent-sky/10 text-accent-sky border border-accent-sky/20 text-sm">{s}</span>
            {/each}
            {#if !resume.skills?.length}
              <span class="text-sm text-gray-500">Not detected</span>
            {/if}
          </div>
        </div>
        <div>
          <h3 class="font-medium mb-2">Experience</h3>
          <ul class="space-y-2">
            {#each resume.experience as ex}
              <li>
                <div class="font-medium">{ex.role} {#if ex.role && ex.company}at{/if} {ex.company}</div>
                <div class="text-sm text-gray-600 dark:text-gray-300">{ex.duration}</div>
              </li>
            {/each}
            {#if !resume.experience?.length}
              <li class="text-sm text-gray-500">Not detected</li>
            {/if}
          </ul>
        </div>
        <div>
          <h3 class="font-medium mb-2">Education</h3>
          <ul class="space-y-2">
            {#each resume.education as ed}
              <li>
                <div class="font-medium">{ed.degree}</div>
                <div class="text-sm text-gray-600 dark:text-gray-300">{ed.institution} {ed.year}</div>
              </li>
            {/each}
            {#if !resume.education?.length}
              <li class="text-sm text-gray-500">Not detected</li>
            {/if}
          </ul>
        </div>
      </div>
      <details class="mt-4">
        <summary class="cursor-pointer text-sm text-gray-600 dark:text-gray-300">Show raw text</summary>
        <pre class="whitespace-pre-wrap text-xs mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded">{resume.rawText}</pre>
      </details>
    </div>
  {/if}
</section>


