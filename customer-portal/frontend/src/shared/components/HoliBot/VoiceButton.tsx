import { useState, useEffect } from 'react';
import './VoiceButton.css';

/**
 * VoiceButton - Web Speech API Integration
 * Phase 5: Voice Input ✅
 *
 * Features:
 * - Speech-to-text using Web Speech API
 * - Visual feedback (idle, recording, processing)
 * - Auto-stop after silence
 * - Cross-browser support detection
 */

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  language?: string;
  disabled?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'processing';

export function VoiceButton({ onTranscript, language = 'nl-NL', disabled = false }: VoiceButtonProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [isSupported, setIsSupported] = useState(true);
  const [recognition, setRecognition] = useState<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      console.warn('Web Speech API not supported in this browser');
      return;
    }

    // Initialize recognition
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = language;
    recognitionInstance.maxAlternatives = 1;

    // Handle results
    recognitionInstance.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice transcript:', transcript);
      setRecordingState('idle');
      onTranscript(transcript);
    };

    // Handle errors
    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setRecordingState('idle');

      if (event.error === 'no-speech') {
        console.log('No speech detected');
      }
    };

    // Handle end
    recognitionInstance.onend = () => {
      setRecordingState('idle');
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.abort();
      }
    };
  }, [language, onTranscript]);

  const handleClick = () => {
    if (!recognition || !isSupported || disabled) return;

    if (recordingState === 'recording') {
      // Stop recording
      recognition.stop();
      setRecordingState('processing');
    } else {
      // Start recording
      try {
        recognition.start();
        setRecordingState('recording');
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setRecordingState('idle');
      }
    }
  };

  if (!isSupported) {
    return null; // Hide button if not supported
  }

  return (
    <button
      type="button"
      className={`holibot-voice-button holibot-voice-button--${recordingState}`}
      onClick={handleClick}
      disabled={disabled || recordingState === 'processing'}
      aria-label={recordingState === 'recording' ? 'Stop opnemen' : 'Start spraakinvoer'}
      title={recordingState === 'recording' ? 'Klik om te stoppen' : 'Klik om te spreken'}
    >
      {recordingState === 'recording' && (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="holibot-voice-icon holibot-voice-icon--pulse"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}

      {recordingState === 'processing' && (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="holibot-voice-icon holibot-voice-icon--spin"
        >
          <circle cx="12" cy="12" r="10" opacity="0.3" />
          <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
        </svg>
      )}

      {recordingState === 'idle' && (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="holibot-voice-icon"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}
    </button>
  );
}

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}
