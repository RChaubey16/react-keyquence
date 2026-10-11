import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom does not implement media playback, so stand in a minimal Audio.
export class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  currentTime = 0;
  paused = true;

  constructor(public src: string) {
    super();
    FakeAudio.instances.push(this);
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  finish() {
    this.paused = true;
    this.dispatchEvent(new Event("ended"));
  }
}

beforeEach(() => {
  FakeAudio.instances = [];
  vi.stubGlobal("Audio", FakeAudio);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
