import dns from "node:dns/promises";
import net from "node:net";

// outgoing webhooks are user supplied URLs: refuse anything that points inside our network (SSRF)
const isPrivateIp = (ip) => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v = ip.toLowerCase();
  return (
    v === "::1" ||
    v === "::" ||
    v.startsWith("fc") ||
    v.startsWith("fd") ||
    v.startsWith("fe80") ||
    v.startsWith("::ffff:")
  );
};

export const assertPublicHttpsUrl = async (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "https:") throw new Error("Webhook URL must use https");
  if (url.username || url.password) throw new Error("Credentials in the URL are not allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error("Webhook URL must point to a public host");
  }
  return url;
};

// POST json with a hard timeout, no redirects, and a capped response size
export const postJson = async (value, body, headers = {}, timeoutMs = 8000) => {
  const url = await assertPublicHttpsUrl(value);
  const res = await fetch(url, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "Content-Type": "application/json", "User-Agent": "TanvirChatapp-Webhook/1.0", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Webhook responded with ${res.status}`);
  const text = (await res.text()).slice(0, 20_000);
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
