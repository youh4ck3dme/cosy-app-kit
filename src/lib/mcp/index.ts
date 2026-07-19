import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listThreads from "./tools/list-threads";
import getThread from "./tools/get-thread";
import createThread from "./tools/create-thread";
import listArtifacts from "./tools/list-artifacts";
import getArtifact from "./tools/get-artifact";

// OAuth issuer MUST be the direct Supabase host, not the .lovable.cloud proxy.
// VITE_SUPABASE_PROJECT_ID is inlined at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "builder-mcp",
  title: "AI Builder",
  version: "0.1.0",
  instructions:
    "Tools for the AI Builder app. Read the signed-in user's chat threads, messages, and generated artifacts, and create new threads. All calls act as the authenticated user; RLS restricts data to their own rows.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listThreads, getThread, createThread, listArtifacts, getArtifact],
});
