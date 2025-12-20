import { useState, useRef, useCallback } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import { chatApi } from '../../services/chat.api';
import './SpeakerButton.css';

/**
 * SpeakerButton - Google Cloud TTS Integration
 * Phase 4: Voice Output
 *
 * Features:
 * - Text-to-speech using Google Cloud TTS
 * - Visual feedback (idle, loading, playing)
 * - Play/pause/stop controls
 * - Multi-language support (6 languages)
 * - Audio caching on backend
 */

interface SpeakerButtonProps {
  text: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused';

export function SpeakerButton({ text, disabled = false, size = 'small' }: SpeakerButtonProps) {
  const { language } = useLanguage();
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = useCallback(async () => {
    setError(null);

    // If playing, stop
    if (playbackState === 'playing' || playbackState === 'paused') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setPlaybackState('idle');
      return;
    }

    // Start loading
    setPlaybackState('loading');

    try {
      // Request TTS from backend
      const response = await chatApi.textToSpeech(text, language);

      if (!response.success || !response.data?.audio) {
        throw new Error(response.error || 'TTS failed');
      }

      // Create audio element from base64
      const audioSrc = `data:${response.data.contentType};base64,${response.data.audio}`;
      const audio = new Audio(audioSrc);
      audioRef.current = audio;

      // Set up event handlers
      audio.onended = () => {
        setPlaybackState('idle');
        audioRef.current = null;
      };

      audio.onerror = () => {
        setError('Audio playback failed');
        setPlaybackState('idle');
        audioRef.current = null;
      };

      // Start playback
      await audio.play();
      setPlaybackState('playing');

    } catch (err) {
      console.error('TTS error:', err);
      setError(err instanceof Error ? err.message : 'TTS unavailable');
      setPlaybackState('idle');
    }
  }, [text, language, playbackState]);

  // Don't render if text is too short
  if (!text || text.length < 10) {
    return null;
  }

  const getAriaLabel = () => {
    switch (playbackState) {
      case 'loading': return 'Laden...';
      case 'playing': return 'Stop voorlezen';
      case 'paused': return 'Hervat voorlezen';
      default: return 'Lees voor';
    }
  };

  const getTitle = () => {
    if (error) return error;
    switch (playbackState) {
      case 'loading': return 'Laden...';
      case 'playing': return 'Klik om te stoppen';
      default: return 'Klik om voor te lezen';
    }
  };

  return (
    <button
      type="button"
      className={`holibot-speaker-button holibot-speaker-button--${size} holibot-speaker-button--${playbackState}`}
      onClick={handleClick}
      disabled={disabled || playbackState === 'loading'}
      aria-label={getAriaLabel()}
      title={getTitle()}
    >
      {/* Loading spinner */}
      {playbackState === 'loading' && (
        <svg
          width={size === 'small' ? 16 : 20}
          height={size === 'small' ? 16 : 20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="holibot-speaker-icon holibot-speaker-icon--spin"
        >
          <circle cx="12" cy="12" r="10" opacity="0.3" />
          <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
        </svg>
      )}

      {/* Stop icon (when playing) */}
      {playbackState === 'playing' && (
        <svg
          width={size === 'small' ? 16 : 20}
          height={size === 'small' ? 16 : 20}
          viewBox="0 0 24 24"
          fill="currentColor"
          className="holibot-speaker-icon holibot-speaker-icon--pulse"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      )}

      {/* Speaker icon (idle) */}
      {(playbackState === 'idle' || playbackState === 'paused') && (
        <svg
          width={size === 'small' ? 16 : 20}
          height={size === 'small' ? 16 : 20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="holibot-speaker-icon"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
}
