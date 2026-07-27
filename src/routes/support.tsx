import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpCircle, ArrowLeft, Mail, MessageSquare, Smartphone, Globe } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute("/support" as any)({
  component: SupportPage,
});

export function SupportPage() {
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
          <HelpCircle className="w-3.5 h-3.5" />
          <span>App Store Support Hub</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Customer Support & Help Desk
          </h1>
          <p className="text-sm text-slate-400">
            Need help with PWA installation, native app builds, or AI features?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-3">
            <Mail className="w-6 h-6 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Email Support</h2>
            <p className="text-xs text-slate-400">
              Reach our dedicated support team for technical assistance or account inquiries.
            </p>
            <a
              href="mailto:support@cosyapp.dev"
              className="inline-block text-sm text-indigo-400 hover:underline font-mono"
            >
              support@cosyapp.dev
            </a>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-3">
            <Smartphone className="w-6 h-6 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">Mobile PWA & App Store</h2>
            <p className="text-xs text-slate-400">
              Learn how to install COSY.AI on iOS/Android or wrap with Capacitor.
            </p>
            <Link
              to={"/privacy" as unknown as "/"}
              className="inline-block text-sm text-emerald-400 hover:underline"
            >
              View App Store Policies →
            </Link>
          </div>
        </div>

        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-xl font-semibold text-white">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-1">
              <h3 className="text-sm font-semibold text-white">
                How do I install COSY.AI on my phone?
              </h3>
              <p className="text-xs text-slate-300">
                Tap "Share" in Safari (iOS) and select "Add to Home Screen", or tap "Install App" in
                Chrome (Android).
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-1">
              <h3 className="text-sm font-semibold text-white">Does COSY.AI work offline?</h3>
              <p className="text-xs text-slate-300">
                Yes! The PWA caches cached app resources and canvas state so you can work even
                without an internet connection.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 px-6 text-center text-xs text-slate-500">
        © 2026 COSY.AI Visual Code Engine. All rights reserved.
      </footer>
    </div>
  );
}
