"use client";

import { useEffect, useRef } from "react";

interface Sequence {
  /**
   * The keys to detect, matched case-insensitively against `KeyboardEvent.key`.
   * - An array lists one key name per entry: `["ArrowUp", "ArrowDown", "b", "a"]`.
   * - A string is shorthand for single-character keys: `"hello"`.
   */
  keys: string | string[];
  onDetect: () => void;
  audioPath?: string;
}

interface KeyquenceOptions {
  resetTimeout?: number; // milliseconds
}

interface NormalizedSequence extends Sequence {
  keys: string;
}

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

function normalizeKeys(keys: string | string[]): string {
  return (Array.isArray(keys) ? keys.join("") : keys).toLowerCase();
}

// True when the most recent whole keys spell out `keys`, so "up" never
// matches the tail of a single "arrowup" press.
function endsWithKeys(typedKeys: string[], keys: string): boolean {
  let suffix = "";
  for (let i = typedKeys.length - 1; i >= 0 && suffix.length < keys.length; i--) {
    suffix = typedKeys[i] + suffix;
  }
  return suffix === keys;
}

function stopAudio(audio: HTMLAudioElement) {
  audio.pause();
  audio.currentTime = 0;
}

export function useKeyquence(
  sequences: Sequence[],
  { resetTimeout = 2000 }: KeyquenceOptions = {},
): void {
  const typedKeys = useRef<string[]>([]);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeSequences = useRef<NormalizedSequence[]>([]);
  const maxSequenceLength = useRef(0);
  const audioByPath = useRef<Map<string, HTMLAudioElement>>(new Map());
  const playingAudio = useRef<HTMLAudioElement | null>(null);

  // Keep the latest sequences in a ref so a new array on every render
  // does not re-subscribe the listener or reload the audio.
  useEffect(() => {
    activeSequences.current = sequences
      .map((seq) => ({ ...seq, keys: normalizeKeys(seq.keys) }))
      .filter((seq) => seq.keys.length > 0);
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
      // composedPath()[0] is the real target inside an open shadow root;
      // event.target is retargeted to the shadow host.
      const target = event.composedPath()[0] ?? event.target;
      if (isEditableTarget(target) || isNonTypingKey(event)) return;

      if (event.key === STOP_AUDIO_KEY) {
        if (playingAudio.current && !playingAudio.current.paused) {
          stopAudio(playingAudio.current);
        }
        playingAudio.current = null;
        return;
      }

      clearTimeout(resetTimer.current);
      // Every key is at least one character, so this many keys always covers
      // the longest sequence.
      typedKeys.current = [...typedKeys.current, event.key.toLowerCase()].slice(
        -Math.max(maxSequenceLength.current, 1),
      );

      const match = activeSequences.current.find((seq) =>
        endsWithKeys(typedKeys.current, seq.keys),
      );
      if (match) {
        typedKeys.current = [];
        playAudioFor(match);
        match.onDetect();
      }

      resetTimer.current = setTimeout(() => {
        typedKeys.current = [];
      }, resetTimeout);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(resetTimer.current);
    };
  }, [resetTimeout]);
}

export type { Sequence, KeyquenceOptions };
