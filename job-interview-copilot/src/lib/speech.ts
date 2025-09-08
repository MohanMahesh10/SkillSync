export type SpeechCallbacks = {
  onTranscript: (text: string, isFinal: boolean) => void;
  onStart?: () => void;
  onStop?: () => void;
  onError?: (message: string) => void;
};

function mapErrorMessage(e: any): string {
  const code = e?.error;
  switch (code) {
    case 'not-allowed':
      return 'Microphone access was denied. Allow mic permission and try again.';
    case 'audio-capture':
      return 'No microphone available. Check your input device and try again.';
    case 'network':
      return 'Network error. Check your connection and try again.';
    case 'aborted':
      return 'Speech recognition was aborted.';
    case 'no-speech':
      return 'No speech detected. Please speak clearly into the microphone.';
    default:
      return e?.message || 'Speech recognition error';
  }
}

export function createSpeechRecognizer(callbacks: SpeechCallbacks) {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    throw new Error('Web Speech API not supported in this browser. Use Chrome/Edge.');
  }
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  // Prefer speed
  (recognition as any).maxAlternatives = 1;
  let shouldBeRunning = false;
  let retryCount = 0;
  // backoff grows up to ~3s max

  recognition.onstart = () => callbacks.onStart?.();
  recognition.onend = () => {
    callbacks.onStop?.();
    if (shouldBeRunning) {
      // Chrome sometimes ends recognition silently; try to resume
      retryCount++;
      const delay = Math.min(600 + retryCount * 300, 3000);
      setTimeout(() => {
        try { recognition.start(); } catch {}
      }, delay);
    }
  };
  recognition.onerror = (e: any) => {
    const code = e?.error;
    if (code === 'not-allowed' || code === 'audio-capture') {
      shouldBeRunning = false; // do not loop forever on permission/device errors
      callbacks.onError?.(mapErrorMessage(e));
      return;
    }
    if (code === 'network' || code === 'aborted' || code === 'no-speech') {
      callbacks.onError?.(mapErrorMessage(e));
      try { recognition.stop(); } catch {}
      return; // onend will trigger restart if shouldBeRunning
    }
    callbacks.onError?.(mapErrorMessage(e));
  };
  recognition.onresult = (event: any) => {
    let transcript = '';
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) isFinal = true;
    }
    callbacks.onTranscript(transcript.trim(), isFinal);
  };

  return {
    start: async () => {
      try {
        // Trigger permission prompt early to avoid immediate errors
        if (navigator?.mediaDevices?.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      } catch (e: any) {
        callbacks.onError?.('Microphone permission is required. Please allow access and try again.');
        return;
      }
      try {
        shouldBeRunning = true;
        retryCount = 0;
        recognition.start();
      } catch (e: any) {
        // Some browsers throw if already started
      }
    },
    stop: () => {
      shouldBeRunning = false;
      retryCount = 0;
      try { recognition.stop(); } catch {}
    },
  };
}

export function isSpeechRecognitionAvailable(): boolean {
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}


