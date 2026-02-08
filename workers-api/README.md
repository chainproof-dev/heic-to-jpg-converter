# HEIC to JPG API

A production-ready, edge-based HEIC to JPG/PNG/WebP conversion API powered by WebAssembly on Cloudflare Workers.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy to Cloudflare
npm run deploy
```

## 📡 API Endpoints

### `POST /convert`

Convert a HEIC file to JPG, PNG, or WebP.

**Request:**
```bash
curl -X POST "https://your-worker.workers.dev/convert?quality=90&format=jpg" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @photo.heic \
  -o output.jpg
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `quality` | int | 90 | Output quality (1-100) |
| `format` | string | jpg | Output format (jpg, png, webp) |
| `width` | int | null | Resize width (max 4096) |
| `height` | int | null | Resize height (max 4096) |
| `fit` | string | cover | Resize mode |
| `fast` | bool | false | Enable fast mode |

**Response Headers:**
- `X-Processing-Time`: Conversion time in ms
- `X-Original-Size`: Input file size
- `X-Output-Size`: Output file size
- `X-Request-ID`: Unique request identifier

---

### `GET /health`

Health check endpoint.

```bash
curl https://your-worker.workers.dev/health
```

---

### `GET /options`

Returns available conversion options and API capabilities.

```bash
curl https://your-worker.workers.dev/options
```

---

## ⚙️ Configuration

Edit `wrangler.toml` to configure:

```toml
[vars]
MAX_FILE_SIZE = "10485760"    # 10MB max
DEFAULT_QUALITY = "90"
ALLOWED_ORIGINS = "*"
API_KEY = "your-secret-key"   # Optional
```

## 📁 Project Structure

```
workers-api/
├── src/
│   ├── index.js           # Main router
│   ├── converter.js       # WASM conversion logic
│   ├── handlers/
│   │   ├── convert.js     # POST /convert
│   │   ├── health.js      # GET /health
│   │   └── options.js     # GET /options
│   ├── utils/
│   │   ├── cors.js        # CORS handling
│   │   ├── response.js    # Response helpers
│   │   └── validation.js  # Request validation
│   └── wasm/
│       └── heic_converter.wasm
├── wrangler.toml
├── package.json
└── README.md
```

## 🔒 Security

- **CORS**: Configurable allowed origins
- **API Key**: Optional header-based authentication
- **File Size Limit**: Configurable max upload size
- **Input Validation**: HEIC signature verification

## 📝 License

MIT
