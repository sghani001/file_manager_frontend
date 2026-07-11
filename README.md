<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0A071B,50:1A1235,100:635BFF&height=200&section=header&text=CloudVault%20Frontend&fontSize=48&fontColor=ffffff&fontAlignY=38&desc=React%2019%20SPA%20%C2%B7%20S3%20Uploads%20%C2%B7%20Share%20Links&descSize=18&descAlignY=58&descColor=635BFF" width="100%" />

<br/>

[![React Version](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite Version](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Linter](https://img.shields.io/badge/Oxlint-Active-F8D64E?style=for-the-badge&logo=oxc&logoColor=black)](https://oxc.rs/)

<br/>

> *A single-page dashboard for file management with drag-and-drop uploads, real-time processing status, and secure share links.*

</div>

---

## 🖥️ App Demonstration

<video src="https://github.com/user-attachments/assets/6af1af46-187b-4684-bff1-f42f230711b7" autoplay loop muted playsinline width="100%" style="border-radius: 8px; border: 1px solid #1A1235; max-height: 500px; object-fit: cover;"></video>

---

## 🛠️ Tech Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **UI Library** | `React 19` *(SPA)* | Component-based UI |
| **Build Toolchain** | `Vite 8` | Dev server & HMR bundler |
| **HTTP Client** | `Axios` | API requests with JWT interceptor |
| **Icons** | `Lucide React` | Vector icon library |
| **Linter** | `Oxlint` | Rust-backed static analysis |

---

## ✨ Features

### 📦 File Upload
* **Drag-and-drop** or click-to-select interface for uploading multiple files.
* **Progress bars** show real-time upload status for each file.
* Files stream directly to S3 via presigned URLs — no server-side file buffering.

### 📋 File Dashboard
* **Table view** with file name, size, status (`uploading`, `processing`, `processed`, `failed`), and processing summary.
* **Search** filters by file name, type, and metadata tags/summary from Lambda processing results.
* **Auto-polling** every 3 seconds syncs file status without manual refresh.
* **File preview** — view images, PDFs, and text files in a detail drawer.

### 🔄 Reprocess
* One-click re-invoke of the Lambda processing pipeline for failed or stalled files.

### 🔗 Share Links
* **Token-based sharing** — generate share links with optional passcode protection, expiry time, and download limits.
* **Public access** — recipients can download files without logging in, subject to share constraints.

---

## ⚙️ Project Structure

```
src/
├── App.jsx     — Auth, upload, file list, preview, share views
├── App.css     — Component styles
├── main.jsx    — DOM mounting entry
└── index.css   — Design tokens and CSS variables
```

---

## 🌐 Environment

The API base URL defaults to the same origin (empty string) for production behind nginx. For local development, set `VITE_API_URL` in `.env`:

```
VITE_API_URL=http://localhost:3000
```

An Axios interceptor automatically attaches `Bearer <token>` from `localStorage` to every request.

---

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Runs at `http://localhost:5173`. Make sure the backend is running on port `3000`.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production into `/dist` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run Oxlint |

---

## 📦 Production Build

```bash
npm run build
```

Deploy the `/dist` folder behind nginx (as done in the CloudFormation template) or copy into the Rails `public/` directory.

---

### Built with ⚡ by [Syed Ghani](https://github.com/sghani001)
