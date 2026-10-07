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
- 🚀 Easy Deployment (free-tier friendly with Sevalla)

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
```

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
