"use client";

import { useEffect, useRef } from "react";

interface Sequence {
  keys: string;
  onDetect: () => void;
  audioPath?: string;
}

interface KeyquenceProps {
  sequences: Sequence[];
  resetTimeout?: number; // milliseconds
}

/** @deprecated Use `KeyquenceProps` instead. */
type KeySequenceListenerProps = KeyquenceProps;

const STOP_AUDIO_KEY = "Escape";
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "AltGraph", "Meta", "CapsLock"]);
const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (EDITABLE_TAGS.has(target.tagName) || target.isContentEditable)
  );
}

// Modifier presses, shortcuts (Ctrl/Meta/Alt + key) and held-down keys are not
// part of a typed sequence. AltGr reports Ctrl+Alt on Windows but types characters.
function isNonTypingKey(event: KeyboardEvent): boolean {
  const isShortcut =
    (event.ctrlKey || event.metaKey || event.altKey) &&
    !event.getModifierState("AltGraph");
  return event.repeat || isShortcut || MODIFIER_KEYS.has(event.key);
}

function stopAudio(audio: HTMLAudioElement) {
  audio.pause();
  audio.currentTime = 0;
}

export default function Keyquence({
  sequences,
  resetTimeout = 2000,
}: KeyquenceProps) {
  const typedKeys = useRef("");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeSequences = useRef<Sequence[]>([]);
  const maxSequenceLength = useRef(0);
  const audioByPath = useRef<Map<string, HTMLAudioElement>>(new Map());
  const playingAudio = useRef<HTMLAudioElement | null>(null);

  // Keep the latest sequences in a ref so a new array on every render
  // does not re-subscribe the listener or reload the audio.
  useEffect(() => {
    activeSequences.current = sequences
      .filter((seq) => seq.keys.length > 0)
      .map((seq) => ({ ...seq, keys: seq.keys.toLowerCase() }));
    maxSequenceLength.current = Math.max(
      0,
      ...activeSequences.current.map((seq) => seq.keys.length),
    );
  }, [sequences]);

  // A stable string key, so audio is only reloaded when the set of files changes.
  const audioPaths = [
    ...new Set(sequences.flatMap((seq) => (seq.audioPath ? [seq.audioPath] : []))),
  ].join("\n");

  useEffect(() => {
    const audios = new Map(
      audioPaths
        .split("\n")
        .filter(Boolean)
        .map((path) => [path, new Audio(path)]),
    );
    audioByPath.current = audios;

    return () => {
      audios.forEach((audio) => audio.pause());
      if (playingAudio.current && [...audios.values()].includes(playingAudio.current)) {
        playingAudio.current = null;
      }
    };
  }, [audioPaths]);

  useEffect(() => {
    const playAudioFor = (seq: Sequence) => {
      if (playingAudio.current) stopAudio(playingAudio.current);

      const audio = seq.audioPath ? audioByPath.current.get(seq.audioPath) : undefined;
      if (!audio) return;

      audio.currentTime = 0;
      audio.play().catch((err) => {
        console.error("Failed to play audio:", err);
      });
      playingAudio.current = audio;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || isNonTypingKey(event)) return;

      if (event.key === STOP_AUDIO_KEY) {
        if (playingAudio.current && !playingAudio.current.paused) {
          stopAudio(playingAudio.current);
        }
        playingAudio.current = null;
        return;
      }

      clearTimeout(resetTimer.current);
      // Only the tail that could still complete a sequence is worth keeping.
      typedKeys.current = (typedKeys.current + event.key.toLowerCase()).slice(
        -Math.max(maxSequenceLength.current, 1),
      );

      const match = activeSequences.current.find((seq) =>
        typedKeys.current.endsWith(seq.keys),
      );
      if (match) {
        typedKeys.current = "";
        playAudioFor(match);
        match.onDetect();
      }

      resetTimer.current = setTimeout(() => {
        typedKeys.current = "";
      }, resetTimeout);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(resetTimer.current);
    };
  }, [resetTimeout]);

  return null;
}

// Named export for convenience
export { Keyquence };
export type { Sequence, KeyquenceProps, KeySequenceListenerProps };
