"use client";

import { useKeyquence, type KeyquenceOptions, type Sequence } from "./useKeyquence";

interface KeyquenceProps extends KeyquenceOptions {
  sequences: Sequence[];
}

/** @deprecated Use `KeyquenceProps` instead. */
type KeySequenceListenerProps = KeyquenceProps;

export default function Keyquence({ sequences, ...options }: KeyquenceProps) {
  useKeyquence(sequences, options);
  return null;
}

// Named export for convenience
export { Keyquence };
export type { KeyquenceProps, KeySequenceListenerProps };
