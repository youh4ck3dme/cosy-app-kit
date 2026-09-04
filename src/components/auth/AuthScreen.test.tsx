// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthScreen } from "./AuthScreen";

describe("AuthScreen", () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  const baseProps = {
    mode: "signin" as const,
    onModeChange: vi.fn(),
    email: "",
    onEmailChange: vi.fn(),
    password: "",
    onPasswordChange: vi.fn(),
    accessCode: "",
    onAccessCodeChange: vi.fn(),
    accessCodeError: null,
    onGoogleSignIn: vi.fn(),
    onEmailSubmit: vi.fn((e) => e.preventDefault()),
    onAccessCodeSubmit: vi.fn((e) => e.preventDefault()),
    googleLoading: false,
    emailLoading: false,
    accessCodeLoading: false,
    devLoading: false,
    showDeveloperEntry: false,
  };

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    host.remove();
    vi.clearAllMocks();
  });

  it("shows Google sign-in and access-code field", async () => {
    await act(async () => {
      root.render(createElement(AuthScreen, baseProps));
    });
    expect(host.querySelector('[data-testid="auth-google-signin"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="auth-access-code"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="auth-sign-in"]')).not.toBeNull();
  });

  it("hides developer entry unless showDeveloperEntry", async () => {
    await act(async () => {
      root.render(createElement(AuthScreen, baseProps));
    });
    expect(host.querySelector('[data-testid="auth-developer-entry"]')).toBeNull();

    await act(async () => {
      root.render(
        createElement(AuthScreen, {
          ...baseProps,
          showDeveloperEntry: true,
          onDeveloperEntry: vi.fn(),
        }),
      );
    });
    expect(host.querySelector('[data-testid="auth-developer-entry"]')).not.toBeNull();
  });
});
