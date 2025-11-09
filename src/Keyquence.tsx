'use client';

import { useEffect, useRef } from 'react';

interface Sequence {
  keys: string;
  onDetect: () => void;
  audioPath?: string;
}

interface KeySequenceListenerProps {
  sequences: Sequence[];
  resetTimeout?: number; // milliseconds
}

export default function Keyquence({ 
  sequences, 
  resetTimeout = 2000 
}: KeySequenceListenerProps) {
  const typedSequence = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentlyPlayingAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Preload all audio files
    sequences.forEach(seq => {
      if (seq.audioPath && !audioRefs.current.has(seq.keys)) {
        audioRefs.current.set(seq.keys, new Audio(seq.audioPath));
      }
    });

    const handleKeyPress = (event: KeyboardEvent) => {
      // Allow Escape key to stop currently playing audio
      if (event.key === 'Escape' && currentlyPlayingAudio.current) {
        currentlyPlayingAudio.current.pause();
        currentlyPlayingAudio.current.currentTime = 0;
        currentlyPlayingAudio.current = null;
        return;
      }

      typedSequence.current += event.key.toLowerCase();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Check all sequences
      sequences.forEach(seq => {
        if (typedSequence.current.includes(seq.keys.toLowerCase())) {
          seq.onDetect();
          
          // Stop any currently playing audio
          if (currentlyPlayingAudio.current) {
            currentlyPlayingAudio.current.pause();
            currentlyPlayingAudio.current.currentTime = 0;
          }
          
          // Play audio if specified
          const audio = audioRefs.current.get(seq.keys);
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(err => {
              console.error('Failed to play audio:', err);
            });
            currentlyPlayingAudio.current = audio;
          }
          
          typedSequence.current = '';
        }
      });

      timeoutRef.current = setTimeout(() => {
        typedSequence.current = '';
      }, resetTimeout);
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Stop and clean up all audio
      if (currentlyPlayingAudio.current) {
        currentlyPlayingAudio.current.pause();
        currentlyPlayingAudio.current = null;
      }
      audioRefs.current.forEach(audio => audio.pause());
      audioRefs.current.clear();
    };
  }, [sequences, resetTimeout]);

  return null;
}

// Named export for convenience
export { Keyquence };
export type { Sequence, KeySequenceListenerProps };
