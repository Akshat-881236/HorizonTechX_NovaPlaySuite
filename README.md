This is the perfect victory lap for the massive architecture you just built. A project of this scale—handling IndexedDB, Web Audio, proxy scraping, and responsive grid states entirely in Vanilla JS—deserves a top-tier `README.md` that explains exactly how powerful it is to anyone visiting your GitHub.

Here is a comprehensive, highly professional README tailored to the exact specifications, features, and branding of the **NovaPlay Suite** you just finalized.

Copy the block below and save it as `README.md` in the root of your repository.

---

# NovaPlay Suite — Immersive Audio OS 🎵

![NovaPlay Version](https://img.shields.io/badge/Version-2.0.0-8b5cf6?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Tech-Vanilla_JS_|_HTML5_|_CSS3-101014?style=for-the-badge&logo=javascript)
![Storage](https://img.shields.io/badge/Storage-IndexedDB-f43f5e?style=for-the-badge)

**NovaPlay Suite** is a high-performance, client-side media management hub. Built entirely without external frameworks, it operates as a "Thick Client" Progressive Web App (PWA) that merges local offline storage with live, full-length audio scraping from public web pipes. 

Designed by [Akshat Prasad](https://github.com/akshat-881236) under the **[Akshat Network Hub](https://akshat-881236.github.io/AkshatNetworkHub/)**.

---

## ⚡ Core Features

### 🗄️ Offline "Vault" Storage (IndexedDB v2)
- **Local Media Import:** Upload raw audio/video files directly into the browser's permanent storage.
- **Batch Artwork Matrix:** Automatically map and assign custom header artwork to multiple tracks simultaneously during import.
- **Custom Directories:** Create, manage, and map tracks to custom folders and playlists without touching a backend server.

### 🌐 Live Public Audio Pipes
- **Invidious Proxy Engine:** Bypasses standard API limitations by scraping full-length 128kbps M4A audio streams directly from public YouTube proxy nodes (`itag=140`).
- **iTunes Studio Fallback:** Automatically fails over to the official Apple iTunes API for high-quality 30-second studio previews if public nodes are congested.

### 🎛️ Master Media Sink & Visualizer
- **Single-Sink Architecture:** Routes all local blobs and remote URL streams through a solitary, hardware-accelerated `<video>` tag.
- **Web Audio API:** Real-time Fast Fourier Transform (FFT) analysis driving a custom, 60fps HTML5 Canvas frequency visualizer.
- **Dynamic Docking:** Smoothly transitions media from a hidden background audio process to a foreground video/visualizer modal.

### 🛡️ Built-in App Security
- **Domain Lock:** Prevents unauthorized `<iframe>` embedding or domain cloning. 
- **Web Access Codes:** Restricts access on non-whitelisted domains via a custom glassmorphic security gateway. 
- **Blocklist Vault:** Allows users to permanently purge and ban specific tracks or artists from appearing in live search results.

### 📱 7-Tier Airtight Responsiveness
Engineered with a fluid CSS Grid and mathematically precise `@media` queries to ensure pixel-perfect rendering across:
1. Mini Phones (< 360px)
2. Standard Smartphones
3. Phablets
4. Tablets / iPads
5. Laptops
6. Ultra-Wide Monitors
7. 4K Smart Boards (> 2100px)

---

## 🛠️ Tech Stack

This project is a testament to the power of the modern browser. It uses **Zero Dependencies**.

* **Structure:** HTML5 (Semantic, SEO-Optimized)
* **Styling:** CSS3 (CSS Grid, Flexbox, Custom Properties, Glassmorphism, CSS Animations)
* **Logic:** Vanilla JavaScript (ES6+ Classes, Async/Await, Promises)
* **Data:** IndexedDB API, Web Storage API
* **Audio/Video:** HTML5 Media Elements, Web Audio API, Canvas API

---

## 🚀 Installation & Usage

Because NovaPlay Suite relies on client-side rendering and IndexedDB, it requires a local server to run properly (browsers restrict IndexedDB on raw `file://` protocols).

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/akshat-881236/HorizonTechX_NovaPlaySuite.git](https://github.com/akshat-881236/HorizonTechX_NovaPlaySuite.git)

```

2. **Navigate to the directory:**
```bash
cd HorizonTechX_NovaPlaySuite

```


3. **Run a Local Web Server:**
* If using VS Code, click **"Go Live"** via the Live Server extension.
* Or use Python: `python -m http.server 8000`
* Or use Node.js: `npx serve`


4. **Security Note:** If you deploy this to a domain other than `akshat-881236.github.io` or `localhost`, the app will lock. You must enter one of the predefined `AppCodes` located in the `<head>` of `index.html` to unlock the UI.

---

## 📂 File Structure

```text
HorizonTechX_NovaPlaySuite/
├── index.html       # The Core OS (UI, DB Engine, Audio Sink, Auth)
├── 403.html         # Custom Access Denied Interface
├── 404.html         # Custom Sector Not Found Interface
├── 500.html         # Custom System Failure Interface
├── novaplay.svg     # Optimized Favicon (Base64 SVG)
├── robots.txt       # Search Engine Crawler Directives
└── sitemap.xml      # SPA Routing Map
```

---

## ⚖️ License & Attribution

Developed by **Akshat Prasad**.
UI/UX Architecture inspired by Spatial Computing, OLED Dark Modes, and modern Glassmorphism.

*Internal Asset ID: `NovaPlay-Suite-Proprietary-v2*`

```

```
