# How S2-Sentinel Copilot Works 🛡️

> Deep-dive into architecture, data flow, storage, RAG pipeline, and security

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Language & Codebase Breakdown](#2-language--codebase-breakdown)
3. [Application Lifecycle](#3-application-lifecycle)
4. [State Management](#4-state-management)
5. [Where Keys & Data Are Stored](#5-where-keys--data-are-stored)
6. [AI Provider System](#6-ai-provider-system)
7. [RAG Pipeline — How Document Search Works](#7-rag-pipeline--how-document-search-works)
8. [Quiz & Spaced Repetition System](#8-quiz--spaced-repetition-system)
9. [Theme System](#9-theme-system)
10. [Analytics & Global Stats](#10-analytics--global-stats)
11. [Module Architecture](#11-module-architecture)
12. [Security Considerations](#12-security-considerations)

---

## 1. Architecture Overview

```
┌─────────────────────────── BROWSER ───────────────────────────┐
│                                                                │
│  index.html (SPA shell)                                        │
│       ↓                                                        │
│  js/main.js (bootstrap + hash router)                          │
│       ↓                                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Dashboard    │  │ Workspace    │  │ Settings Modal     │    │
│  │ (dashboard.js│  │ (workspace.js│  │ (theme picker,     │    │
│  │  + analytics)│  │  + 4 tabs)   │  │  API config)       │    │
│  └─────────────┘  └──────────────┘  └────────────────────┘    │
│                          ↓                                     │
│      ┌─────────────────────────────────────────┐              │
│      │         Core Services Layer             │              │
│      │  state-manager.js  (reactive state)     │              │
│      │  storage-idb.js    (IndexedDB, 8 stores)│              │
│      │  api.js            (Cerebras + Gemini)  │              │
│      │  rag-engine.js     (TF-IDF + backend)   │              │
│      └─────────────────────────────────────────┘              │
│                          ↓                                     │
│              ┌─────────────────────┐                          │
│              │   IndexedDB          │                          │
│              │   (s2-sentinel-db)   │                          │
│              │   8 object stores    │                          │
│              └─────────────────────┘                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                           ↕ (optional)
┌──────────────── PYTHON SERVER (localhost:8765) ────────────────┐
│  FastAPI + Uvicorn                                             │
│  ChromaDB (vector store) + sentence-transformers (embeddings)  │
│  PyMuPDF (advanced PDF parsing)                                │
└────────────────────────────────────────────────────────────────┘
                           ↕
┌──────────────── EXTERNAL AI APIS ──────────────────────────────┐
│  Cerebras Cloud (Llama 3.3 70B)  ←  primary                   │
│  Google Gemini 1.5 Flash          ←  failover                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Language & Codebase Breakdown

### Lines of Code by Language

| Language | Files | Lines | % of Codebase | Role |
|----------|-------|-------|--------------|------|
| **JavaScript** | 27 | 8,459 | 73.6% | Frontend SPA, AI chat, tools, quiz, analytics |
| **Python** | 11 | 1,752 | 15.2% | Optional RAG backend (FastAPI + ChromaDB) |
| **CSS** | 7 | 916 | 8.0% | Themes, glass effects, layout, markdown styles |
| **HTML** | 1 | 372 | 3.2% | Single-page shell with modals |
| **Total** | **46** | **11,499** | 100% | |

### Why These Languages?

- **JavaScript (ES Modules)**: Zero build step, native browser support, works offline with `file://` protocol. No React/Vue/Angular — pure vanilla for maximum performance and no dependencies.
- **Python**: ChromaDB and sentence-transformers require Python runtime. Used only for the optional enhanced RAG backend.
- **CSS**: Tailwind via CDN for utilities; custom CSS for theming, glass morphism, animations.
- **HTML**: Single `index.html` — the entire UI is rendered dynamically by JavaScript.

### Notable: No Build Tools

There is **no webpack, no Vite, no npm, no bundler**. The app uses native ES module `import/export` and loads directly in the browser. This means:
- Zero setup required
- Works from any static file server
- No `node_modules/` in the project
- CDN for third-party libs (Tailwind, Chart.js, PDF.js, Marked.js, Prism.js, Font Awesome)

---

## 3. Application Lifecycle

### Boot Sequence (`main.js`)

```
DOMContentLoaded
    → checkReloadLoop()          # Detects infinite redirect loops
    → StorageIDB.init()          # Opens IndexedDB (s2-sentinel-db v4)
    → Analytics.init()           # Loads Chart.js dynamically
    → ThemeManager.init()        # Applies saved theme (migrates legacy key)
    → Modal.setup()              # Initializes <dialog> elements
    → setupRouter()              # Attaches hashchange listener
    → setupGlobalListeners()     # Click handlers for nav, theme, settings
    → checkApiConfiguration()    # Shows API modal if no keys
    → handleRoute()              # Renders dashboard or workspace
```

### Routing (Hash-Based SPA)

| URL Hash | View | Action |
|----------|------|--------|
| `#/dashboard` | Dashboard | Subject grid, stats, analytics charts |
| `#/subject/{id}` | Workspace | Chat, Docs, Tools, Quiz tabs |

Navigation triggers:
1. `Analytics.endSession()` — persists current study session
2. `Workspace.destroy()` — cleans up workspace resources
3. Renders new view into `#main-content`

---

## 4. State Management

### Architecture: Reactive Singleton (`state-manager.js`)

```javascript
class StateManager {
    state = { ... };            // Single source of truth
    subscribers = Map();        // key → Set<callback>

    setState(updates)           // Merges updates, persists, notifies
    subscribe(key, callback)    // Watch a state key
    get(key)                    // Read a value
}
export const AppState = new StateManager();  // Singleton
```

### State Shape

```javascript
{
    apiKeys: { cerebras: "...", gemini: "..." },
    activeProvider: "cerebras" | "gemini" | null,
    selectedModel: "llama-3.3-70b",
    isDemo: false,
    currentView: "dashboard" | "workspace",
    currentSubject: "networks" | null,
    currentTab: "chat" | "docs" | "tools" | "quiz",
    theme: "sentinel-dark",
    conversationHistory: { [subjectId]: [{ role, content, timestamp }] },
    analytics: { [subjectId]: { ... } },
    ragContext: [],
    settings: { autoContext: true, maxChunks: 5, streaming: true }
}
```

### Persistence Strategy

| Data | Storage | Why |
|------|---------|-----|
| API keys | `localStorage` | Fast sync access, no IndexedDB overhead |
| Theme | `localStorage` | Needs to apply before IndexedDB is ready |
| Active subject | `localStorage` | Restore last session on reload |
| Settings | `localStorage` | Small JSON blob |
| Documents & chunks | `IndexedDB` | Large blobs, no 5MB limit |
| Analytics | `IndexedDB` | Structured per-subject data |
| Quiz reviews | `IndexedDB` | Spaced repetition scheduling |
| Global stats | `IndexedDB` | Streak, sessions, topics |

---

## 5. Where Keys & Data Are Stored

### API Keys

| Key | localStorage Key | Description |
|-----|-----------------|-------------|
| Cerebras API Key | `s2-cerebras-api-key` | Llama 3.3 70B access |
| Gemini API Key | `s2-gemini-api-key` | Gemini 1.5 Flash access |

**Important**: API keys are stored in **browser localStorage** (plain text). They:
- Never leave the browser (sent directly to Cerebras/Gemini APIs via HTTPS)
- Are NOT sent to the Python backend
- Are scoped to the origin (`localhost:3000`)
- Can be cleared via Settings → Clear All Data

### Theme Preference

| Key | localStorage Key | Default |
|-----|-----------------|---------|
| Theme | `s2-theme` | `sentinel-dark` |

### IndexedDB Database

| Property | Value |
|----------|-------|
| Database Name | `s2-sentinel-db` |
| Version | 4 |

#### 8 Object Stores

| Store | Key | Indexes | Purpose |
|-------|-----|---------|---------|
| `documents` | `id` (auto) | subjectId, filename, uploadedAt | PDF file blobs |
| `chunks` | `id` (auto) | documentId, subjectId, page | Text chunks for RAG |
| `analytics` | `subjectId` | — | Per-subject study time, scores, sessions |
| `settings` | `key` | — | App settings (key-value) |
| `conversations` | `id` (auto) | subjectId, timestamp | Chat history |
| `tool_history` | `id` (auto) | toolId, subjectId, timestamp | Tool usage tracking |
| `quiz_reviews` | `id` (auto) | subjectId, nextReview, questionHash | Spaced repetition |
| `global_stats` | `key` | — | Streak, total sessions, topics learned |

#### Global Stats Keys

| Key | Type | Description |
|-----|------|-------------|
| `currentStreak` | number | Current consecutive study day streak |
| `bestStreak` | number | All-time best streak |
| `totalSessions` | number | Total study sessions started |
| `lastStudyDate` | string | Date string of last study (`"Thu Feb 06 2026"`) |
| `topicsLearned` | string[] | Unique topics encountered |

---

## 6. AI Provider System

### Dual Provider with Automatic Failover

```
User Input
    → PromptBuilder.build(subjectId, message, ragChunks)
        → [Identity + Expertise + Pedagogy + Examples + RAG Context]
    → ApiService.call(messages, options)
        → Check cache (30-min TTL, 100 entries)
        → Try Cerebras first (Llama 3.3 70B)
            → If fails → Auto-switch to Gemini 1.5 Flash
        → Return response (streaming or complete)
```

### Prompt Architecture (5-Layer)

```
Layer 1: IDENTITY
    "You are S2-Sentinel, built by MIHx0..."

Layer 2: EXPERTISE
    Subject-specific knowledge (e.g., network protocols, pentesting)

Layer 3: PEDAGOGY
    Teaching style for this subject (e.g., "packet-first", "attack-chain")

Layer 4: EXAMPLES
    Subject-specific formatting guidance

Layer 5: RAG CONTEXT
    Relevant chunks from uploaded PDFs
    "Use the following course material to answer..."
```

### API Endpoints Used

| Provider | Endpoint | Model |
|----------|----------|-------|
| Cerebras | `https://api.cerebras.ai/v1/chat/completions` | llama-3.3-70b |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash` | gemini-1.5-flash |

---

## 7. RAG Pipeline — How Document Search Works

### Two-Tier RAG Architecture

The app has **two independent RAG engines** and auto-detects which to use:

#### Tier 1: JavaScript TF-IDF (Always Available)

```
PDF Upload → PDF.js extracts text → SemanticChunker splits text
    → Chunks stored in IndexedDB (chunks store)

Query → TF-IDF scoring engine
    → Stop word removal
    → Term frequency × Inverse document frequency
    → Phrase match boosting
    → Header content boosting
    → Returns top-K chunks (default 5)
```

**Pros**: Works offline, zero cost, no Python needed
**Cons**: Keyword-based (not truly semantic)

#### Tier 2: Python ChromaDB (Optional, Enhanced)

```
PDF Upload → POST /documents/upload → PyMuPDF extracts text
    → spaCy semantic chunking (header detection, paragraph boundaries)
    → sentence-transformers encodes chunks → all-MiniLM-L6-v2
    → ChromaDB stores vectors (persistent on disk)

Query → POST /search → query_expander broadens query
    → ChromaDB cosine similarity search
    → BM25 re-ranking for hybrid results
    → Returns top-K chunks with scores
```

**Pros**: True semantic search (90%+ accuracy), query expansion
**Cons**: Requires Python 3.10+, ~2GB disk for models

### Auto-Detection Flow

```javascript
// On app boot (rag-engine.js)
try {
    await fetch('http://localhost:8765/health');
    usePythonBackend = true;   // ChromaDB available
} catch {
    usePythonBackend = false;  // Fall back to JS TF-IDF
}
```

---

## 8. Quiz & Spaced Repetition System

### Quiz Generation Flow

```
1. User selects: difficulty, count, topic (optional), question type
2. Prompt built with RAG context + quiz-specific instructions
3. AI generates JSON array of questions
4. Parser tries: JSON.parse → regex extraction → markdown parsing
5. Renders interactive quiz UI
6. User answers → immediate visual feedback
7. Submit → score calculated → saved to analytics + quiz_reviews
```

### Question Types

| Type | UI | Answer Method |
|------|-----|--------------|
| Multiple Choice | 4 options (A/B/C/D) | Click option |
| True/False | 2 buttons | Click T/F |
| Fill in the Blank | Text input + check | Type + verify |
| Code Completion | 4 code snippets | Click snippet |

### Spaced Repetition Algorithm

```
Answer wrong     → Schedule review in 1 day
Correct 1 time   → Schedule review in 3 days
Correct 2 times  → Schedule review in 7 days
Correct 3+ times → Schedule review in 30 days (mastered)
```

Each question is hashed (djb2) for deduplication. Due reviews are surfaced with a banner on the Quiz tab.

---

## 9. Theme System

### 12 Available Themes

| Theme | Style | Accent Color |
|-------|-------|-------------|
| Glass (default) | Deep emerald gradient | Emerald (#34d399) |
| Sentinel Dark | Tactical neon green | Neon Green (#00e676) |
| Hacker | CRT Matrix terminal | Matrix Green (#33ff33) |
| Midnight | Ultra-dark indigo | Indigo (#6366f1) |
| Cyber | Cyberpunk high-contrast | Laser Yellow (#ffe41c) |
| Ocean | Deep ocean gradient | Cyan (#22d3ee) |
| Forest | Mysterious forest | Lime (#a3e635) |
| Nebula | Cosmic purple | Fuchsia (#d946ef) |
| Aurora | Northern lights | Teal (#2dd4bf) |
| Sunset | Vibrant pink/purple | Pink (#f472b6) |
| Lavender | Dreamy purple | Purple (#c084fc) |
| Light | Minimalist light mode | Emerald (#059669) |

### How Themes Work

1. Each theme is defined as CSS custom properties in `css/variables.css`
2. Applied via `data-theme` attribute on `<html>` (`glass` uses `:root` defaults)
3. `ThemeManager` (`js/ui/theme.js`) validates, applies, persists to `localStorage`
4. Visual picker grid in Settings modal renders gradient previews
5. Theme toggle button (header) cycles through all 12 themes
6. State synced via `AppState.setState({ theme: '...' })`

---

## 10. Analytics & Global Stats

### Per-Subject Analytics (IndexedDB `analytics` store)

| Metric | How Tracked |
|--------|------------|
| Study Time | Auto session timer (start on workspace enter, end on leave) |
| Quiz Scores | Recorded on quiz submit (score/total + timestamp) |
| Weak Topics | Topics with wrong quiz answers |
| Sessions | Timestamp + duration + interaction count |
| Last Accessed | Timestamp of last visit |

### Global Stats (IndexedDB `global_stats` store)

| Metric | How Tracked |
|--------|------------|
| Current Streak | Compares `lastStudyDate` to today/yesterday on session start |
| Best Streak | Updated whenever `currentStreak` exceeds it |
| Total Sessions | Incremented (+1) each time `Analytics.startSession()` is called |
| Topics Learned | Unique set — subjects and quiz topics added as encountered |

### Dashboard Display

```
┌──── Quick Stats ──────────────────────────────┐
│ Study Time │ Quizzes │ Avg Score │ Active Subj │
├──── Progress Tracker ─────────────────────────┤
│ 🔥 Streak  │ Sessions │ Topics  │ 🏆 Best     │
├──── Subject Grid ─────────────────────────────┤
│ [8 subject cards with docs count, pedagogy]   │
├──── Analytics Charts ─────────────────────────┤
│ Study Time Pie │ Weekly Progress Bar          │
│ Quiz Performance Line │ Weak Topics Panel     │
│ Subject Statistics Cards                       │
└───────────────────────────────────────────────┘
```

### PDF Study Report Export

One-click export generates a styled HTML page in a new window with print dialog for PDF saving. Includes: summary stats, subject breakdown table, spaced repetition stats.

---

## 11. Module Architecture

### Tool System (Modular Split)

```
toolkit.js (73 lines — aggregator)
    ├── imports tools/networks.js    (subnets, ports, CIDR, DNS, bandwidth)
    ├── imports tools/pentesting.js  (encoding, headers, payloads)
    ├── imports tools/backend.js     (JWT, SQL, PHP, npm analyzer)
    ├── imports tools/linux.js       (permissions, cron, cheatsheet, commands)
    ├── imports tools/ctf.js         (base converter, hash ID, ciphers)
    ├── imports tools/scripting.js   (regex, code analysis)
    └── imports tools/privacy.js     (GDPR lookup, privacy checklist)

Each sub-module exports a plain object with tool definitions.
Aggregator merges them via spread operator into TOOLS map.
```

### Workspace System (Modular Split)

```
workspace.js (288 lines — orchestrator)
    ├── imports workspace/chat.js      (AI chat, streaming, RAG)
    ├── imports workspace/docs.js      (PDF upload, document management)
    ├── imports workspace/tools-tab.js (tool discovery, search, execution)
    └── imports workspace/quiz.js      (quiz generation, review, scoring)

Orchestrator merges sub-modules via Object.assign (mixin pattern).
Each sub-module exports a plain object with methods.
```

### Why Not Classes?

The project uses **object literals with `Object.assign`** instead of ES6 classes because:
- No `this` binding issues
- Simpler mixin/composition
- Easy to split and merge
- Closures for private state where needed

---

## 12. Security Considerations

### API Key Safety

| Concern | Mitigation |
|---------|-----------|
| Key storage | localStorage in browser (client-side only) |
| Key transmission | Sent via HTTPS directly to AI provider APIs |
| Key exposure | Never sent to Python backend or any third party |
| Key clearing | Settings → Clear All Data removes everything |

### Data Privacy

| Data | Where Stored | Who Can Access |
|------|-------------|---------------|
| Uploaded PDFs | IndexedDB (browser) | Only the user's browser |
| Chat history | In-memory + IndexedDB | Only the user's browser |
| Study analytics | IndexedDB | Only the user's browser |
| Quiz reviews | IndexedDB | Only the user's browser |

### Python Backend

- Runs **locally** (`localhost:8765`) — no external exposure
- ChromaDB vectors stored in `server/data/` — local disk only
- No authentication required (local-only by design)
- FastAPI CORS configured for `localhost` only

### No External Data Collection

- No analytics services (no Google Analytics, no tracking pixels)
- No cookies
- No server-side user accounts
- Everything stays in the browser or local Python server

---

## Quick Reference: Key File Locations

| What | Where |
|------|-------|
| API keys | `localStorage: s2-cerebras-api-key, s2-gemini-api-key` |
| Theme | `localStorage: s2-theme` |
| All documents & data | `IndexedDB: s2-sentinel-db (v4)` |
| Subject config | `js/config-s2.js` → `SUBJECTS` object |
| AI prompts | `js/features/prompt-builder.js` |
| Tool definitions | `js/features/tools/*.js` (7 files) |
| Theme CSS | `css/variables.css` (12 theme blocks) |
| Python server | `server/main.py` (FastAPI, port 8765) |
| ChromaDB data | `server/data/` (gitignored) |

---

*Document Version: 1.0 — February 2026*
*S2-Sentinel Copilot by MIHx0 (Muhammad Izaz Haider)*
