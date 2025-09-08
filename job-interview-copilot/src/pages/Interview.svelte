<script lang="ts">
  import { apiKeyStore } from '../stores/apiKey';
  import { resumeStore, type ResumeData } from '../stores/resume';
  import { createSpeechRecognizer, isSpeechRecognitionAvailable } from '../lib/speech';
  import { generateText } from '../lib/gemini';
  import { transcribeWithGemini } from '../lib/transcribe';
  import { createChunkedTranscriber } from '../lib/mobileTranscriber';
  import { historyStore } from '../stores/history';
  import ConfidenceBar from '../components/ConfidenceBar.svelte';

  let apiKey = '';
  apiKeyStore.subscribe((v) => (apiKey = v || ''));

  let resume: ResumeData | null = null;
  resumeStore.subscribe((v) => (resume = v));

  let listening = false;
  let transcript = '';
  let aiAnswer = '';
  let confidence: number | undefined;
  let error = '';
  let autoGenerate = true;
  let processing = false;
  let debounceHandle: number | null = null;
  let lastProcessedSignature = '';
  let resumeSummary = '';
  // Minimal UI: auto-generate while listening; only Start/Stop visible

  let recognizer: ReturnType<typeof createSpeechRecognizer> | null = null;
  let fallbackRecording = false;
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: BlobPart[] = [];
  let chunked: ReturnType<typeof createChunkedTranscriber> | null = null;

  function start() {
    try {
      ensureResumeSummary();
      if (isSpeechRecognitionAvailable()) {
        recognizer = createSpeechRecognizer({
        onTranscript: async (text, isFinal) => {
          transcript = text;
          if (isFinal) {
            processTranscript();
          } else {
            scheduleProcess(400);
          }
        },
        onStart: () => (listening = true),
        onStop: () => (listening = false),
        onError: async (msg) => {
          error = msg;
          // Fallback: record short clip and transcribe via Gemini if network/unsupported
          if (!fallbackRecording && (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('not supported'))) {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              mediaRecorder = new MediaRecorder(stream);
              chunks = [];
              mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
              mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const text = await transcribeWithGemini(apiKey, blob, 'audio/webm');
                transcript = text;
                fallbackRecording = false;
              };
              fallbackRecording = true;
              mediaRecorder.start();
              setTimeout(() => mediaRecorder?.stop(), 5000);
            } catch (e) {
              // ignore; show original error
            }
          }
        },
        }, { autoRestart: false });
        recognizer.start();
      } else {
        // iOS fallback: chunked transcription loop
        listening = true;
        chunked = createChunkedTranscriber(apiKey, {
          onChunk: (t) => {
            transcript = t; // show last chunk
            scheduleProcess(300);
          },
          onError: (m) => (error = m),
        });
        chunked.start();
      }
    } catch (e: any) {
      error = e?.message || 'Speech not supported.';
    }
  }

  function stop() {
    recognizer?.stop();
    chunked?.stop();
    chunked = null;
  }

  async function askGemini() {
    if (!transcript.trim()) return;
    error = '';
    aiAnswer = 'Generating...';
    try {
      const ctx = buildContext();
      const prompt = buildPrompt(ctx, transcript);
      const { text, confidence: conf } = await generateText({ apiKey, prompt, temperature: 0.3 });
      aiAnswer = text || '(No answer)';
      confidence = conf;
      historyStore.add(transcript.trim(), aiAnswer);
    } catch (e: any) {
      error = e?.message || 'Failed to generate answer.';
      aiAnswer = '';
    }
  }

  function scheduleProcess(delay = 800) {
    if (!autoGenerate || !listening) return;
    if (debounceHandle) clearTimeout(debounceHandle);
    debounceHandle = window.setTimeout(processTranscript, delay);
  }

  async function processTranscript() {
    if (processing) return;
    const text = transcript.trim();
    if (!text || text.length < 4) return;
    const signature = `${text}`;
    if (signature === lastProcessedSignature) return;
    lastProcessedSignature = signature;
    processing = true;
    try {
      await askGemini();
    } finally {
      processing = false;
    }
  }

  function buildContext(): string {
    if (!resume) return 'No resume provided.';
    const parts: string[] = [];
    if (resumeSummary) parts.push(`Summary: ${resumeSummary}`);
    if (resume.skills?.length) parts.push(`Skills: ${resume.skills.slice(0, 30).join(', ')}`);
    if (resume.experience?.length) {
      const ex = resume.experience
        .slice(0, 6)
        .map((e) => `${e.role || 'Role'} at ${e.company || 'Company'} ${e.duration ? `(${e.duration})` : ''}`)
        .join('; ');
      parts.push(`Experience: ${ex}`);
    }
    if (resume.education?.length) {
      const ed = resume.education
        .slice(0, 4)
        .map((e) => `${e.degree || ''} ${e.institution ? `- ${e.institution}` : ''} ${e.year || ''}`)
        .join('; ');
      parts.push(`Education: ${ed}`);
    }
    const rawTail = resume.rawText?.slice(0, 1200);
    if (rawTail) parts.push(`Raw: ${rawTail}`);
    const ctx = parts.join('\n');
    return ctx.slice(0, 2200);
  }

  async function ensureResumeSummary() {
    if (!resume || resumeSummary) return;
    try {
      const seed = `Summarize this resume for interview Q&A in <= 8 bullets focusing on: most relevant skills, tech stack, 3–4 key achievements (with metrics if present), seniority and core strengths. Return a compact paragraph (no bullets). Resume text: ${resume.rawText?.slice(0, 4000) || ''}`;
      const { text } = await generateText({ apiKey, prompt: seed, temperature: 0.2 });
      resumeSummary = (text || '').trim();
    } catch {
      // non-fatal
    }
  }

  function buildPrompt(ctx: string, question: string): string {
    return `You are an expert interview copilot. Write answers I can say verbatim.

General style rules:
- First‑person, confident, succinct. No meta language.
- If the question requests N items, output exactly N items; otherwise use 3–5 numbered points.
- Each point includes a short why/impact. Never fabricate facts.
- Tie back to my resume ONLY when factual and helpful.

Question handling:
1) Behavioral / project / experience questions → ALWAYS use STAR format with headings:
   "Situation:" (1–2 lines)
   "Task:" (1 line)
   "Action:" (2–4 lines; specific steps, tools, scale)
   "Result:" (1–2 lines; metrics if available; what changed)

2) Technical questions (definitions, comparisons, how‑to, architecture, troubleshooting) → Structured technical answer:
   - Start with a 1–2 line direct answer.
   - Then 3–5 numbered points (criteria, steps, trade‑offs, examples).
   - End with a brief tie‑in to my resume if relevant.

Resume Context (facts about me):
${ctx}

Interviewer question:
${question}

Output only the final answer in the appropriate format.`;
  }

  // No hints/reveal controls in minimal UI

  // Structured answer rendering (bulleted/paragraph blocks)
  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatAnswerToHtml(answer: string): string {
    const lines = answer.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    let html = '';
    let inList = false;
    const listItemRe = /^(?:[-•]|\d+[\.)])/;
    for (const line of lines) {
      const isItem = listItemRe.test(line);
      if (isItem && !inList) {
        inList = true;
        html += '<ul class="structured list-outside pl-6 space-y-2">';
      }
      if (!isItem && inList) {
        inList = false;
        html += '</ul>';
      }
      if (isItem) {
        const content = escapeHtml(line.replace(listItemRe, '').trim());
        html += `<li class=\"structured-item\">${content}</li>`;
      } else {
        // Bold markdown **text**
        const escaped = escapeHtml(line).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<p class=\"mb-3\">${escaped}</p>`;
      }
    }
    if (inList) html += '</ul>';
    return html || '<p class="text-gray-500">Answer will appear here.</p>';
  }

  $: formattedAnswerHtml = formatAnswerToHtml(aiAnswer);

  
</script>

<!-- Mobile minimal view -->
<div class="md:hidden px-4 pt-4 pb-28">
  <div class="flex items-center justify-between mb-3">
    <button class={`flex-1 h-12 rounded-full text-white text-base font-medium shadow transition ${listening ? 'bg-red-600' : 'bg-green-600'}`} on:click={listening ? stop : start}>
      {listening ? 'Stop' : 'Start'}
    </button>
    <div class="ml-3 text-sm {listening ? 'text-green-600' : 'text-gray-500'}">{listening ? 'Listening' : 'Ready'}</div>
  </div>

  <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[320px] p-4">
    {#if !aiAnswer}
      <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
        After the interviewer asks a question, you'll see a precise answer here.
      </p>
    {:else}
      <div class="text-[15px] leading-relaxed prose prose-sm max-w-none dark:prose-invert">
        {@html formattedAnswerHtml}
      </div>
    {/if}
  </div>

  <div class="mt-3 text-sm text-gray-500">{listening ? 'Transcribing..' : ''}</div>
</div>

<!-- Desktop/tablet view -->
<section class="hidden md:grid md:grid-cols-3 gap-6">
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold">Live Transcript</h2>
      <div class="flex gap-2">
        <button class="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50" on:click={start} disabled={listening}>Start</button>
        <button class="px-3 py-1 rounded bg-gray-500 text-white" on:click={stop}>Stop</button>
      </div>
    </div>
    <div class="min-h-48 p-3 rounded bg-gray-50 dark:bg-gray-900 whitespace-pre-wrap text-base leading-relaxed">{transcript || 'Waiting for speech...'}</div>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold">AI Suggested Answer</h2>
    </div>
    <div class="min-h-48 p-3 rounded bg-gray-50 dark:bg-gray-900">
      <div class="prose prose-sm max-w-none dark:prose-invert">
        {@html formattedAnswerHtml}
      </div>
    </div>
    <div class="mt-3">
      <ConfidenceBar {confidence} />
    </div>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold">Resume Context</h2>
    </div>
    {#if resume}
      {#if resumeSummary}
        <div class="mb-3 text-sm whitespace-pre-wrap">{resumeSummary}</div>
      {/if}
      <div class="space-y-3 text-sm">
        <div>
          <div class="font-medium mb-1">Skills</div>
          <div class="flex flex-wrap gap-1">
            {#each (resume.skills || []).slice(0, 20) as s}
              <span class="px-2 py-0.5 rounded bg-accent-sky/10 text-accent-sky border border-accent-sky/20 text-xs">{s}</span>
            {/each}
            {#if !resume.skills?.length}
              <span class="text-gray-500">Not detected</span>
            {/if}
          </div>
        </div>
        <div>
          <div class="font-medium mb-1">Experience</div>
          <ul class="space-y-1">
            {#each (resume.experience || []).slice(0, 5) as ex}
              <li>
                <div class="font-medium">{ex.role || 'Role'} {#if ex.company}at{/if} {ex.company}</div>
                <div class="text-gray-600 dark:text-gray-300">{ex.duration}</div>
              </li>
            {/each}
          </ul>
        </div>
        <div>
          <div class="font-medium mb-1">Education</div>
          <ul class="space-y-1">
            {#each (resume.education || []).slice(0, 3) as ed}
              <li>{ed.degree} {ed.institution ? `- ${ed.institution}` : ''} {ed.year}</li>
            {/each}
          </ul>
        </div>
      </div>
    {:else}
      <div class="text-sm text-gray-500">No resume uploaded. Go to Home to add one.</div>
    {/if}
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4 md:col-span-3">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold">Answer History (last 3)</h2>
      <button class="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs" on:click={() => historyStore.clear()}>Clear</button>
    </div>
    <div class="space-y-3">
      {#each $historyStore as item (item.id)}
        <div class="rounded border border-gray-200 dark:border-gray-700 p-3">
          <div class="text-xs text-gray-500">{new Date(item.ts).toLocaleTimeString()}</div>
          <div class="mt-1 text-sm"><span class="font-semibold">Q:</span> {item.question}</div>
          <div class="mt-1 whitespace-pre-wrap"><span class="font-semibold">A:</span> {item.answer}</div>
        </div>
      {/each}
      {#if !$historyStore.length}
        <div class="text-sm text-gray-500">No history yet.</div>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="md:col-span-2 text-red-600">{error}</div>
  {/if}
</section>


