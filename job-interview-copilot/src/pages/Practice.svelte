<script lang="ts">
  import { apiKeyStore } from '../stores/apiKey';
  import { resumeStore, type ResumeData } from '../stores/resume';
  import { generateText } from '../lib/gemini';
  import { createSpeechRecognizer } from '../lib/speech';

  let apiKey = '';
  apiKeyStore.subscribe((v) => (apiKey = v || ''));
  let resume: ResumeData | null = null;
  resumeStore.subscribe((v) => (resume = v));

  let question = '';
  let userAnswer = '';
  let feedback = '';
  let listening = false;
  let error = '';
  let recognizer: ReturnType<typeof createSpeechRecognizer> | null = null;

  async function generateQuestion() {
    const ctx = resume
      ? `Skills: ${resume.skills.join(', ')}; Experience: ${resume.experience.map((e) => `${e.role} at ${e.company}`).join('; ')}`
      : 'General software engineering.';
    const prompt = `Generate one realistic interview question tailored to this resume context. Keep it under 30 words. Context: ${ctx}`;
    const { text } = await generateText({ apiKey, prompt, temperature: 0.7 });
    question = text.trim();
    feedback = '';
    userAnswer = '';
  }

  function start() {
    try {
      recognizer = createSpeechRecognizer({
        onTranscript: (t, isFinal) => {
          userAnswer = t;
        },
        onStart: () => (listening = true),
        onStop: () => (listening = false),
        onError: (msg) => (error = msg),
      });
      recognizer.start();
    } catch (e: any) {
      error = e?.message || 'Speech not supported.';
    }
  }

  function stop() {
    recognizer?.stop();
  }

  async function evaluate() {
    if (!question || !userAnswer) return;
    const prompt = `Interview question: ${question}\nCandidate answer: ${userAnswer}\nProvide concise feedback on content, structure, clarity, and confidence. Rate 1-10 and suggest improvements.`;
    const { text } = await generateText({ apiKey, prompt, temperature: 0.4 });
    feedback = text;
  }
</script>

<section class="grid gap-6">
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
    <div class="flex items-center justify-between">
      <h2 class="font-semibold">Practice Mode</h2>
      <button class="px-3 py-1 rounded bg-accent-sky text-white" on:click={generateQuestion}>New Question</button>
    </div>
    <div class="mt-3 text-lg">{question || 'Click New Question to begin.'}</div>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-medium">Your Answer (speech)</h3>
      <div class="flex gap-2">
        <button class="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50" on:click={start} disabled={listening}>Start</button>
        <button class="px-3 py-1 rounded bg-gray-500 text-white" on:click={stop}>Stop</button>
      </div>
    </div>
    <div class="min-h-32 p-3 rounded bg-gray-50 dark:bg-gray-900 whitespace-pre-wrap">{userAnswer || 'Speak to record your answer...'}</div>
    <button class="mt-3 px-3 py-1 rounded bg-emerald-600 text-white disabled:opacity-50" on:click={evaluate} disabled={!question || !userAnswer}>Evaluate</button>
  </div>

  {#if feedback}
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <h3 class="font-medium mb-2">Feedback</h3>
      <div class="whitespace-pre-wrap">{feedback}</div>
    </div>
  {/if}

  {#if error}
    <div class="text-red-600">{error}</div>
  {/if}
</section>


