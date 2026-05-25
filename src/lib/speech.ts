// Enhanced Speech Manager with proper lifecycle management
class SpeechManager {
  private recognition: SpeechRecognition | null = null;
  private synthesis = window.speechSynthesis;
  private isListening = false;
  private isSpeaking = false;
  private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((err: string) => void) | null = null;
  private onStartCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private onInterimCallback: ((text: string) => void) | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly SILENCE_TIMEOUT = 3000;
  private destroyed = false;

  get supported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  get synthSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  get listening(): boolean {
    return this.isListening;
  }

  get speaking(): boolean {
    return this.isSpeaking;
  }

  startListening(callbacks: {
    onResult: (text: string, isFinal: boolean) => void;
    onInterim?: (text: string) => void;
    onError?: (err: string) => void;
    onStart?: () => void;
    onEnd?: () => void;
  }) {
    if (this.isSpeaking) {
      console.log('[Speech] Cannot listen while speaking');
      this.scheduleRetry(callbacks);
      return;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.destroyed = false;
    this.onResultCallback = callbacks.onResult;
    this.onInterimCallback = callbacks.onInterim ?? null;
    this.onErrorCallback = callbacks.onError ?? null;
    this.onStartCallback = callbacks.onStart ?? null;
    this.onEndCallback = callbacks.onEnd ?? null;

    const SpeechRecognitionAPI =
      (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      this.onErrorCallback?.('Speech recognition not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognitionAPI();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let lastInterimTranscript = '';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.retryCount = 0;
        finalTranscript = '';
        lastInterimTranscript = '';
        this.onStartCallback?.();
        console.log('[Speech] Recognition started');
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            const text = result[0].transcript.trim();
            if (text) {
              finalTranscript = text;
              this.resetSilenceTimer();
              this.onResultCallback?.(text, true);
            }
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (interimTranscript && interimTranscript !== lastInterimTranscript) {
          lastInterimTranscript = interimTranscript;
          this.resetSilenceTimer();
          this.onInterimCallback?.(interimTranscript);
          this.onResultCallback?.(interimTranscript, false);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.log('[Speech] Error:', event.error);
        if (event.error === 'no-speech') {
          // Silent - restart automatically
          this.restartListening(callbacks);
        } else if (event.error === 'aborted') {
          // User or system aborted - may need restart
          if (!this.destroyed && this.isListening) {
            this.restartListening(callbacks);
          }
        } else if (event.error === 'network') {
          this.onErrorCallback?.('Network error. Check your connection.');
          this.restartListening(callbacks);
        } else {
          this.onErrorCallback?.(event.error);
        }
      };

      this.recognition.onend = () => {
        console.log('[Speech] Recognition ended, was listening:', this.isListening);
        const wasListening = this.isListening;
        this.isListening = false;
        this.clearSilenceTimer();

        if (!this.destroyed && wasListening) {
          // Auto-restart if not intentionally stopped
          setTimeout(() => {
            if (!this.destroyed && !this.isSpeaking && !this.isListening) {
              this.restartListening(callbacks);
            }
          }, 100);
        }

        this.onEndCallback?.();
      };

      this.recognition.start();
    } catch (err) {
      console.error('[Speech] Start error:', err);
      this.isListening = false;
      this.onErrorCallback?.('Failed to start microphone');
      this.scheduleRetry(callbacks);
    }
  }

  private restartListening(callbacks: Parameters<typeof this.startListening>[0]) {
    if (this.destroyed || this.isSpeaking) return;

    this.stopListening();
    setTimeout(() => {
      if (!this.destroyed && !this.isSpeaking) {
        this.startListening(callbacks);
      }
    }, 200);
  }

  private scheduleRetry(callbacks: Parameters<typeof this.startListening>[0]) {
    if (this.retryCount >= this.MAX_RETRIES || this.destroyed) return;

    this.retryCount++;
    setTimeout(() => {
      if (!this.destroyed) {
        this.startListening(callbacks);
      }
    }, 1000 * this.retryCount);
  }

  stopListening() {
    this.destroyed = true;
    this.clearSilenceTimer();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
    this.isListening = false;
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      console.log('[Speech] Silence timeout');
      this.stopListening();
    }, this.SILENCE_TIMEOUT);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  speak(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      volume?: number;
      voice?: SpeechSynthesisVoice;
      onEnd?: () => void;
      onWord?: (charIndex: number) => void;
    }
  ) {
    if (!this.synthSupported) {
      options?.onEnd?.();
      return;
    }

    this.stopSpeaking();
    this.stopListening();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 0.95;
    utterance.pitch = options?.pitch ?? 1.05;
    utterance.volume = options?.volume ?? 1;
    utterance.lang = 'en-US';

    if (options?.voice) {
      utterance.voice = options.voice;
    } else {
      const voices = this.synthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang === 'en-US' &&
          (v.name.includes('Samantha') ||
            v.name.includes('Google US English') ||
            v.name.includes('Microsoft Aria') ||
            v.name.includes('Karen') ||
            v.name.includes('Daniel'))
      );
      if (preferred) utterance.voice = preferred;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      console.error('[Speech] TTS error:', e);
      this.isSpeaking = false;
      options?.onEnd?.();
    };

    if (options?.onWord) {
      utterance.onboundary = (e) => {
        options.onWord?.(e.charIndex);
      };
    }

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.isSpeaking = false;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  }

  destroy() {
    this.destroyed = true;
    this.stopListening();
    this.stopSpeaking();
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.onInterimCallback = null;
  }
}

export const speechManager = new SpeechManager();
