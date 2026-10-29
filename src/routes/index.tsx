import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getUid, removeUid, sendLike } from "@/lib/requests.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dawn Run — Free Daily Likes at 4AM" },
      { name: "description", content: "Enter your UID once and get likes sent automatically every day at 4 AM Dhaka time." },
      { property: "og:title", content: "Dawn Run — Free Daily Likes at 4AM" },
      { property: "og:description", content: "Enter your UID once and get likes every day at 4 AM Dhaka time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Like = {
  LikesGivenByAPI?: number; LikesafterCommand?: number; LikesbeforeCommand?: number;
  PlayerNickname?: string; UID?: number; remains?: string; status?: number; error?: string;
};
type Saved = { uid: string; last_run_at: string | null; last_result: Like | null };

function useCountdown() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  if (!now) return ["--", "--", "--"];
  const n = new Date(now); n.setUTCHours(22, 0, 0, 0); // 04:00 Dhaka
  if (n <= now) n.setUTCDate(n.getUTCDate() + 1);
  const s = Math.floor((n.getTime() - now.getTime()) / 1000);
  return [s / 3600, (s % 3600) / 60, s % 60].map((x) => String(Math.floor(x)).padStart(2, "0"));
}

function Index() {
  const send = useServerFn(sendLike);
  const fetchUid = useServerFn(getUid);
  const remove = useServerFn(removeUid);
  const [uid, setUid] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [h, m, s] = useCountdown();

  useEffect(() => {
    const u = localStorage.getItem("myUid");
    if (u) { setUid(u); fetchUid({ data: { uid: u } }).then((r) => setSaved(r.row ? JSON.parse(r.row) : null)).catch(() => {}); }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = uid.trim();
    if (!/^\d{5,15}$/.test(v)) { setErr("Enter a valid UID (numbers only)."); return; }
    setErr(""); setBusy(true);
    try {
      const r = await send({ data: { uid: v } });
      localStorage.setItem("myUid", v);
      setSaved({ uid: v, last_run_at: new Date().toISOString(), last_result: JSON.parse(r.result) });
    } catch (e) {
      setErr("Couldn't reach the like server. Try again in a minute.");
    } finally { setBusy(false); }
  }

  async function stop() {
    if (!saved) return;
    await remove({ data: { uid: saved.uid } });
    localStorage.removeItem("myUid");
    setSaved(null); setUid("");
  }

  const d = saved?.last_result ?? null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <span className="font-display text-2xl tracking-tight">Dawn Run<span className="text-accent3">.</span></span>
        <span className="rounded-full border border-border px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">Server · BD</span>
      </header>

      <section className="px-6 pb-16 pt-8 md:px-12 md:pt-16">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Free daily likes</p>
        <h1 className="font-display mt-4 max-w-5xl text-5xl leading-[0.95] md:text-8xl">
          Drop your UID.<br /><span className="text-accent2">Wake up</span> to likes.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Enter your player UID once. We send likes right now, then again every morning at 4:00 AM Dhaka time — automatically.
        </p>

        <form onSubmit={submit} className="mt-10 flex max-w-2xl flex-col gap-3 rounded-[2rem] border-2 border-foreground p-2 sm:flex-row">
          <input
            inputMode="numeric" value={uid} onChange={(e) => setUid(e.target.value.replace(/\D/g, ""))}
            placeholder="Your UID, e.g. 7485090181"
            className="flex-1 bg-transparent px-5 py-4 text-xl outline-none placeholder:text-muted-foreground"
          />
          <button disabled={busy} className="rounded-[1.5rem] bg-foreground px-8 py-4 text-lg font-medium text-background transition hover:bg-accent disabled:opacity-50">
            {busy ? "Sending likes…" : "Send likes"}
          </button>
        </form>
        {err && <p className="mt-3 text-destructive">{err}</p>}
        {busy && <p className="mt-3 text-sm text-muted-foreground">This can take up to a minute while the server wakes up.</p>}
      </section>

      {saved && (
        <section className="border-y border-border">
          <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-8 md:px-12">
            <div>
              <p className="text-sm text-muted-foreground">UID {saved.uid}</p>
              <h2 className="font-display text-4xl md:text-6xl">{d?.PlayerNickname ?? "Player"}</h2>
            </div>
            <span className={`rounded-full px-4 py-2 text-sm ${d?.status === 1 ? "bg-accent text-accent-foreground" : "bg-muted text-foreground"}`}>
              {d?.error ? "Error" : d?.status === 1 ? "✓ Likes sent" : "Already liked today — try tomorrow"}
            </span>
          </div>
          <div className="grid gap-px bg-border md:grid-cols-3">
            <Stat label="Likes given" value={d?.LikesGivenByAPI} color="text-accent" />
            <Stat label="Before" value={d?.LikesbeforeCommand} color="text-accent2" />
            <Stat label="After" value={d?.LikesafterCommand} color="text-accent3" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 text-sm text-muted-foreground md:px-12">
            <span>{saved.last_run_at ? `Last sent ${new Date(saved.last_run_at).toLocaleString()}` : ""}{d?.remains ? ` · Remaining ${d.remains}` : ""}{d?.error ? ` · ${d.error}` : ""}</span>
            <button onClick={stop} className="underline underline-offset-4 hover:text-destructive">Stop daily likes</button>
          </div>
        </section>
      )}

      <section className="grid gap-12 px-6 py-20 md:grid-cols-2 md:px-12">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-accent3">Next automatic run</p>
          <div className="font-display mt-4 flex gap-4 text-6xl tabular-nums md:text-8xl">
            {[[h, "hrs"], [m, "min"], [s, "sec"]].map(([v, l]) => (
              <div key={l}><div>{v}</div><div className="text-sm font-sans text-muted-foreground">{l}</div></div>
            ))}
          </div>
        </div>
        <ol className="space-y-6">
          {["Enter your UID — no account needed.", "Likes are sent instantly.", "Every day at 4:00 AM Dhaka, we send them again."].map((t, i) => (
            <li key={i} className="flex gap-5 border-b border-border pb-6">
              <span className="font-display text-3xl text-accent2">0{i + 1}</span>
              <span className="pt-2 text-lg">{t}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value?: number | undefined; color: string }) {
  return (
    <div className="bg-background px-6 py-10 md:px-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={`font-display mt-2 text-6xl md:text-7xl ${color}`}>{value ?? "—"}</p>
    </div>
  );
}
