import { createServerFn } from "@tanstack/react-start";

export const proxyGet = createServerFn({ method: "POST" })
  .inputValidator((input: { url: string }) => {
    const u = new URL(input.url);
    if (!/^https?:$/.test(u.protocol)) throw new Error("Invalid URL");
    return { url: u.toString() };
  })
  .handler(async ({ data }) => {
    const res = await fetch(data.url, { headers: { accept: "application/json" } });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 2000) };
    }
    return { status: res.status, json: JSON.stringify(json) };
  });
