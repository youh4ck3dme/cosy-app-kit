import type { RawNode } from "../semantic-intent/types";

/**
 * Mock Vision API Model
 * 
 * In a real-world scenario, this function would send the Base64 image to an AI Vision model
 * (like GPT-4o, Claude 3.5 Sonnet, or Mistral Pixtral) to parse the layout and return a structured AST.
 * 
 * For now, this mock simulates processing time and returns a hardcoded login form layout (RawNode),
 * which our Semantic Intent Engine will then enhance into a smart React component.
 */
export async function parseImageToRawNode(imageBase64: string): Promise<RawNode> {
  // Simulate network latency & model thinking time (1.5s - 3s)
  const processingDelay = Math.random() * 1500 + 1500;
  await new Promise(resolve => setTimeout(resolve, processingDelay));

  // The mock returns a raw HTML-like structure of a login form
  return {
    type: "div",
    props: {
      className: "flex flex-col gap-6 p-8 bg-surface rounded-2xl shadow-xl w-full max-w-sm border border-border-subtle",
    },
    children: [
      {
        type: "div",
        props: {
          className: "text-center",
        },
        children: [
          {
            type: "h2",
            props: {
              className: "text-2xl font-semibold tracking-tight text-foreground",
            },
            children: ["Welcome back"],
          },
          {
            type: "p",
            props: {
              className: "text-sm text-muted-foreground mt-2",
            },
            children: ["Enter your credentials to continue"],
          }
        ]
      },
      {
        type: "form",
        props: {
          className: "flex flex-col gap-4",
          // The semantic intent engine should detect this as a form and add onSubmit handler
        },
        children: [
          {
            type: "div",
            props: {
              className: "flex flex-col gap-2",
            },
            children: [
              {
                type: "label",
                props: {
                  className: "text-sm font-medium text-foreground",
                  htmlFor: "email",
                },
                children: ["Email address"],
              },
              {
                type: "input",
                props: {
                  type: "email",
                  id: "email",
                  name: "email",
                  placeholder: "you@example.com",
                  className: "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
                },
              }
            ]
          },
          {
            type: "div",
            props: {
              className: "flex flex-col gap-2",
            },
            children: [
              {
                type: "label",
                props: {
                  className: "text-sm font-medium text-foreground",
                  htmlFor: "password",
                },
                children: ["Password"],
              },
              {
                type: "input",
                props: {
                  type: "password",
                  id: "password",
                  name: "password",
                  className: "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors",
                },
              }
            ]
          },
          {
            type: "button",
            props: {
              type: "submit",
              className: "inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full mt-2",
            },
            children: ["Sign in"],
          }
        ]
      }
    ],
  };
}
