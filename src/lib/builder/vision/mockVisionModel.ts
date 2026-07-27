import type { RawNode } from "../semantic-intent/types";

/**
 * Static AST fixture for **unit tests only** — not used in production.
 * Production vision always goes through Mistral Pixtral (`parseVisionImage`).
 * Do not wire this into server handlers or UI fallbacks.
 */
export async function parseImageToRawNode(_imageBase64: string): Promise<RawNode> {
  await new Promise((resolve) => setTimeout(resolve, 1));

  return {
    id: "root-container",
    type: "box",
    className:
      "min-h-screen w-full flex items-center justify-center bg-background p-4 sm:p-8",
    children: [
      {
        id: "card-box",
        type: "box",
        className: "w-full max-w-md flex flex-col gap-6 p-8 rounded-2xl border bg-card shadow-sm",
        children: [
          {
            id: "header-box",
            type: "box",
            className: "text-center",
            children: [
              {
                id: "title-text",
                type: "text",
                className: "text-2xl font-semibold tracking-tight text-foreground",
                text: "Welcome back",
              },
              {
                id: "subtitle-text",
                type: "text",
                className: "text-sm text-muted-foreground mt-2",
                text: "Enter your credentials to access your account",
              },
            ],
          },
          {
            id: "form-box",
            type: "box",
            className: "flex flex-col gap-4",
            children: [
              {
                id: "email-field",
                type: "box",
                className: "flex flex-col gap-2",
                children: [
                  {
                    id: "email-label",
                    type: "text",
                    className: "text-sm font-medium text-foreground",
                    text: "Email",
                  },
                  {
                    id: "email-input",
                    type: "input",
                    inputType: "email",
                    name: "email",
                    label: "Email",
                    className:
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  },
                ],
              },
              {
                id: "password-field",
                type: "box",
                className: "flex flex-col gap-2",
                children: [
                  {
                    id: "password-label",
                    type: "text",
                    className: "text-sm font-medium text-foreground",
                    text: "Password",
                  },
                  {
                    id: "password-input",
                    type: "input",
                    inputType: "password",
                    name: "password",
                    label: "Password",
                    className:
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  },
                ],
              },
              {
                id: "submit-button",
                type: "button",
                action: "submit",
                text: "Sign In",
                className:
                  "inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2 w-full",
              },
            ],
          },
        ],
      },
    ],
  };
}
