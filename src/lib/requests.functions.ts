import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const runNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("scheduled_requests").select("id, url").eq("id", data.id).single();
    if (!row) throw new Error("Not found");
    let status = 0;
    let result: unknown;
    try {
      const res = await fetch(row.url, { headers: { accept: "application/json" } });
      status = res.status;
      const text = await res.text();
      try { result = JSON.parse(text); } catch { result = { raw: text.slice(0, 2000) }; }
    } catch (e) {
      result = { error: String(e) };
    }
    await context.supabase.from("scheduled_requests")
      .update({ last_run_at: new Date().toISOString(), last_status: status, last_result: result as never })
      .eq("id", row.id);
    return { ok: true };
  });
