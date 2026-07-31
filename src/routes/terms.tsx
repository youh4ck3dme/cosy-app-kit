import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ArrowLeft, CheckCircle2, Code2 } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsOfServicePage,
});

export function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0A0C]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to COSY.AI</span>
        </Link>
        <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
          <FileText className="w-3.5 h-3.5" />
          <span>Terms of Service</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-400">Effective Date: July 27, 2026</p>
        </div>

        <section className="space-y-4 bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center gap-3 text-indigo-400 font-semibold">
            <Code2 className="w-5 h-5" />
            <h2 className="text-lg text-white">Full Intellectual Property Ownership</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            All visual code, components, HTML/CSS artifacts, and exported application ZIP bundles
            generated through COSY.AI belong 100% to you. You are free to export, deploy, monetize,
            and distribute your code without royalties or vendor lock-in.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">1. Acceptable Use Policy</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            You agree not to use COSY.AI to generate malicious software, phishing pages, automated
            spam, or content violating applicable laws and App Store safety guidelines.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            <h2 className="text-lg text-white">2. Service Availability & Warranties</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            COSY.AI is provided "as is". While we guarantee high availability, AI key load
            balancing, and PWA offline fallback support, we are not liable for external third-party
            API downtime.
          </p>
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 px-6 text-center text-xs text-slate-500">
        © 2026 COSY.AI. All rights reserved.
      </footer>
    </div>
  );
}
