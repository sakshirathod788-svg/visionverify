import { CircleAlert, FlaskConical, RadioTower, WifiOff } from "lucide-react";

type Status = { mode: "live" | "demo" | "offline"; available: boolean; label: string; message?: string };

export function ModelStatusBadge({ state, withMessage = false }: { state?: Status; withMessage?: boolean }) {
  const model = state ?? {
    mode: "offline" as const,
    available: false,
    label: "Checking model status",
    message: "Model status is loading.",
  };
  const config = model.mode === "live"
    ? { icon: RadioTower, tone: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100", dot: "bg-emerald-300" }
    : model.mode === "demo"
      ? { icon: FlaskConical, tone: "border-amber-300/20 bg-amber-300/10 text-amber-100", dot: "bg-amber-300" }
      : { icon: WifiOff, tone: "border-violet-300/20 bg-violet-300/10 text-violet-100", dot: "bg-violet-300" };
  const Icon = config.icon;

  return (
    <div className={withMessage ? "space-y-2" : ""}>
      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${config.tone}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
        <Icon className="h-3.5 w-3.5" />
        {model.label}
      </span>
      {withMessage && (
        <p className="flex gap-2 text-xs leading-5 text-zinc-400">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
          {model.message}
        </p>
      )}
    </div>
  );
}
