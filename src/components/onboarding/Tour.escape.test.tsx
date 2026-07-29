// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TOUR_DONE_STORAGE_KEY } from "@/lib/templates.seed";
import { Tour } from "./Tour";

describe("Tour Escape", () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    localStorage.removeItem(TOUR_DONE_STORAGE_KEY);
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    host.remove();
    localStorage.removeItem(TOUR_DONE_STORAGE_KEY);
  });

  it("dismisses the dialog on Escape and marks tour done", async () => {
    await act(async () => {
      root.render(createElement(Tour, { enabled: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(document.querySelector('[role="dialog"][aria-label="Builder tour"]')).toBeTruthy();

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
      );
    });

    expect(document.querySelector('[role="dialog"][aria-label="Builder tour"]')).toBeNull();
    expect(localStorage.getItem(TOUR_DONE_STORAGE_KEY)).toBe("1");
  });
});
