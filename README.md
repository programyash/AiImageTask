# AI Image Analyzer

A small Windows desktop application, built with Electron and React, that takes a photo and uses Google Gemini to report **which objects are in it**, **how many people are visible**, and **how many of those people appear happy**.

[Architecture](#architecture) · [Setup](#setup) · [Security](#security) · [Testing](#testing) · [Limitations](#limitations)

## Overview

You drop in a JPG, PNG or WEBP image, click **Analyze Image**, and a few seconds later the app shows:

| People | Appearing happy | Objects                     |
| ------ | --------------- | --------------------------- |
| 4      | 2               | person 4 · car 2 · dog 1    |

The image is downscaled locally, sent to the Gemini API from Electron's main process (never from the browser layer), and the model's JSON reply is validated with Zod before anything reaches the UI. If Gemini is unreachable, the key is wrong, the file is not an image, or the model returns garbage, you get a plain-English message instead of a crash.

## Features

- **Image upload** via a native file dialog or **drag and drop**
- **Object identification** with aggregated counts (`person: 3`, not three separate `person: 1` rows), plus a one-line description and observable attributes for each ("wooden", "four legs", "spindle back")
- **People counting** including partially visible and background people, with a per-person breakdown (description, face visible, appears happy)
- **Happy-expression estimation** based only on visible facial cues (smiling), never inferred from context
- **"What this is"**: a summary sentence, an image category (photo / document / screenshot / artwork / product ...) and tags
- **Document and ID extraction**: for cards, certificates, receipts and forms - the document type, issuer, and every printed field transcribed exactly (name, dates, ID numbers, amounts), with copy buttons
- **Text transcription**: every legible line in the image, in reading order
- **AI-powered analysis** using Gemini Flash (2.5 where available, otherwise 3.6) with structured JSON output
- **Client-side downscaling** so large phone photos upload quickly and cheaply
- **Comprehensive error handling** for every failure from "no image" to "rate limited"
- Empty, loading, result and error states; preview with file metadata; Reset
- **Session history** of analyses (code-split, loaded on demand)
- Secure Electron configuration: context isolation, no Node integration, sandboxed renderer, strict CSP

## Technology Stack

| Layer      | Technology                                  |
| ---------- | ------------------------------------------- |
| Desktop    | Electron 38, electron-builder 26            |
| Frontend   | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 3 |
| AI         | Google Gemini (2.5 Flash / 3.6 Flash) via `@google/genai`, the current official SDK |
| Validation | Zod 4                                       |
| Bundling   | esbuild (main/preload), Vite (renderer)     |

## Why These Technologies Were Selected

- **Electron** lets a standard web stack ship as a native Windows application with a real file system, a secure place to keep secrets, and an installer - all without writing platform code.
- **React** gives a small component model that maps cleanly onto the four UI states this app has (empty → preview → loading → result/error).
- **TypeScript** catches contract drift between the three Electron layers at compile time. The IPC contract in `shared/ipc.ts` is one set of types used by main, preload and renderer.
- **Vite** provides fast HMR for the renderer and a tiny production bundle; **esbuild** compiles the main process in under 100 ms.
- **Tailwind CSS** produces a consistent, professional look with no design system to maintain.
- **Gemini** is a multimodal model that understands images out of the box, so the whole vision pipeline is one API call - no dataset, no training, no local model weights. The Flash tier is fast, inexpensive and supports schema-constrained JSON output.
- **Zod** turns "the model probably returned the right shape" into a guarantee: the response is parsed against an explicit schema, extra keys are stripped, and wrong types are rejected with a readable message.
- **electron-builder** produces the NSIS installer and a portable `.exe` from one YAML file.

## Architecture

```
React renderer (sandboxed, no Node)
   │  window.electronAPI.analyzeImage({ base64, mimeType })
   ▼
Preload (contextBridge - exposes exactly two functions)
   │  ipcRenderer.invoke('analyzer:analyze-image', ...)
   ▼
Electron main process
   ├─ validates the payload again (type, size, base64 shape)
   ├─ calls Gemini with a system prompt + JSON response schema
   ├─ parses the reply, validates with Zod, normalises (dedupe/sort/clamp)
   └─ returns { ok: true, data } or { ok: false, error: { code, message } }
   ▼
React renderer renders the typed result
```

```
electron/                 Main process (Node) - the only place the API key exists
  main.ts                 Window creation, security settings, lifecycle
  preload.ts              contextBridge: analyzeImage() + getStatus()
  env.ts                  .env discovery (project root in dev; beside the .exe when packaged)
  errors.ts               Maps every failure to a safe, typed AnalysisError; redacts secrets
  ipc/analyzeImage.ts     IPC handler with sender validation
  ipc/index.ts            Handler registration
  services/gemini.ts      Gemini call, retries, model fallback, JSON extraction, Zod validation
  services/prompt.ts      System instruction + response schema
shared/                   Types shared by all three layers
  analysis.ts             Zod schema + ImageAnalysis type + normaliser
  ipc.ts                  Channel names, request/response types, limits
src/                      React renderer
  App.tsx                 App shell: sidebar navigation, session history, lazy-loaded History view
  components/             Sidebar, ImageUploader, ImagePreview, AnalysisResults, ObjectList,
                          StatCard, ProgressRing, ModelBadge, LoadingState, ErrorState,
                          EmptyState, ErrorBoundary, PageHeader, icons
  pages/Home.tsx          The Analyze view and its state machine
  pages/History.tsx       Analyses from this session (code-split)
  services/analyzer.ts    Thin wrapper over window.electronAPI
  lib/imageFile.ts        Validation + Canvas-based downscaling
  lib/thumbnail.ts        Small thumbnails for the history list
  types/                  Renderer type re-exports and the window.electronAPI declaration
scripts/                  dev launcher, esbuild config, icon generator
```

## Interface

A slim dark-green sidebar (Analyze · History) sits beside a light workspace. The Analyze view is two cards: the upload zone and image preview on the left, and the results on the right - People and Appearing Happy summary tiles (with a percentage ring), an Objects Detected table with proportional bars and a list/grid toggle, and a short "About these results" note. The palette is a single deep green on off-white with one restrained secondary tint; motion is limited to short fades, the bar/ring fill-in, and hover/press feedback, and it respects `prefers-reduced-motion`.

The Analyze view stays mounted while you visit History, so a selected image or an in-flight analysis survives the trip. History is in-memory for the session only; nothing is written to disk.

## Setup

### Prerequisites

- Node.js 20.19+ (tested on Node 24) and npm
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### 1. Get the project

```bash
git clone <repository-url>
cd AiImageTask
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env`

```bash
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux
```

### 4. Add your Gemini API key

Edit `.env`:

```
GEMINI_API_KEY=your_key_here
```

Optional: `GEMINI_MODEL=...` to pin a different model. The default is `gemini-2.5-flash`, as preferred by the assignment. Google now returns *"no longer available to new users"* for that model on newly created keys, so the app automatically falls back to `gemini-3.6-flash` (Google's recommended replacement) and then `gemini-flash-latest`, remembers which one worked for the rest of the session, and shows the model actually used in the header and under the results. Set `GEMINI_MODEL=gemini-3.6-flash` to skip the first attempt entirely.

### 5. Run the development version

```bash
npm run dev
```

This starts the Vite dev server, compiles the Electron main/preload code in watch mode, and launches the app. Renderer edits hot-reload; main-process edits restart Electron.

### 6. Build the production version

```bash
npm run build      # type-check + bundle renderer and main into dist/ and dist-electron/
npm run dist       # build + package: release/AI Image Analyzer-1.0.0-x64-Setup.exe and -Portable.exe
```

`npm run dist:dir` produces an unpacked folder (`release/win-unpacked/`) without an installer, which is faster for a quick check.

### Using the packaged app

**End users do not need to configure anything.** When `npm run dist` runs, the build reads `GEMINI_API_KEY` from the project's `.env` (or the build shell) and compiles it into the main-process bundle inside `app.asar`. Anyone who installs the resulting Setup/Portable `.exe` can analyze images immediately with that key.

> Because the key ships inside the installer, treat it as semi-public: set a spending/quota cap on it in Google AI Studio and rotate it if the installer is distributed widely.

If you want to build *without* a bundled key, remove `GEMINI_API_KEY` from `.env` before running `npm run dist`; the build prints a warning and the app falls back to run-time lookup.

To override the bundled key on a given machine, the app checks these in order and uses the first one it finds:

1. a `GEMINI_API_KEY` Windows environment variable
2. `.env` next to `AI Image Analyzer.exe`
3. `.env` in the app's `resources/` folder
4. `.env` in `%APPDATA%\ai-image-analyzer\`
5. the key bundled at build time

If none of these yields a key, the app starts normally and shows a banner explaining where to put one.

### All scripts

| Script                   | What it does                                                   |
| ------------------------ | -------------------------------------------------------------- |
| `npm run dev`            | Development mode with HMR and auto-restart                     |
| `npm run typecheck`      | `tsc --noEmit` for both the renderer and the Electron projects |
| `npm run build`          | Type-check, then build renderer + main/preload                 |
| `npm run preview`        | Build, then launch the built app with Electron (no packaging)  |
| `npm run dist`           | Build + Windows installer (NSIS) + portable exe                |
| `npm run dist:dir`       | Build + unpacked folder only                                   |
| `npm run clean`          | Remove `dist/`, `dist-electron/`, `release/`                   |
| `npm run icon`           | Regenerate `build/icon.png` / `build/icon.ico`                 |

> **Note for VS Code users:** VS Code's integrated terminal sets `ELECTRON_RUN_AS_NODE=1`, which turns `electron.exe` into a plain Node binary. `npm run dev` strips that variable automatically; if you launch Electron by hand from that terminal, unset it first.

## Security

**The API key never enters the renderer.** It is read from `.env` / the process environment by `electron/env.ts` in the main process, used only inside `electron/services/gemini.ts`, and is not part of any IPC message. The preload script does not expose `process`, `require`, or `ipcRenderer` - only two named functions. Even `getStatus()` reports a boolean "a key exists", not the key.

Error messages are sanitised before they cross to the UI (`electron/errors.ts`): the live key, `key=` query parameters and bearer tokens are replaced with `[REDACTED]`, and raw provider error strings are truncated. This matters because Gemini errors can echo the request URL.

**Electron hardening** (`electron/main.ts`):

- `contextIsolation: true` - the preload and page run in separate JavaScript worlds, so page code cannot reach Electron internals through prototype pollution.
- `nodeIntegration: false` - no `require`, `process` or `fs` in the renderer. A compromised page (for example via a malicious image that exploited a decoder bug) cannot touch the disk or the network from Node.
- `sandbox: true` - the renderer process runs under the OS sandbox like a normal Chrome tab.
- `webviewTag: false`, navigation blocked, `window.open` denied, external links handed to the system browser.
- A strict Content-Security-Policy in production (`default-src 'none'`, `connect-src 'none'`): the renderer has no network access at all - every request to Gemini goes through the main process.
- IPC handlers verify the sender frame is our own window before doing work, and the main process re-validates the payload (type, size, base64 shape) rather than trusting the renderer.

`.env` is gitignored, and electron-builder's `files` list only includes the built bundles, so the `.env` file itself is never packaged. The key *value* is compiled into the main-process bundle at build time (see "Using the packaged app") so end users need no setup; it still never reaches the renderer.

## How the analysis works

1. **Prepare (renderer)** - `src/lib/imageFile.ts` checks the type and size, decodes the image (honouring EXIF orientation), and if the longest edge exceeds 1536 px or the file is over 4 MB, redraws it onto a canvas and re-encodes as JPEG. A 12 MB phone photo becomes a ~400 KB upload with no meaningful loss for this task.
2. **Request (main)** - `electron/services/gemini.ts` sends the image as an inline base64 part with a system instruction and a JSON response schema (`responseMimeType: application/json`). Temperature is 0.15 for stable counts. Transient errors (429, 5xx, network) are retried with backoff; an unavailable model triggers the fallback chain.
3. **Validate (main)** - the text is parsed (markdown fences tolerated), checked against the Zod schema, then normalised: object names lower-cased and merged, sorted by count, `happy_people_count` clamped to `people_count`.
4. **Render (renderer)** - the typed result is displayed. Nothing about the result is hard-coded.

The prompt (`electron/services/prompt.ts`) tells the model to aggregate identical objects, to count partially visible people, to ignore statues/posters/reflections, and - critically - to count someone as happy **only** when the face is sufficiently visible and shows a smile or equivalent cue. It is explicitly told not to infer mood from clothing, activity or setting, and to prefer leaving someone out of the happy count when unsure.

### Result shape

The three assignment fields are mandatory; everything else is optional depth the model fills in when the image supports it. Unknown keys are stripped, wrong types are rejected, and empty/null optionals are normalised away.

```jsonc
{
  "objects": [{ "name": "rocking chair", "count": 1,
                "description": "Light brown wooden rocking chair with a spindle back and curved rockers.",
                "attributes": ["wooden", "brown", "spindle back", "armrests", "curved rockers"] }],
  "people_count": 0,
  "happy_people_count": 0,
  "summary": "A light brown wooden rocking chair standing on a green floor.",
  "category": "photo",                       // photo | document | screenshot | artwork | diagram | product | other
  "tags": ["rocking chair", "wooden", "furniture"],
  "document": { "detected": true, "type": "Library card", "issuer": "City Public Library",
                "fields": [{ "label": "Name", "value": "JANE SAMPLE" }, { "label": "Issued on", "value": "02/09/2026" }],
                "notes": "Specimen card with a photo placeholder and a barcode." },
  "text_lines": ["CITY PUBLIC LIBRARY", "MEMBER CARD", "..."],
  "people": [{ "description": "Adult, dark suit, seated, facing camera", "face_visible": true, "appears_happy": true }]
}
```

For documents the model is told to transcribe values exactly as printed and to write `?` for any character it cannot read rather than guess. The UI shows a note that the image may contain personal information and was sent to Gemini; nothing is stored by the app.

## Testing

See [TESTING.md](TESTING.md) for the checklist, how each case was exercised, and the recorded results. It covers 12 image scenarios (no people, one person, group, crowd, multi-object, landscape, blurry faces, partially hidden people, JPG, PNG, WEBP, invalid file) and every error path (missing key, invalid key, rate limit, network failure, malformed JSON, schema violation, oversize image, unsupported type).

## Limitations

- **Transcription can contain reading errors.** Document fields and text lines are the model's reading of the pixels; small, blurred or stylised print may be misread, and a `?` marks characters it could not read. Always verify extracted ID numbers and dates against the original.
- **Counting is approximate.** Object detection and counting by a general-purpose vision model can be off, particularly for small, overlapping or partially hidden objects.
- **Crowds are estimates.** Dense scenes such as a street or a concert produce best-effort counts, not exact ones.
- **"Happy" is an appearance-based estimate.** The app reports how many faces *look* like they are smiling. It says nothing about how anyone actually feels, and a neutral face at a celebration is counted as not happy.
- **Small, blurry, dark, masked or turned-away faces are not classified.** By design, the prompt treats an unreadable face as "not visibly happy" rather than guessing.
- **Results are not deterministic.** Even at low temperature, re-running the same image can produce slightly different counts.
- **Requires network and a Gemini API key.** Availability, latency and cost depend on Google's API quotas and rate limits.
- **Images leave the machine.** Each analyzed image is sent to the Gemini API. Do not use it with images you cannot share with Google under their API terms.
- **One image at a time**, no history, no batch mode.

## Future Improvements

- **Local models** (YOLO, MediaPipe) for offline object detection and face localisation, with Gemini reserved for expression classification.
- **Confidence scores** per object and per face, surfaced in the UI.
- **Bounding boxes** drawn over the preview so a user can see *which* people were counted as happy.
- **Face-level analysis**: per-face expression labels beyond a binary happy/not-happy.
- **Offline analysis** when no network is available.
- **Richer object categories** (attributes, colours, brands) as an optional detail level.
- **Image history** with the ability to compare results across runs.
- **Multiple AI providers** behind the same `AnalysisProvider` interface, chosen by configuration.
- **Model-specific validation**: tighter schemas and prompt variants per model version.
- **Batch mode** for analyzing a folder of images.

## License

MIT
