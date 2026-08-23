import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { ArrowRight, Binary, CheckCircle2, ChevronRight, Cpu, Eye, Fingerprint, Image as ImageIcon, ShieldAlert, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { ModelStatusBadge } from "@/components/ModelStatusBadge";
import { VisionMark } from "@/components/VisionMark";
import { trpc } from "@/lib/trpc";

const steps = [
  { step: "01", title: "Upload", text: "Choose a supported image from your device. Type and file-size checks happen before a request is sent.", icon: ImageIcon },
  { step: "02", title: "Analyze", text: "When a real endpoint is connected, VisionVerify passes the image to the configured model layer.", icon: Cpu },
  { step: "03", title: "Review", text: "Read a cautious, timestamped assessment with its model provenance and only returned evidence.", icon: Eye },
];

const foundations = [
  { title: "Computer vision", text: "A structured path from pixels to image features.", icon: Eye },
  { title: "Deep learning", text: "A pluggable model layer for transfer-learning approaches.", icon: Binary },
  { title: "Image forensics", text: "Evidence is shown only when the backend returns it.", icon: Fingerprint },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const state = trpc.analysis.modelState.useQuery(undefined, { retry: false });
  const workspaceHref = "/workspace";

  return (
    <div className="app-shell overflow-hidden">
      <div className="noise-grid absolute inset-x-0 top-0 h-[680px] opacity-70" />
      <header className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <VisionMark />
        <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex" aria-label="Main navigation">
          <a href="#how-it-works" className="transition-colors hover:text-white">How it works</a>
          <Link href="/technology" className="transition-colors hover:text-white">Technology</Link>
          <Link href="/about" className="transition-colors hover:text-white">Limitations</Link>
        </nav>
        {isAuthenticated ? <Link href={workspaceHref} className="text-sm font-medium text-zinc-200 hover:text-white">Open workspace <ChevronRight className="inline h-4 w-4" /></Link> : <button onClick={() => startLogin()} className="text-sm font-medium text-zinc-200 transition-colors hover:text-white">Sign in <ChevronRight className="inline h-4 w-4" /></button>}
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl gap-14 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-36 lg:pt-24">
          <div>
            <p className="eyebrow">AI / ML research prototype</p>
            <h1 className="font-display mt-6 max-w-3xl text-5xl leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">See beyond<br /><em className="text-violet-200">the pixels.</em></h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">VisionVerify is a research-oriented interface for evaluating an image through an attached authenticity model—presenting uncertain findings honestly, with traceable model context.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={workspaceHref}><Button className="h-12 w-full rounded-xl bg-violet-200 px-6 text-sm font-semibold text-violet-950 hover:bg-white sm:w-auto">Analyze an image <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
              <Link href="/technology"><Button variant="outline" className="h-12 w-full rounded-xl border-white/14 bg-white/[0.03] px-6 text-sm text-zinc-200 hover:bg-white/8 hover:text-white sm:w-auto">Explore methodology</Button></Link>
            </div>
            <div className="mt-8"><ModelStatusBadge state={state.data} withMessage /></div>
          </div>
          <div className="relative mx-auto w-full max-w-[540px] lg:justify-self-end">
            <div className="hero-orb -right-16 -top-14" />
            <div className="relative overflow-hidden rounded-[1.9rem] border border-white/12 bg-[#14111b] p-3 shadow-2xl shadow-black/40">
              <div className="relative aspect-[1.14] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[radial-gradient(circle_at_70%_28%,rgba(196,170,255,0.45),transparent_15%),radial-gradient(circle_at_28%_60%,rgba(96,47,175,0.66),transparent_32%),linear-gradient(135deg,#261c37,#0c0a10_74%)]">
                <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="absolute left-[13%] top-[18%] h-[54%] w-[57%] rounded-[35%_58%_43%_49%] border border-violet-100/40 bg-violet-300/10 shadow-[0_0_80px_rgba(159,122,234,.25)]" />
                <div className="absolute left-[21%] top-[28%] h-[30%] w-[30%] rounded-full border border-white/30 bg-white/10 blur-[1px]" />
                <div className="scan-line" />
                <div className="absolute left-5 top-5 rounded-lg border border-white/14 bg-black/20 px-3 py-2 font-mono text-[10px] tracking-[0.12em] text-violet-100">VISUAL SIGNALS / 01</div>
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between rounded-xl border border-white/12 bg-black/30 p-4 backdrop-blur-md"><div><p className="font-mono text-[10px] tracking-[0.12em] text-zinc-400">ASSESSMENT LAYER</p><p className="mt-1 text-sm text-zinc-100">Model-aware analysis</p></div><Sparkles className="h-5 w-5 text-violet-200" /></div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/8 bg-white/[0.025]" id="how-it-works">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <div className="max-w-2xl"><p className="eyebrow">Methodical by design</p><h2 className="font-display mt-4 text-4xl tracking-[-0.03em] text-white sm:text-5xl">A transparent path from file to finding.</h2></div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">{steps.map(({ step, title, text, icon: Icon }) => <div key={step} className="rounded-2xl border border-white/8 bg-[#0d0c11] p-6"><div className="flex items-start justify-between"><span className="font-mono text-xs text-violet-200">{step}</span><Icon className="h-5 w-5 text-zinc-500" /></div><h3 className="mt-12 text-lg font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-zinc-400">{text}</p></div>)}</div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><div><p className="eyebrow">Built for learning</p><h2 className="font-display mt-4 text-4xl tracking-[-0.03em] text-white sm:text-5xl">A focused computer-vision study, not a black box.</h2></div><p className="max-w-xl text-base leading-7 text-zinc-400">VisionVerify keeps the interface separate from its model adapter. That makes it possible to evolve the underlying architecture—from CNN to a transfer-learning approach—without changing the user’s experience or overstating a result.</p></div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">{foundations.map(({ title, text, icon: Icon }) => <div key={title} className="glass-panel rounded-2xl p-6"><Icon className="h-5 w-5 text-violet-200" /><h3 className="mt-8 font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p></div>)}</div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8"><div className="relative overflow-hidden rounded-3xl border border-violet-300/15 bg-violet-300/[0.07] p-8 sm:p-12"><div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-300/15 blur-3xl" /><ShieldAlert className="h-7 w-7 text-violet-200" /><h2 className="font-display mt-5 max-w-3xl text-3xl text-white sm:text-4xl">A model result is a signal, not definitive forensic proof.</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">VisionVerify is a research and educational prototype. Connected models can make mistakes, and novel manipulation techniques may not be represented in their data. Always apply independent judgment and appropriate forensic procedures.</p><Link href="/about" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-violet-100 hover:text-white">Read limitations <ArrowRight className="h-4 w-4" /></Link></div></section>
      </main>
      <footer className="border-t border-white/8 py-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 text-xs text-zinc-600 sm:flex-row sm:px-8"><span>VisionVerify · AI/ML research prototype</span><span>See beyond the pixels.</span></div></footer>
    </div>
  );
}
