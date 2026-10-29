import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { proxyGet } from "@/lib/proxy.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dawn Run — Daily 4AM Like Sender" },
      { name: "description", content: "Send like requests to your API and run them automatically every day at 4 AM." },
      { property: "og:title", content: "Dawn Run — Daily 4AM Like Sender" },
      { property: "og:description", content: "Send like requests to your API every day at 4 AM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Like = {
  LikesGivenByAPI?: number;
  LikesafterCommand?: number;
  LikesbeforeCommand?: number;
  Owner?: string;
  PlayerNickname?: string;
  UID?: number;
  remains?: string;
  status?: number;
};
type Status = {
  ok?: boolean;
  refresh?: { last_refresh_iso?: string; running?: boolean; last_result?: { accounts?: number; failures?: number } };
  schedule?: { daily_at?: string };
  token_files?: Record<string, number>;
};
type LogItem = { at: string; uid: string; data?: Like; error?: string };

function useStored(key: string, init: string) {
  const [v, setV] = useState(init);
  useEffect(() => {
    const s = localStorage.getItem(key);
    if (s !== null) setV(s);
  }, [key]);
  return [v, (x: string) => { setV(x); localStorage.setItem(key, x); }] as const;
}

function Index() {
  const call = useServerFn(proxyGet);
  const [likeUrl, setLikeUrl] = useStored("likeUrl", "https://your-api.com/like?uid={uid}&server_name=bd");
  const [statusUrl, setStatusUrl] = useStored("statusUrl", "https://your-api.com/");
  const [uids, setUids] = useStored("uids", "");
  const [auto, setAuto] = useStored("auto", "1");
  const [log, setLog] = useState<LogItem[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  const list = uids.split(/[\s,]+/).filter(Boolean);

  async function runAll() {
    setBusy(true);
    for (const uid of list) {
      try {
        const r = await call({ data: { url: likeUrl.replace("{uid}", encodeURIComponent(uid)) } });
        setLog((l) => [{ at: new Date().toLocaleTimeString(), uid, data: JSON.parse(r.json) }, ...l]);
      } catch (e) {
        setLog((l) => [{ at: new Date().toLocaleTimeString(), uid, error: String(e) }, ...l]);
      }
    }
    setBusy(false);
  }

  async function checkStatus() {
    try {
      const r = await call({ data: { url: statusUrl } });
      setStatus(JSON.parse(r.json));
    } catch {
      setStatus({ ok: false });
    }
  }

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    setNow(new Date());
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!now || auto !== "1" || busy) return;
    if (now.getHours() === 4 && now.getMinutes() === 0 && now.getSeconds() === 0) {
      const key = "lastRun";
      const today = now.toDateString();
      if (localStorage.getItem(key) !== today) {
        localStorage.setItem(key, today);
        runAll();
      }
    }
  }, [now]);

  const next = (() => {
    if (!now) return "--:--:--";
    const n = new Date(now);
    n.setHours(4, 0, 0, 0);
    if (n <= now) n.setDate(n.getDate() + 1);
    const s = Math.floor((n.getTime() - now.getTime()) / 1000);
    return [s / 3600, (s % 3600) / 60, s % 60].map((x) => String(Math.floor(x)).padStart(2, "0")).join(":");
  })();

  const latest = log.find((l) => l.data)?.data;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-5 md:px-12">
        <span className="font-display text-2xl">Dawn Run</span>
        <span className="text-sm text-muted-foreground">Daily at 04:00</span>
      </header>

      <section className="px-6 py-16 md:px-12 md:py-24">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Next automatic run in</p>
        <h1 className="font-display mt-4 text-6xl leading-none md:text-9xl tabular-nums">{next}</h1>
        <div className="mt-10 flex flex-wrap gap-3">
          <button onClick={runAll} disabled={busy || !list.length}
            className="rounded-full bg-foreground px-8 py-4 text-background transition hover:opacity-80 disabled:opacity-40">
            {busy ? "Sending…" : `Send now (${list.length})`}
          </button>
          <button onClick={() => setAuto(auto === "1" ? "0" : "1")}
            className="rounded-full border border-foreground px-8 py-4 transition hover:bg-foreground hover:text-background">
            Auto 4AM: {auto === "1" ? "On" : "Off"}
          </button>
        </div>
      </section>

      <section className="grid gap-px border-y border-border bg-border md:grid-cols-3">
        <Stat label="Likes given" value={latest?.LikesGivenByAPI} color="text-accent" />
        <Stat label="Before" value={latest?.LikesbeforeCommand} color="text-accent2" />
        <Stat label="After" value={latest?.LikesafterCommand} color="text-accent3" />
      </section>

      <section className="grid gap-12 px-6 py-16 md:grid-cols-2 md:px-12">
        <div className="space-y-6">
          <h2 className="font-display text-4xl">Setup</h2>
          <Field label="Like URL (use {uid})" value={likeUrl} onChange={setLikeUrl} />
          <label className="block">
            <span className="text-sm text-muted-foreground">Player UIDs (one per line)</span>
            <textarea value={uids} onChange={(e) => setUids(e.target.value)} rows={5}
              className="mt-2 w-full border-b border-foreground bg-transparent py-2 outline-none" placeholder="7485090181" />
          </label>
          <Field label="Status URL" value={statusUrl} onChange={setStatusUrl} />
          <button onClick={checkStatus} className="text-sm underline underline-offset-4">Check API status</button>
          {status && (
            <div className="rounded-2xl border border-border p-5 text-sm space-y-1">
              <p><b className={status.ok ? "text-accent" : "text-destructive"}>{status.ok ? "● Online" : "● Offline"}</b></p>
              {status.refresh && <p>Last refresh: {status.refresh.last_refresh_iso ? new Date(status.refresh.last_refresh_iso).toLocaleString() : "-"}</p>}
              {status.refresh?.last_result && <p>Accounts: {status.refresh.last_result.accounts} · Failures: {status.refresh.last_result.failures}</p>}
              {status.schedule?.daily_at && <p>Token schedule: {status.schedule.daily_at}</p>}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display text-4xl">Results</h2>
          <ul className="mt-6 divide-y divide-border">
            {log.length === 0 && <li className="py-4 text-muted-foreground">No requests yet.</li>}
            {log.map((l, i) => (
              <li key={i} className="py-4">
                <div className="flex justify-between text-sm text-muted-foreground"><span>UID {l.uid}</span><span>{l.at}</span></div>
                {l.error ? <p className="text-destructive">{l.error}</p> : (
                  <>
                    <p className="text-xl">{l.data?.PlayerNickname ?? "—"}
                      <span className={`ml-2 text-sm ${l.data?.status === 1 ? "text-accent" : "text-accent3"}`}>
                        {l.data?.status === 1 ? "Success" : "Already liked / failed"}
                      </span>
                    </p>
                    <p className="text-sm">+{l.data?.LikesGivenByAPI ?? 0} likes · {l.data?.LikesbeforeCommand} → {l.data?.LikesafterCommand} · {l.data?.remains}</p>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <footer className="border-t border-border px-6 py-6 text-sm text-muted-foreground md:px-12">
        Keep this page open for the 4 AM auto run.
      </footer>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value?: number | undefined; color: string }) {
  return (
    <div className="bg-background p-8 md:p-12">
      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={`font-display mt-3 text-6xl ${color}`}>{value ?? "—"}</p>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border-b border-foreground bg-transparent py-2 outline-none" />
    </label>
  );
}
