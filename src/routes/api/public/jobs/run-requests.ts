import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/run-requests")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rows } = await supabaseAdmin
          .from("scheduled_requests")
          .select("id, url")
          .eq("enabled", true);
        const results = await Promise.allSettled(
          (rows ?? []).map(async (r) => {
            let status = 0;
            let result: unknown;
            try {
              const res = await fetch(r.url, { headers: { accept: "application/json" } });
              status = res.status;
              const text = await res.text();
              try { result = JSON.parse(text); } catch { result = { raw: text.slice(0, 2000) }; }
            } catch (e) {
              result = { error: String(e) };
            }
            await supabaseAdmin
              .from("scheduled_requests")
              .update({ last_run_at: new Date().toISOString(), last_status: status, last_result: result as never })
              .eq("id", r.id);
          }),
        );
        return Response.json({ ran: results.length });
      },
    },
  },
});
