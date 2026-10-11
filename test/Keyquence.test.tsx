import { describe, expect, it, vi } from "vitest";
import { render, renderHook } from "@testing-library/react";
import Keyquence, { useKeyquence, type Sequence } from "../src";
import { FakeAudio } from "./setup";

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = window) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
}

function type(text: string) {
  for (const char of text) press(char);
}

describe("Keyquence", () => {
  describe("detection", () => {
    it("calls onDetect when the sequence is typed", () => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: "hello", onDetect }]} />);

      type("hello");

      expect(onDetect).toHaveBeenCalledTimes(1);
    });

    it("matches case-insensitively", () => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: "Hello", onDetect }]} />);

      type("hELLo");

      expect(onDetect).toHaveBeenCalledTimes(1);
    });

    it("matches a sequence typed after unrelated keys", () => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: "abc", onDetect }]} />);

      type("xyzabc");

      expect(onDetect).toHaveBeenCalledTimes(1);
    });

    it("resets the typed keys after the timeout", () => {
      vi.useFakeTimers();
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: "abc", onDetect }]} resetTimeout={500} />);

      type("ab");
      vi.advanceTimersByTime(500);
      type("c");

      expect(onDetect).not.toHaveBeenCalled();
    });

    it("never fires a sequence with empty keys", () => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: "", onDetect }]} />);

      type("abc");

      expect(onDetect).not.toHaveBeenCalled();
    });

    it("fires only the first matching sequence when several share a suffix", () => {
      const first = vi.fn();
      const second = vi.fn();
      render(
        <Keyquence
          sequences={[
            { keys: "abc", onDetect: first },
            { keys: "bc", onDetect: second },
          ]}
        />,
      );

      type("abc");

      expect(first).toHaveBeenCalledTimes(1);
      expect(second).not.toHaveBeenCalled();
    });

    it("uses the latest onDetect after a re-render", () => {
      const stale = vi.fn();
      const fresh = vi.fn();
      const { rerender } = render(<Keyquence sequences={[{ keys: "ab", onDetect: stale }]} />);

      rerender(<Keyquence sequences={[{ keys: "ab", onDetect: fresh }]} />);
      type("ab");

      expect(stale).not.toHaveBeenCalled();
      expect(fresh).toHaveBeenCalledTimes(1);
    });

    it("stops listening after unmount", () => {
      const onDetect = vi.fn();
      const { unmount } = render(<Keyquence sequences={[{ keys: "ab", onDetect }]} />);

      unmount();
      type("ab");

      expect(onDetect).not.toHaveBeenCalled();
    });
  });

  describe("named keys", () => {
    const konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

    it("matches an array of key names", () => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: konami, onDetect }]} />);

      konami.forEach((key) => press(key));

      expect(onDetect).toHaveBeenCalledTimes(1);
    });

    it("matches key names case-insensitively", () => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: ["arrowup", "B"], onDetect }]} />);

      press("ArrowUp");
      press("b");

      expect(onDetect).toHaveBeenCalledTimes(1);
    });

    it("does not match an array when only part of a key name is typed", () => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: ["a", "b"], onDetect }]} />);

      press("a");
      press("Tab"); // "tab" ends with "b" but is a different key

      expect(onDetect).not.toHaveBeenCalled();
    });

    it("does not match a string against part of a key name", () => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: "up", onDetect }]} />);

      press("ArrowUp");

      expect(onDetect).not.toHaveBeenCalled();
    });

    it("still matches key names joined into one string", () => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: konami.join(""), onDetect }]} />);

      konami.forEach((key) => press(key));

      expect(onDetect).toHaveBeenCalledTimes(1);
    });
  });

  describe("ignored keys", () => {
    it("ignores modifier keys pressed between characters", () => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: "hello", onDetect }]} />);

      type("he");
      press("Shift");
      press("L", { shiftKey: true });
      type("lo");

      expect(onDetect).toHaveBeenCalledTimes(1);
    });

    it.each(["ctrlKey", "metaKey", "altKey"])("ignores keys pressed with %s", (modifier) => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: "ab", onDetect }]} />);

      press("a");
      press("b", { [modifier]: true });

      expect(onDetect).not.toHaveBeenCalled();
    });

    it("still accepts characters typed with AltGr", () => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: "a@", onDetect }]} />);

      press("a");
      press("@", { ctrlKey: true, altKey: true, modifierAltGraph: true });

      expect(onDetect).toHaveBeenCalledTimes(1);
    });

    it("ignores auto-repeated keys", () => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: "aa", onDetect }]} />);

      press("a");
      press("a", { repeat: true });

      expect(onDetect).not.toHaveBeenCalled();
    });

    it("does not add Escape to the typed keys", () => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: "ab", onDetect }]} />);

      press("a");
      press("Escape");
      press("b");

      expect(onDetect).toHaveBeenCalledTimes(1);
    });

    it.each(["input", "textarea", "select"])("ignores keys typed in a <%s>", (tag) => {
      const onDetect = vi.fn();
      render(<Keyquence sequences={[{ keys: "ab", onDetect }]} />);
      const field = document.body.appendChild(document.createElement(tag));

      press("a", {}, field);
      press("b", {}, field);

      expect(onDetect).not.toHaveBeenCalled();
      field.remove();
    });
  });

  describe("audio", () => {
    const withAudio = (overrides: Partial<Sequence> = {}): Sequence[] => [
      { keys: "ab", onDetect: () => {}, audioPath: "/ding.mp3", ...overrides },
    ];

    it("plays the sequence's audio when it is detected", () => {
      render(<Keyquence sequences={withAudio()} />);

      type("ab");

      expect(FakeAudio.instances).toHaveLength(1);
      expect(FakeAudio.instances[0].paused).toBe(false);
    });

    it("stops the playing audio when Escape is pressed", () => {
      render(<Keyquence sequences={withAudio()} />);
      type("ab");

      press("Escape");

      expect(FakeAudio.instances[0].paused).toBe(true);
      expect(FakeAudio.instances[0].currentTime).toBe(0);
    });

    it("keeps playing audio when the parent re-renders with a new sequences array", () => {
      const { rerender } = render(<Keyquence sequences={withAudio()} />);
      type("ab");

      rerender(<Keyquence sequences={withAudio()} />);

      expect(FakeAudio.instances[0].paused).toBe(false);
    });

    it("loads a shared audio file only once", () => {
      render(
        <Keyquence
          sequences={[
            { keys: "ab", onDetect: () => {}, audioPath: "/ding.mp3" },
            { keys: "cd", onDetect: () => {}, audioPath: "/ding.mp3" },
          ]}
        />,
      );

      expect(FakeAudio.instances).toHaveLength(1);
    });

    it("leaves finished audio untouched when Escape is pressed", () => {
      render(<Keyquence sequences={withAudio()} />);
      type("ab");
      const audio = FakeAudio.instances[0];
      audio.finish();
      audio.currentTime = 3;

      press("Escape");

      expect(audio.currentTime).toBe(3);
    });

    it("plays the audio even if onDetect throws", () => {
      const swallow = (e: ErrorEvent) => e.preventDefault();
      window.addEventListener("error", swallow);
      render(
        <Keyquence
          sequences={withAudio({
            onDetect: () => {
              throw new Error("boom");
            },
          })}
        />,
      );

      type("ab");

      window.removeEventListener("error", swallow);
      expect(FakeAudio.instances[0].paused).toBe(false);
    });

    it("stops the playing audio on unmount", () => {
      const { unmount } = render(<Keyquence sequences={withAudio()} />);
      type("ab");

      unmount();

      expect(FakeAudio.instances[0].paused).toBe(true);
    });
  });

  describe("useKeyquence", () => {
    it("detects sequences without rendering a component", () => {
      const onDetect = vi.fn();
      renderHook(() => useKeyquence([{ keys: "ab", onDetect }]));

      type("ab");

      expect(onDetect).toHaveBeenCalledTimes(1);
    });

    it("accepts a resetTimeout option", () => {
      vi.useFakeTimers();
      const onDetect = vi.fn();
      renderHook(() => useKeyquence([{ keys: "ab", onDetect }], { resetTimeout: 100 }));

      type("a");
      vi.advanceTimersByTime(100);
      type("b");

      expect(onDetect).not.toHaveBeenCalled();
    });
  });
});
