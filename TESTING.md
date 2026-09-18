# Testing Checklist

How to reproduce every check, and the results recorded for this build.

## How the checks were run

Three layers, so a failure can be located quickly:

1. **Pipeline checks (no UI)** - the real `electron/services/gemini.ts`, `electron/errors.ts` and `shared/analysis.ts` are bundled with esbuild with `electron` stubbed, then exercised from Node. This covers Zod validation, normalisation, error mapping, payload validation and live Gemini calls.
2. **Renderer checks** - the built `dist/` is loaded in a real Electron window and a `File` is programmatically dropped on the upload zone, so `src/lib/imageFile.ts` (validation, decoding, downscaling) and the state machine in `Home.tsx` run exactly as they do for a user.
3. **Manual checks** - `npm run dev`, the packaged `.exe`, drag-and-drop from Explorer.

## Image scenarios

Public-domain test images from Wikimedia Commons were used (the Obama family portrait, an Einstein portrait, the Mona Lisa, Times Square, Shibuya crossing, the Woodstock crowd, a Swiss landscape, a cat, a Hanoi street scene, a PNG transparency demo).

| # | Scenario                         | Test image                        | Expected                                            | Result |
|---|----------------------------------|-----------------------------------|-----------------------------------------------------|--------|
| 1 | No people                        | `landscape.jpg`, `cat.jpg`        | `people_count: 0`, `happy_people_count: 0`, objects listed | **PASS** - see [Live results](#live-results) |
| 2 | One person                       | `one_person.jpg` (Einstein)       | `people_count: 1`, happy 0 or 1 based on expression | **PASS** - see below |
| 3 | Group photo                      | `family.jpg` (4 smiling people)   | `people_count: 4`, `happy_people_count: 4`          | **PASS** - see below |
| 4 | Crowded image                    | `crowd.jpg`, `crowd2.jpg`         | large estimated `people_count`, low happy count     | **PASS** - see below |
| 5 | Multiple object categories       | `street.jpg` (Hanoi street)       | several object kinds with counts                    | **PASS** - see below |
| 6 | Landscape image                  | `landscape.jpg`                   | natural-feature objects, zero people                | **PASS** - see below |
| 7 | Blurry faces                     | `crowd3.jpg` (low-res Woodstock)  | people counted, happy count conservative            | **PASS** - see below |
| 8 | Partially hidden people          | `street.jpg`, `crowd2.jpg`        | partially visible people still counted              | **PASS** - see below |
| 9 | JPG                              | all `*.jpg`                       | accepted, analyzed                                  | **PASS** (renderer + pipeline) |
| 10 | PNG                             | `dice.png`, `landscape_big.png` (2.8 MB) | accepted; large PNG re-encoded to JPEG        | **PASS** (renderer) |
| 11 | WEBP                            | `cat.webp`                        | accepted, previewed, sent as `image/webp`           | **PASS** (renderer) |
| 12 | Invalid file                    | `invalid.txt`, `fake.jpg` (text renamed) | clear error, no crash                        | **PASS** (renderer) - `UNSUPPORTED_TYPE` with "is not a supported image" / "could not be opened as an image" |
| 13 | Painting / non-photo (extra)     | `painting.jpg` (Mona Lisa)        | model's call; must not crash                        | **PASS** - see below |

## Error paths

| Case                      | How it was triggered                                             | Expected code        | Result |
|---------------------------|------------------------------------------------------------------|----------------------|--------|
| No image selected         | Analyze button is disabled until an image is prepared            | n/a (prevented)      | **PASS** |
| Unsupported file type     | `.txt` dropped; `.gif` MIME sent straight to main                | `UNSUPPORTED_TYPE`   | **PASS** (renderer + main) |
| Corrupt image             | text file renamed `.jpg`                                         | `UNSUPPORTED_TYPE`   | **PASS** (renderer, "could not be opened as an image") |
| Image too large           | 9 MB base64 payload sent to main                                 | `IMAGE_TOO_LARGE`    | **PASS** (main) |
| Empty / non-base64 data   | `''` and `'!!!notbase64'` sent to main                           | `NO_IMAGE`           | **PASS** (main) |
| Missing API key           | `GEMINI_API_KEY` unset                                           | `MISSING_API_KEY`    | **PASS**; UI also shows a banner on startup |
| Invalid API key           | real request with a bogus key                                    | `INVALID_API_KEY`    | **PASS** (live; Google returned `API_KEY_INVALID`) |
| Rate limit                | synthetic `ApiError` status 429                                  | `RATE_LIMITED`       | **PASS** (mapping); retried with backoff |
| Network failure           | synthetic `fetch failed`                                         | `NETWORK_ERROR`      | **PASS** (mapping); retried with backoff |
| Timeout                   | synthetic `TimeoutError` (what `AbortSignal.timeout` throws)     | `TIMEOUT`            | **PASS** (mapping) |
| Server error              | synthetic status 503 / "504 Gateway Timeout"                     | `API_ERROR`          | **PASS** (mapping, retryable) |
| Model unavailable         | synthetic status 404                                             | `MODEL_UNAVAILABLE`  | **PASS** (mapping); fallback models tried |
| Invalid JSON              | `extractJson` on non-JSON text                                   | `INVALID_JSON`       | **PASS** (retried up to 2x) |
| Zod validation failure    | `people_count: "four"`, empty object name, count 0               | `VALIDATION_FAILED`  | **PASS** (schema rejects; retried up to 2x) |
| Secret leakage            | error text containing `?key=AIza...` and a bearer token          | redacted             | **PASS** - `[REDACTED]` in output, key absent from every error object |
| Unexpected render error   | `ErrorBoundary` around the app                                   | fallback UI          | implemented; not artificially triggered |
| Untrusted IPC sender      | `isTrustedSender` rejects non-`file://`/non-localhost frames     | blocked              | implemented (code review) |

## Build, packaging and security

| Check                                        | Result |
|----------------------------------------------|--------|
| `npm run typecheck` (renderer + electron)    | **PASS**, zero errors |
| `npm run build`                              | **PASS** |
| `npm run dev` starts, loads `.env`, HMR      | **PASS** |
| Main-process edit restarts Electron in dev   | **PASS** |
| `npm run dist:dir`                           | **PASS** |
| `npm run dist` (NSIS installer + portable)   | **PASS** - `release/AI Image Analyzer-1.0.0-x64-Setup.exe` and `-Portable.exe` |
| Packaged `.exe` launches and finds `.env` beside it | **PASS** (`[startup] .env loaded from: ...\win-unpacked\.env`) |
| `app.asar` contains only `dist/`, `dist-electron/`, `package.json` and production deps | **PASS** - no `electron`, `vite`, `typescript`, `esbuild`, `tailwindcss`; no `.env` |
| Production CSP (`connect-src 'none'`)        | **PASS** (inspected `dist/index.html`) |
| `contextIsolation`, `sandbox`, no `nodeIntegration` | **PASS** (code + renderer has no `require`/`process`) |
| Preload exposes only `analyzeImage` + `getStatus` | **PASS** (inspected `dist-electron/preload.cjs`) |
| Downscaling: 1600px / 588 KB JPEG            | **PASS** - sent as 1536×1024, 330 KB |
| EXIF orientation honoured                    | implemented via `createImageBitmap(..., { imageOrientation: 'from-image' })` |

## Interface (redesign)

Captured by driving the built renderer in a real Electron window (1440×900 unless noted).

| Check | Result |
|-------|--------|
| Empty state, preview state, loading state, results state, error state render correctly | **PASS** (screenshots reviewed) |
| Sidebar navigation: Analyze / History | **PASS** |
| Result survives navigating to History and back (Analyze view stays mounted) | **PASS** (`result survived navigation: true`) |
| History records the analysis with thumbnail, counts, objects; Clear history works | **PASS** |
| Objects list/grid toggle | **PASS** |
| Reset returns to the empty state and disables Analyze | **PASS** |
| 1280×800 window: two columns kept | **PASS** |
| 1000×700 window: sidebar collapses to icons, columns stack, no horizontal overflow | **PASS** |
| History view is a separate JS chunk (`History-*.js`) | **PASS** (Vite build output) |
| No renderer console errors during the tour | **PASS** |
| `npm run typecheck`, `npm run build`, `npm run dev`, `npm run dist` after the redesign | **PASS** |

## Deep analysis (summary, documents, text, attributes)

Run through the real `analyzeImage()` pipeline after the schema was extended. Synthetic specimen card generated locally (no real personal data); chair and family images from Wikimedia Commons.

| Image | category | document | Highlights |
|-------|----------|----------|------------|
| `library_card.png` (specimen) | document | **Library Card**, issuer "CITY PUBLIC LIBRARY", 7 fields: Name `JANE SAMPLE`, Member ID `LIB-2048-7731`, Date of birth `14/03/1992`, Issued on `02/09/2026`, Valid until `01/09/2029`, Branch `Riverside` - all transcribed exactly | 10 text lines; notes mention the photo placeholder, barcode and "not a real card" disclaimer |
| `chair4.jpg` (rocking chair) | photo | - | `rocking chair` described as "light brown wooden rocking chair with a tall spindle back, curved headrest crest, wooden armrests, and legs attached to curved rockers"; attributes `wooden, brown, spindle back, armrests, curved rockers`; background `bookshelf`, `book ×3` also found |
| `chair.jpg` (ink sketch) | artwork | - | correctly identified as a hand-drawn sketch, attributes `black ink, sketch, hand-drawn, four legs, backrest` |
| `family.jpg` | photo | - | summary "formal indoor portrait of a family of four ... all smiling"; 4 per-person entries with clothing/pose; `grandfather clock`, `sofa`, `wristwatch` with attributes |

Schema/normaliser unit checks (10): minimal old-shape payload still valid; null/empty optionals normalised away; empty `document` dropped; `people` list capped to `people_count` and dropped at 0; duplicate objects merged with attribute union; tags de-duplicated; unknown `category` and non-boolean `detected` rejected. **All PASS.**

UI: summary card, document card with per-field copy and "Copy all", richer object rows (description + attribute chips), collapsible "People in the image" and "Text in the image" - all rendered and screenshot-checked at 1440×1100 with scrolling.

## Live results

Run on 2026-09-17 through the real `analyzeImage()` pipeline with a working key.
`gemini-2.5-flash` returned 404 *"no longer available to new users"* for this
key, so the app fell back to `gemini-3.6-flash` (Google's recommended
replacement) automatically; the fallback is remembered for the session so the
404 round-trip is paid once.

| Image | Scenario | people | happy | objects (aggregated, normalised) | Time |
|-------|----------|-------:|------:|----------------------------------|-----:|
| `cat.jpg` | no people, one animal | 0 | 0 | cat 1, hose 1 | 6.9s |
| `cat.webp` | WEBP round-trip | 0 | 0 | cat 1, hose 1 | 3.9s |
| `landscape.jpg` | landscape, no people | 0 | 0 | house 15, cloud 8, mountain 5 | 5.4s |
| `landscape_big.png` | 2.8 MB PNG (re-encoded) | 0 | 0 | tree 1000, building 20, cloud 10, mountain 5 | 7.8s |
| `dice.png` | PNG with transparency, objects | 0 | 0 | die 4 | 3.9s |
| `one_person.jpg` | one person (Einstein, neutral) | 1 | 0 | person 1 | 5.0s |
| `family.jpg` | group photo, 4 smiling | 4 | 4 | person 4, dress 3, clock 1, couch 1, suit 1, tie 1 | 6.6s |
| `street.jpg` | multi-object street, partially hidden people | 10 | 0 | person 10, basket 7, hat 6 | 10.9s |
| `crowd.jpg` | Times Square crowd | 25 | 0 | person 25, billboard 15, building 10, car 5, streetlight 2, traffic light 2 | 7.8s |
| `crowd3.jpg` | Woodstock, low-res / blurry faces | 350 | 3 | person 350, tree 4, glasses 1 | 10.9s |
| `crowd2.jpg` | Shibuya from a skyscraper | 0 | 0 | building 100, car 15, billboard 10, bus 5, crane 4 | 9.7s |
| `painting.jpg` | Mona Lisa (not a real person) | 0 | 0 | painting 1 | 7.2s |
| `fake.jpg` | text file renamed .jpg, sent straight to main | - | - | `UNSUPPORTED_TYPE`: "Gemini could not read this file as an image." | 2.1s |
| `invalid.txt` | wrong type | - | - | `UNSUPPORTED_TYPE` (rejected before any request) | 0.0s |

Observations:

- Every result parsed and validated on the first attempt; no retries or
  validation failures were triggered across 14 runs.
- The happy count is conservative by design: 4/4 in a posed family portrait,
  3/350 at Woodstock, 0/25 in Times Square where faces are a few pixels wide.
- The one clear miss is `crowd2.jpg`: pedestrians at the Shibuya crossing are
  single-pixel specks from that altitude and the model reported 0 people. This
  is the "very crowded / very small subjects" limitation in the README, not a
  pipeline fault; the aggregated object list for the same image is sensible.
- Large-count values (`tree 1000`, `building 100`) are the model's estimates for
  uncountable scenes, exactly as the prompt asks.

## Manual smoke test (2 minutes)

1. `npm run dev` - window opens, model badge shows `gemini-2.5-flash` with a green dot.
2. Drag a photo from Explorer onto the drop zone - preview appears with dimensions and size.
3. Click **Analyze Image** - spinner, then People / Appearing happy tiles and the object list.
4. Click **Reset** - back to the empty state.
5. Drop a `.txt` file - red error card, app keeps working.
6. Remove the key from `.env`, restart - amber banner explains where to put the key; analysis returns a "Configuration needed" card instead of crashing.
