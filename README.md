<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0A071B,50:1A1235,100:635BFF&height=200&section=header&text=CloudVault%20Frontend&fontSize=48&fontColor=ffffff&fontAlignY=38&desc=Sleek%20React%2019%20SPA%20%C2%B7%20Real-Time%20File%20AI&descSize=18&descAlignY=58&descColor=635BFF" width="100%" />

<br/>

[![React Version](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite Version](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Linter](https://img.shields.io/badge/Oxlint-Active-F8D64E?style=for-the-badge&logo=oxc&logoColor=black)](https://oxc.rs/)

<br/>

> *An immersive, single-page dashboard application built with modern React 19 and Vite, facilitating fluid drag-and-drop file staging, continuous polling state syncs, and context-targeted RAG chat layers.*

</div>

---

## 🖥️ App Demonstration

<video src="https://github.com/user-attachments/assets/6af1af46-187b-4684-bff1-f42f230711b7" autoplay loop muted playsinline width="100%" style="border-radius: 8px; border: 1px solid #1A1235; max-height: 500px; object-fit: cover;"></video>

---

## 🛠️ Tech Stack & Dependencies

The frontend environment is tailored using cutting-edge rendering abstractions and ultra-fast Rust-powered building/linting tooling for instantaneous startup.

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **UI Library** | `React 19` *(SPA)* | Reactive single-page component layout management |
| **Build Toolchain** | `Vite 8` | Hot Module Replacement (HMR) bundler |
| **API Client Pipeline**| `Axios` | Configured async HTTP handshakes & auth injection |
| **Design Assets** | `Lucide React` | High-fidelity, modular vector iconography |
| **Quality Assurance** | `Oxlint` | Rust-backed static code analysis and linting |

---

## ✨ Application Features

### 📦 Seamless Ingestion UI
* **Drag-and-Drop Staging:** High-performance viewport drop zones processing multi-file arrays.
* **Granular Visual Feedback:** Interactive, real-time progress bars tracking direct cloud infrastructure uploads.

### 🔍 Intuitive Resource Discovery
* **Deep Index Querying:** Live dataset filtering across standard attributes (file names, media extensions) alongside deep metadata tags generated via AI (summaries, smart keywords).
* **Autonomous Synchronization:** Non-blocking background worker mechanics running polling routines every 3 seconds to guarantee precise file processing status reflections.

### 💬 Inline AI RAG Agent
* Interacts with user documents across both global context layers (entire cloud vault) or isolated sub-contexts (specific single-file targeting queries).

### 🔒 Cryptographic Share Customization
* Orchestrates target link definitions to inject multi-layered parameters, including access passwords, absolute expiry timers, or automated self-destruct routines upon data delivery.

---

## ⚙️ Structural Architecture


```

src/
├── App.jsx       — Orchestrates authentication states, view changes, chat, and workspaces
├── App.css       — Functional component layout abstractions
├── main.jsx      — Document Object Model mounting lifecycle root
└── index.css     — Core design tokens and system variables

```

---

## 🛰️ Environment & Network Handshakes

The application is architected to route outbound communications dynamically via uniform interceptor pipelines:

* **Inbound Targeting:** The baseline server gateway points natively to `http://localhost:3000` (definable in `src/App.jsx:30`).
* **Stateless Security Pass:** An automated Axios Request Interceptor actively intercepts systemic operations to attach user bearer signatures into standard authorization headers.

---

## 🚀 Getting Started

### Local Workspace Bootstrapping
```bash
# Pull production node packages and module trees
npm install

# Initialize high-speed localized Vite development listener
npm run dev

```

*The interactive environment resolves automatically to `http://localhost:5173`. Ensure your local CloudVault companion backend is up and running concurrently on port `3000`.*

### Automation Scripts Matrix

| Command | Runtime Context Side Effects |
| --- | --- |
| `npm run dev` | Spins up the internal Vite micro-server engine. |
| `npm run build` | Compiles optimized structural minified bundles into the `/dist` pipeline. |
| `npm run preview` | Spins up a localized static proxy layer to evaluate the production build. |
| `npm run lint` | Triggers immediate structural code reviews via Oxlint. |

---

## 📦 Production Delivery & Asset Hosting

To build a compressed compilation suitable for high-performance edge deployment, compile your codebase statically:

```bash
npm run build

```

### Static Serving Deploy Options

1. **Reverse Proxying:** Mount the compiled `/dist` directory files cleanly into a customized server directory block governed by an edge reverse proxy platform like **Nginx**.
2. **Monolithic Rails Assembly:** Move the generated target bundle assets directly into your Ruby on Rails companion folder space (`public/`) to deliver the complete ecosystem through unified application containers.

---

### Built with ⚡ by [Syed Ghani](https://github.com/sghani001)
