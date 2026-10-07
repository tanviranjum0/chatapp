<h1 align="center">✨ Full-Stack Chat App with Auth & Emails ✨</h1>

![Demo App](/frontend/public/screenshot-for-readme.png)

Highlights:

- 🔐 Custom JWT Authentication (no 3rd-party auth)
- ⚡ Real-time Messaging via Socket.io
- 🟢 Online/Offline Presence Indicators
- 🔔 Notification & Typing Sounds (with toggle)
- 📨 Welcome Emails on Signup (Resend)
- 🗂️ Image Uploads (Cloudinary)
- 🧰 REST API with Node.js & Express
- 🧱 MongoDB for Data Persistence
- 🚦 API Rate-Limiting powered by Arcjet
- 🎨 Beautiful UI with React, Tailwind CSS & Motion (animations)
- 🧠 Zustand for State Management
- 🧑‍💻 Git & GitHub Workflow (branches, PRs, merges)
- 🚀 Easy Deployment (Render for the API, Vercel for the web app)

### Productivity & UX

- ✏️ Edit, 🗑️ delete (for everyone), ↩️ reply-to quotes and ➡️ forward messages (up to 5 chats at once)
- 😀 Emoji reactions (one per person, tap to toggle), emoji picker and big "stickers"
- 🔎 In-chat search over messages, file names and photos - jumps to the original message
- 📎 File sharing (PDF, Office, zip, audio, mp4 up to 4MB) plus rich cards for Google Drive / Docs, Dropbox, OneDrive and GitHub links
- 📞 Voice & 🎥 video calls with WebRTC (peer to peer, mute / camera toggle, ring / decline / busy handling)
- 🌗 Dark / light / system theme, text size up to 130%, high contrast and reduce motion modes

### Accounts & reliability

- 📧 Email verification at sign up (6-digit code, 10 minutes, 5 tries) and optional two-factor login codes (Settings → Security)
- 🖼️ "Add a profile picture" pop up right after sign up (photos are resized in the browser first)
- 🔎 People are found by searching a name or the start of an email address - the user list is never shown
- 🔔 Unread badges, last-message previews, read receipts and a live unread count in the tab title; the chat list updates by itself
- 🛟 One error format everywhere (`{ message, code }`), retries for a sleeping server, offline / reconnecting banner, crash screen
- 🎙️ Calls: speaker menu / mute, local recording (the other person is told), screen sharing in voice and video calls

### Modern / AI add-ons

- ✨ Smart reply suggestions for the last message
- 🌍 Per-message and live (auto) translation into 20 languages
- 🤖 Bots & integrations: incoming webhooks, signed outgoing webhooks, and a built-in AI Assistant bot


---

## 🧪 .env Setup

### Backend (`/backend`)

```bash
PORT=3000
MONGO_URI=your_mongo_uri_here

NODE_ENV=development

JWT_SECRET=your_jwt_secret

RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=your_email_from_address
EMAIL_FROM_NAME=your_email_from_name

CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

ARCJET_KEY=your_arcjet_key
ARCJET_ENV=development

# optional - AI smart replies / translation / "AI Assistant" bot (falls back to free heuristics when empty)
ANTHROPIC_API_KEY=
AI_MODEL=claude-haiku-4-5-20251001

# optional - TURN relay so calls also work behind strict NATs and firewalls
TURN_URLS=turn:turn.example.com:3478,turns:turn.example.com:5349
TURN_USERNAME=
TURN_CREDENTIAL=
```

### Bots & webhooks

Create a bot from the 🤖 button in the sidebar.

- **Incoming** - `POST <incoming url> {"text":"Deploy finished"}` and the bot messages you. No cookies needed, so it works from scripts and CI.
- **Outgoing** - set an https URL and every message you send the bot is POSTed there as JSON
  (`{event, bot, from, message}`) with an `X-Chatapp-Signature: sha256=<hmac>` header (HMAC-SHA256 of the raw JSON body keyed with the bot's incoming token). Reply with `{"text":"..."}` to answer.
  Private / local addresses are blocked.

### API additions

| Method | Path | Purpose |
| --- | --- | --- |
| PATCH | `/api/messages/edit/:id` | edit own message |
| DELETE | `/api/messages/:id` | delete own message for everyone |
| POST | `/api/messages/react/:id` | toggle / swap your reaction |
| POST | `/api/messages/forward` | forward a message to up to 5 users |
| GET | `/api/messages/contacts?q=` | find people by name / email prefix (min 2 chars) |
| POST | `/api/messages/read/:userId` | mark a conversation as read |
| POST | `/api/auth/signup`, `/verify-signup`, `/login`, `/verify-login`, `/resend-code` | email-code sign up and 2FA login |
| POST | `/api/auth/two-factor/start`, `/confirm`, `/disable` | manage two-factor authentication |
| POST | `/api/ai/translate-batch` | translate up to 20 messages at once |
| GET | `/api/messages/search/:userId?q=&type=files` | search a conversation |
| GET | `/api/messages/:userId?around=:messageId` | history window around a message |
| POST | `/api/ai/suggestions`, `/api/ai/translate` | smart replies, translation |
| GET/POST/PATCH/DELETE | `/api/bots` | manage bots |
| POST | `/api/hooks/:token` | incoming webhook (public) |
| GET | `/api/calls/ice` | ICE / TURN servers for calls |

Call signalling travels over the existing Socket.io connection (`call:signal`); the media never touches the server.

---

## 🔧 Run the Backend

```bash
cd backend
npm install
npm run dev
```

## 💻 Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🚀 Deployment (Vercel + Render)

**Backend → Render** (uses [`render.yaml`](render.yaml))

1. Render dashboard → New → Blueprint → select this repo.
2. Fill in the secrets it asks for (`MONGO_URI`, `JWT_SECRET` 32+ chars, Cloudinary, Resend, Arcjet).
3. Set `CLIENT_URL` to your Vercel URL (no trailing slash; comma separate several).
4. In MongoDB Atlas allow Render's outbound IPs (or `0.0.0.0/0`).
5. Health check: `GET /health`.

**Frontend → Vercel**

1. New Project → import the repo, set **Root Directory** to `frontend` (Vite is auto-detected, `vercel.json` handles SPA routing + caching).
2. Add env var `VITE_API_URL=https://<your-service>.onrender.com/api`.
3. Deploy, then put the resulting URL into Render's `CLIENT_URL`.

Auth uses an `HttpOnly; Secure; SameSite=None` cookie so it works across the two domains.
