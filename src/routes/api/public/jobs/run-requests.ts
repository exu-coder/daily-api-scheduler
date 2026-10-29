import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { callLike } from "@/lib/like-api";

export const Route = createFileRoute("/api/public/jobs/run-requests")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rows } = await supabaseAdmin.from("daily_uids").select("uid");
        const list = rows ?? [];
        for (let i = 0; i < list.length; i += 10) {
          await Promise.allSettled(
            list.slice(i, i + 10).map(async ({ uid }) => {
              const result = await callLike(uid);
              await supabaseAdmin.from("daily_uids")
                .update({ last_run_at: new Date().toISOString(), last_result: result as never })
                .eq("uid", uid);
            }),
          );
        }
        return Response.json({ ran: list.length });
      },
    },
  },
});
