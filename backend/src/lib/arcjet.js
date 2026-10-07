import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";

import { ENV } from "./env.js";

const aj = arcjet({
  key: ENV.ARCJET_KEY,
  rules: [
    // Shield protects your app from common attacks e.g. SQL injection
    shield({ mode: "LIVE" }),
    // Create a bot detection rule
    // The web app reaches this API through Vercel's proxy, so every visitor arrives from a data-center
    // address. In LIVE mode that made Arcjet answer "Bot access denied" to real phones and browsers.
    // Credential stuffing is handled by our own per-account / per-IP limiters, so this only logs now.
    detectBot({
      mode: "DRY_RUN", // "LIVE" blocks requests
      // Block all bots except the following
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        // Uncomment to allow these other common bot categories
        // See the full list at https://arcjet.com/bot-list
        //"CATEGORY:MONITOR", // Uptime monitoring services
        //"CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
      ],
    }),
    // Create a token bucket rate limit. Other algorithms are supported.
    // visitors share the proxy's address, so this is a flood guard for the whole site, not a per-person cap
    slidingWindow({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      max: 900,
      interval: 60,
    }),
  ],
});

export default aj;
