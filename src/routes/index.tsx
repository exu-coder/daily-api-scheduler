import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { runNow } from "@/lib/requests.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dawn Run — Daily 4AM Like Sender" },
      { name: "description", content: "Manage API requests that run automatically every day at 4 AM Dhaka time." },
      { property: "og:title", content: "Dawn Run — Daily 4AM Like Sender" },
      { property: "og:description", content: "Manage API requests that run every day at 4 AM Dhaka time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Row = {
  id: string; name: string; url: string; enabled: boolean;
  last_run_at: string | null; last_status: number | null; last_result: any;
};

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  if (!ready) return null;
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-5 md:px-12">
        <span className="font-display text-2xl">Dawn Run</span>
        {session && <button onClick={() => supabase.auth.signOut()} className="text-sm underline">Sign out</button>}
      </header>
      {session ? <Dashboard /> : <Login />}
    </main>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  async function go(signup: boolean) {
    setMsg("");
    const { error } = signup
      ? await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password: pw });
    setMsg(error ? error.message : signup ? "Check your email to confirm." : "");
  }
  return (
    <section className="mx-auto max-w-md px-6 py-24">
      <h1 className="font-display text-5xl">Sign in</h1>
      <input className="mt-8 w-full border-b border-foreground bg-transparent py-2 outline-none" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" className="mt-4 w-full border-b border-foreground bg-transparent py-2 outline-none" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
      <div className="mt-8 flex gap-3">
        <button onClick={() => go(false)} className="rounded-full bg-foreground px-6 py-3 text-background">Sign in</button>
        <button onClick={() => go(true)} className="rounded-full border border-foreground px-6 py-3">Create account</button>
      </div>
      {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}
    </section>
  );
}

function useCountdown() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  if (!now) return "--:--:--";
  // 4 AM Dhaka = 22:00 UTC
  const n = new Date(now); n.setUTCHours(22, 0, 0, 0);
  if (n <= now) n.setUTCDate(n.getUTCDate() + 1);
  const s = Math.floor((n.getTime() - now.getTime()) / 1000);
  return [s / 3600, (s % 3600) / 60, s % 60].map((x) => String(Math.floor(x)).padStart(2, "0")).join(":");
}

function Dashboard() {
  const run = useServerFn(runNow);
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("https://like-p0d2.onrender.com/like?uid=14502384617&server_name=BD&key=exu");
  const [busy, setBusy] = useState<string | null>(null);
  const countdown = useCountdown();

  async function load() {
    const { data } = await supabase.from("scheduled_requests").select("*").order("created_at");
    setRows((data as Row[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!url.trim()) return;
    await supabase.from("scheduled_requests").insert({ name: name || "Request", url: url.trim() });
    setName(""); load();
  }
  async function toggle(r: Row) { await supabase.from("scheduled_requests").update({ enabled: !r.enabled }).eq("id", r.id); load(); }
  async function del(r: Row) { await supabase.from("scheduled_requests").delete().eq("id", r.id); load(); }
  async function send(r: Row) { setBusy(r.id); try { await run({ data: { id: r.id } }); } finally { setBusy(null); load(); } }

  return (
    <>
      <section className="px-6 py-16 md:px-12 md:py-20">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Next run · 04:00 Dhaka</p>
        <h1 className="font-display mt-4 text-6xl leading-none tabular-nums md:text-9xl">{countdown}</h1>
        <p className="mt-6 text-muted-foreground">{rows.filter((r) => r.enabled).length} active requests run automatically — no need to keep this page open.</p>
      </section>

      <section className="border-t border-border px-6 py-12 md:px-12">
        <h2 className="font-display text-4xl">Add request</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_3fr_auto]">
          <input className="border-b border-foreground bg-transparent py-2 outline-none" placeholder="Name (e.g. Main account)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="border-b border-foreground bg-transparent py-2 outline-none" placeholder="API URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button onClick={add} className="rounded-full bg-foreground px-8 py-3 text-background">Add</button>
        </div>
      </section>

      <section className="grid gap-px border-y border-border bg-border md:grid-cols-2">
        {rows.length === 0 && <p className="bg-background p-8 text-muted-foreground">No requests yet.</p>}
        {rows.map((r) => {
          const d = r.last_result ?? {};
          return (
            <article key={r.id} className="bg-background p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-3xl">{d.PlayerNickname ?? r.name}</h3>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{r.url}</p>
                </div>
                <span className={`text-sm ${r.enabled ? "text-accent" : "text-muted-foreground"}`}>{r.enabled ? "● Active" : "○ Paused"}</span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <Stat label="Given" value={d.LikesGivenByAPI} color="text-accent" />
                <Stat label="Before" value={d.LikesbeforeCommand} color="text-accent2" />
                <Stat label="After" value={d.LikesafterCommand} color="text-accent3" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {r.last_run_at ? `Last run ${new Date(r.last_run_at).toLocaleString()} · ` : "Never run · "}
                {d.status === 1 ? "Success" : d.status !== undefined ? "Already liked / failed" : d.error ? d.error : ""}
                {d.UID ? ` · UID ${d.UID}` : ""}{d.remains ? ` · ${d.remains}` : ""}
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-sm">
                <button onClick={() => send(r)} disabled={busy === r.id} className="rounded-full bg-foreground px-5 py-2 text-background disabled:opacity-40">{busy === r.id ? "Sending…" : "Send now"}</button>
                <button onClick={() => toggle(r)} className="rounded-full border border-foreground px-5 py-2">{r.enabled ? "Pause" : "Resume"}</button>
                <button onClick={() => del(r)} className="rounded-full px-5 py-2 text-destructive">Delete</button>
              </div>
            </article>
          );
        })}
      </section>
      <footer className="px-6 py-6 text-sm text-muted-foreground md:px-12">Runs every day at 04:00 Dhaka time.</footer>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value?: number | undefined; color: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={`font-display mt-1 text-4xl ${color}`}>{value ?? "—"}</p>
    </div>
  );
}
