import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Activity, BookOpen, History, LayoutDashboard, LogOut, Menu, Plus, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { VisionMark } from "./VisionMark";

const nav = [
  { label: "Overview", href: "/workspace", icon: LayoutDashboard },
  { label: "Analyze image", href: "/workspace/analyze", icon: Activity },
  { label: "Private history", href: "/workspace/history", icon: History },
  { label: "Methodology", href: "/technology", icon: BookOpen },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className="app-shell flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" /></div>;
  }

  if (!user) {
    return (
      <div className="app-shell noise-grid flex min-h-screen items-center justify-center px-5">
        <div className="glass-panel w-full max-w-md rounded-3xl p-8 text-center">
          <div className="mx-auto mb-7 w-fit"><VisionMark /></div>
          <p className="eyebrow">Private workspace</p>
          <h1 className="font-display mt-3 text-4xl text-white">Your analysis history is protected.</h1>
          <p className="mt-4 text-sm leading-6 text-zinc-400">Sign in to submit an image, connect a real model when available, and retain only your own analysis records.</p>
          <Button onClick={() => startLogin()} className="mt-7 w-full bg-violet-200 text-violet-950 hover:bg-white">Sign in to continue</Button>
          <Link href="/" className="mt-5 inline-block text-sm text-zinc-400 transition-colors hover:text-white">Return to VisionVerify</Link>
        </div>
      </div>
    );
  }

  const userInitial = user.name?.charAt(0)?.toUpperCase() ?? "V";
  const sideContent = (
    <>
      <div className="flex h-20 items-center justify-between px-5">
        <VisionMark />
        <button onClick={() => setOpen(false)} className="text-zinc-400 lg:hidden" aria-label="Close workspace navigation"><X className="h-5 w-5" /></button>
      </div>
      <div className="px-3">
        <Link href="/workspace/analyze" onClick={() => setOpen(false)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-200 text-sm font-semibold text-violet-950 transition-transform duration-150 hover:bg-white active:scale-[0.98]">
          <Plus className="h-4 w-4" /> New analysis
        </Link>
      </div>
      <nav className="mt-7 space-y-1 px-3" aria-label="Workspace navigation">
        {nav.map(({ label, href, icon: Icon }) => {
          const selected = href === "/workspace" ? location === href : location.startsWith(href);
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${selected ? "bg-white/8 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"}`}>
              <Icon className="h-4 w-4" strokeWidth={selected ? 2 : 1.6} /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/8 p-4">
        <div className="mb-3 flex items-center gap-3 px-1">
          <Avatar className="h-9 w-9 border border-white/12"><AvatarFallback className="bg-violet-300/15 text-xs text-violet-100">{userInitial}</AvatarFallback></Avatar>
          <div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-100">{user.name ?? "VisionVerify user"}</p><p className="truncate text-xs text-zinc-500">Private account</p></div>
        </div>
        <button onClick={() => logout()} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
      </div>
    </>
  );

  return (
    <div className="app-shell flex min-h-screen">
      <aside className="hidden w-[252px] shrink-0 flex-col border-r border-white/8 bg-black/15 lg:flex">{sideContent}</aside>
      {open && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"><aside className="flex h-full w-[290px] flex-col border-r border-white/10 bg-[#111015] shadow-2xl">{sideContent}</aside></div>}
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-white/8 px-4 lg:px-8">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-zinc-300 hover:bg-white/5 lg:hidden" aria-label="Open workspace navigation"><Menu className="h-5 w-5" /></button>
          <div className="hidden text-xs text-zinc-500 lg:block">VisionVerify <span className="mx-2 text-zinc-700">/</span> Research workspace</div>
          <Link href="/" className="text-xs text-zinc-500 transition-colors hover:text-white">Public site</Link>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-7 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
