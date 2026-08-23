import { ScanLine } from "lucide-react";
import { Link } from "wouter";

export function VisionMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 group" aria-label="VisionVerify home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/40 bg-violet-300/10 text-violet-100 shadow-[0_0_28px_rgb(167_139_250/0.18)] transition-transform duration-200 group-hover:scale-105">
        <ScanLine className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </span>
      {!compact && (
        <span className="text-[0.78rem] font-semibold tracking-[0.18em] text-white">VISIONVERIFY</span>
      )}
    </Link>
  );
}
