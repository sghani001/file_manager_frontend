# CloudVault Frontend

React 19 single-page application for the CloudVault file management platform. Features drag-and-drop uploads, real-time processing status, AI-powered chat assistant, and secure shareable links.

## Stack

- **React 19** + **Vite 8**
- **Axios** — API client
- **Lucide React** — icons
- **Oxlint** — linting

## Quick Start

```bash
npm install
npm run dev
```

Dev server runs on `http://localhost:5173`. Ensure the backend is running on `http://localhost:3000`.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run Oxlint |

## Project Structure

```
src/
├── App.jsx       — Main application (auth, dashboard, chat, share views)
├── App.css       — Application styles
├── main.jsx      — Entry point
└── index.css     — Global styles
```

## Features

- **Drag-and-drop file uploads** with real-time progress bars
- **File listing** with search by name, type, AI tags, and summaries
- **AI chat assistant** — global vault chat and per-file context chat
- **Secure share links** — password-protected, expiring, self-destructing download links
- **Auto-refresh** — file list polls every 3 seconds for status updates

## API Configuration

The backend URL defaults to `http://localhost:3000` and is configured in `src/App.jsx:30`. The auth token is automatically injected via Axios interceptor.

## Production Build

```bash
npm run build
# Serve dist/ via Nginx or copy to Rails public/
```
