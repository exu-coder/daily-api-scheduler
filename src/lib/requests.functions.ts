import { createServerFn } from "@tanstack/react-start";
import { callLike, isValidUid } from "./like-api";

const check = (i: { uid: string }) => {
  const uid = String(i.uid ?? "").trim();
  if (!isValidUid(uid)) throw new Error("UID must be 5–15 digits");
  return { uid };
};

export const sendLike = createServerFn({ method: "POST" })
  .inputValidator(check)
  .handler(async ({ data }) => {
    const result = await callLike(data.uid);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("daily_uids")
      .upsert({ uid: data.uid, last_run_at: new Date().toISOString(), last_result: result as never });
    return { result: JSON.stringify(result) };
  });

export const getUid = createServerFn({ method: "POST" })
  .inputValidator(check)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("daily_uids").select("uid, last_run_at, last_result").eq("uid", data.uid).maybeSingle();
    return { row: row ? JSON.stringify(row) : null };
  });

export const removeUid = createServerFn({ method: "POST" })
  .inputValidator(check)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("daily_uids").delete().eq("uid", data.uid);
    return { ok: true };
  });
