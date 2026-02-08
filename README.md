# HEIC to JPG Converter

A high-performance, client-side HEIC to JPG conversion tool powered by WebAssembly.

## 🏗️ Architecture

The project follows a modern "static-first" architecture with client-side processing:

- **Frontend**: deeply optimized HTML5, CSS3 (variables), and Vanilla JS (ES6 modules). No build step required for development.
- **Core Engine**: `heic_converter.wasm` compiled from libheif/libde265, handling image decoding entirely in the browser.
- **Workers API**: A separate Cloudflare Worker project (`workers-api/`) handling API endpoints for Pro users and integrations.

## 📂 Directory Structure

```
project/
├── assets/               # Static resources
│   ├── css/              # Modular CSS files
│   ├── js/               # Application logic (WasmLoader, WorkerPool)
│   └── wasm/             # WebAssembly binaries
├── samples/              # HEIC Gallery resources
│   ├── images/           # Source HEIC files
│   ├── previews/         # Generated JPG thumbnails
│   └── metadata.json     # Image data registry
├── temp_scripts/         # Python maintenance scripts
│   ├── analyze_heic.py   # Metadata extraction
│   └── generate_thumbnails.py
├── workers-api/          # Cloudflare Worker backend
└── *.html                # Static pages
```

## 🚀 Key Features

- **Client-Side Privacy**: All conversion happens locally in the user's browser. No images are uploaded.
- **Bot Optimization**: Smart detection skips loading heavy WASM modules for crawlers to save bandwidth and improve SEO.
- **Responsive Gallery**: A dynamic samples gallery with metadata extraction and instant search.
- **Performance**:
  - Web Workers for non-blocking UI.
  - Lazy loading for images and scripts.
  - Efficient resource management.

## 🛠️ Development

1. **Serve locally**:
   ```bash
   npx serve
   ```
2. **Workers API**:
   ```bash
   cd workers-api
   npx wrangler dev
   ```

## 🤖 Maintenance

- **Scripts**: Useful Python scripts are located in `temp_scripts/` for tasks like generating thumbnails or analyzing new sample images.
