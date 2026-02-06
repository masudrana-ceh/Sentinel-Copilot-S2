# 🔧 Technical Documentation

> **Deep dive into S2-Sentinel Copilot's architecture, implementation, and development journey**

---

## 📁 Project Structure

```
S2-Sentinel-Copilot/
├── index.html                  # SPA entry point (580 lines)
├── manifest.json               # PWA manifest
│
├── docs/
│   ├── HOW_IT_WORKS.md         # Architecture deep-dive
│   └── DEVELOPMENT-PHASES.md   # Full 6-phase roadmap
│
├── css/
│   ├── variables.css           # CSS custom properties & 12 themes
│   ├── base.css                # Reset & typography
│   ├── layout.css              # Grid & flex layouts
│   ├── components.css          # Buttons, cards, modals
│   ├── animations.css          # Transitions & keyframes
│   ├── markdown.css            # AI response styling
│   └── sentinel.css            # Sentinel-specific overrides
│
├── js/
│   ├── main.js                 # Router & bootstrap
│   ├── config-s2.js            # 8 subjects config
│   ├── state-manager.js        # Reactive state with subscriptions
│   │
│   ├── features/
│   │   ├── prompt-builder.js   # 5-layer prompt assembly
│   │   ├── rag-engine.js       # TF-IDF + ChromaDB hybrid
│   │   ├── analytics.js        # Study tracking & charts
│   │   ├── history.js          # Chat history orchestrator (v2.0 Modular)
│   │   ├── history/            # Modular history components
│   │   │   ├── storage.js      # Database operations & IndexedDB
│   │   │   ├── ui.js           # DOM rendering & visual components
│   │   │   ├── export.js       # Multi-format export (JSON/HTML/PDF)
│   │   │   └── utils.js        # Helper functions & formatting
│   │   ├── toolkit.js          # Tool orchestrator (imports 7 modules)
│   │   └── tools/
│   │       ├── networks.js     # Subnet calc, port lookup, etc.
│   │       ├── pentesting.js   # Encoder, header analyzer, etc.
│   │       ├── backend.js      # JWT decoder, SQL formatter, etc.
│   │       ├── linux.js        # Permission calc, cron gen, etc.
│   │       ├── ctf.js          # Base converter, hash ID, etc.
│   │       ├── scripting.js    # Regex tester, etc.
│   │       └── privacy.js      # GDPR lookup, etc.
│   │
│   ├── services/
│   │   ├── storage-idb.js      # IndexedDB wrapper
│   │   ├── api.js              # Unified API layer (Cerebras + Gemini)
│   │   ├── file-processor.js   # File handling
│   │   └── web-search.js       # Internet search integration
│   │
│   ├── views/
│   │   ├── dashboard.js        # Main dashboard
│   │   └── workspace/          # Subject workspace (modular)
│   │       ├── workspace.js    # Workspace orchestrator
│   │       ├── chat.js         # Chat tab logic
│   │       ├── docs.js         # Documents tab logic
│   │       ├── tools-tab.js    # Tools tab logic
│   │       └── quiz.js         # Quiz tab logic
│   │
│   └── ui/
│       ├── dom.js              # DOM utilities
│       ├── modal.js            # Modal manager
│       ├── theme.js            # Theme switcher (12 themes)
│       └── toast.js            # Toast notifications
│
├── server/                     # Python RAG Backend (optional)
│   ├── main.py                 # FastAPI application
│   ├── config.py               # Pydantic settings
│   ├── requirements.txt        # Python dependencies
│   ├── start-server.bat        # One-click Windows startup
│   ├── start-server.sh         # One-click Linux/macOS startup
│   ├── __init__.py
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── processor.py        # Document processing pipeline
│   │   ├── pdf_processor.py    # PyMuPDF PDF extraction
│   │   ├── chunker.py          # Semantic text chunking
│   │   ├── vector_store.py     # ChromaDB vector store
│   │   ├── bm25.py             # BM25 keyword search
│   │   ├── query_expander.py   # Query expansion
│   │   └── models.py           # Pydantic data models
│   ├── data/
│   │   └── chromadb/           # Persistent vector database
│   └── logs/                   # Server logs
│
├── data/
│   └── prompts/                # Prompt templates
│
└── images/                     # App icons & assets
```

---

## 🏗️ Development Journey — All Phases Complete ✅

### Phase 1: Foundation ✅
- [x] Project structure & SPA router
- [x] 8 subjects configured with pedagogy styles
- [x] IndexedDB storage (8 object stores)
- [x] Reactive state management
- [x] UI shell, modals & components

### Phase 2: AI Integration ✅
- [x] Unified API layer (Cerebras + Gemini)
- [x] Automatic failover between providers
- [x] Response caching (memory + localStorage)
- [x] Streaming support with real-time rendering
- [x] Rate limiting & retry logic
- [x] 5-layer subject prompt system

### Phase 3: RAG Enhancement ✅
- [x] JavaScript TF-IDF engine (offline)
- [x] Semantic text chunking
- [x] Python backend with ChromaDB (optional)
- [x] Sentence-transformers for embeddings
- [x] Auto-detection (Python backend → JS fallback)
- [x] PDF processing with PDF.js + PyMuPDF

### Phase 4: Subject Toolkits ✅
- [x] 24 tools across 7 subject-specific modules
- [x] Modular architecture — `toolkit.js` imports 7 tool sub-modules from `tools/`
- [x] Interactive tool UI in workspace tools tab
- [x] Tool results integrated with AI chat context

### Phase 5: Analytics & Quiz ✅
- [x] Quiz system with 4 question types (MCQ, True/False, Fill-in, Short Answer)
- [x] Spaced repetition scheduling
- [x] Global stats: streak tracking, total sessions, topics learned
- [x] Per-subject analytics with Chart.js visualizations
- [x] Study time tracking & weak-topic detection

### Phase 6: Polish & Finalization ✅
- [x] 12 complete themes with CSS custom properties
- [x] Workspace split into 4 sub-modules (chat, docs, tools-tab, quiz)
- [x] Web search integration
- [x] Toast notifications & loading states
- [x] PWA manifest & service worker ready
- [x] Full documentation (README, HOW_IT_WORKS, DEVELOPMENT-PHASES)

### Post-Phase Bugfix Round (v1.6.1) ✅
- [x] Fixed theme system — 3 CSS cascade killers resolved (inline styles, Tailwind conflicts)
- [x] Added 113-line Tailwind override layer in `variables.css` for theme accent propagation
- [x] Fixed progress/analytics — missing `await` in `getAnalytics()` caused silent data loss
- [x] Fixed `getAllReviews()` — `this.db` → module-level `db` reference
- [x] Defensive `updateAnalytics()` — explicit field initialization prevents crash on new subjects
- [x] Async dashboard navigation — back button now properly awaits fresh data before rendering
- [x] Session save hardened — try/catch in `endSession()`, double-save prevention
- [x] Export button deduplication — clone-and-replace prevents listener stacking

### Feature Enhancement Round (v1.7.0) ✅

**Phase: Chat History - Basic Implementation**

- [x] **Chat History UI System** — Complete conversation management
  - Time-based filters (all/today/week/month) + multi-subject filtering
  - Conversation preview cards with auto-generated titles
  - Detail modal with continue chat functionality
  - Search functionality & bulk clear operations
  - IndexedDB integration with conversations store
  - Automatic conversation capture & splitting
  - Enhanced error handling and toast notifications

### Major Architecture Update (v2.0.0) ✅

**Phase: Modular History System + Critical Bug Fixes**

- [x] **History Modular Refactor** — From monolithic to specialized components
  - **Before**: Single 981-line history.js
  - **After**: 5-file architecture (1,386 total lines, better organized)
    - `history.js` (370 lines) - Main orchestrator
    - `history/storage.js` (148 lines) - All IndexedDB operations
    - `history/ui.js` (294 lines) - Pure DOM rendering
    - `history/export.js` (390 lines) - Multi-format export handlers
    - `history/utils.js` (187 lines) - Reusable helpers
  - **Export System**: JSON, HTML (styled), PDF (print-optimized)
  - Export dropdown with format selection
  - Professionally styled HTML/PDF with markdown rendering
  - Clear separation of concerns (storage, UI, export, utils)

- [x] **Critical Bug Fixes**
  - **Bug #1 - Missing Database Methods**: Added 3 missing methods to storage-idb.js
    - `getAllConversations()` - fetch all conversations
    - `deleteConversation(id)` - delete by ID  
    - `clearConversations()` - bulk clear
    - Updated `saveConversation()` to handle both object and legacy formats
  - **Bug #2 - UI Crashes on Invalid Data**: Added defensive checks in ui.js
    - Filter conversations with empty/null messages arrays
    - Validate data before rendering (prevents `TypeError: Cannot read properties of undefined`)
    - Show error UI for corrupted conversations
  - **Bug #3 - Continue Chat Not Working**: Fixed message format mismatch
    - **Root Cause**: History storage used `{message, type}` but AppState expected `{content, role}`
    - **Solution**: Added format conversion in workspace.js setupContinueChatListener()
    - Maps `type` → `role` and `message` → `content` when loading conversations
    - Fixed state management to use proper `conversationHistory[subjectId]` structure
    - Old conversations now load correctly and can be continued seamlessly

- [x] **About Modal** — Creator profile showcase
  - Professional bio layout with skills & education
  - Project mission statement & "Why I Built This" section
  - Social media links (GitHub, LinkedIn, Website)
  - Animated avatar with glow effects

- [x] **Professional Footer** — Site-wide branding & navigation
  - 4-column layout (Brand, Features, Resources, Company)
  - Social icon links with hover animations
  - Quick access to modals & dashboard
  - Copyright & attribution

- [x] **Welcome Screen** — First-time user onboarding
  - Feature highlights: 8 subjects, AI models, 40+ tools, analytics
  - Animated brain icon with pulse effect
  - Dismissible with localStorage persistence
  - Clean fade-out animation

- [x] **Enhanced Theme Grid** — Visual previews already implemented
  - All 12 themes display gradient backgrounds
  - Active state indicators & hover transitions

### Enhancement Round (v2.0.1) ✅

**Phase: UX & Performance Improvements**

- [x] **Prism.js Autoloader** — Dynamic syntax highlighting for code blocks
  - Automatically loads syntax highlighter for any programming language on-demand
  - Replaces manual language component loading (python, bash, javascript, sql)
  - Supports 200+ languages without bloating initial page load
  - CDN-based component fetching with intelligent caching
  - Zero configuration required - works automatically with markdown code blocks

- [x] **sessionStorage Mode Persistence** — Session-based state restoration
  - Restores active view (dashboard vs workspace) on page refresh
  - Remembers current subject selection during browser session
  - Preserves active tab (chat/docs/tools/quiz) in workspace
  - Automatic cleanup when browser/tab closes (unlike localStorage)
  - Seamless UX - users don't lose context on accidental refresh
  - Added `clearSessionState()` method for explicit state reset
  - Separate from localStorage (API keys, theme) which persists permanently

### Visual Enhancement Round (v2.0.2) ✅

**Phase: Professional UI/UX Design Upgrade**

- [x] **Premium Header Design** — Modern glassmorphism navigation
  - **Real Logo Integration**: Uses actual `images/logo.png` with fallback SVG
  - Gradient backdrop blur effect with emerald accent glow
  - Logo with animated glow halo on hover
  - Professional typography with tracking and weight variations
  - Badge-style "Copilot" label with emerald accent
  - Country flag emoji (🇧🇪) and subtitle for context
  - Responsive: Hides subtitle on mobile, maintains logo
  - Border with emerald gradient shadow for depth

- [x] **Enhanced Action Buttons** — Color-coded interactive icons
  - **History**: Emerald green hover (`emerald-500/10` background)
  - **About**: Blue hover (`blue-500/10` background)
  - **Theme**: Purple hover (`purple-500/10` background)
  - **Settings**: Orange hover (`orange-500/10` background)
  - Tooltip titles on hover for accessibility
  - Smooth border transitions on interaction
  - Consistent rounded-xl design language

- [x] **Upgraded API Status Badge** — Professional connection indicator
  - Elevated design with backdrop blur and subtle border
  - Pulsing animated dot with glow shadow
  - Medium font weight for better readability
  - Hidden on mobile, visible on desktop for space optimization

- [x] **Real Profile Integration** — Actual creator photo display
  - **Image Loading**: Uses `images/profile.png` with smart fallback
  - Larger profile size (36x36 → w-36 h-36 for prominence)
  - Gradient glow effect (emerald → cyan) with animated pulse
  - Border with emerald accent that intensifies on hover
  - Image zoom effect on hover (scale-110 transform)
  - Animated "MIHx0" badge with bounce effect
  - Graceful fallback to icon if image fails to load
  - Ring shadow for depth and separation

- [x] **Custom Animations** — Smooth micro-interactions
  - `bounce-slow`: Gentle 2s bounce for badges
  - `shimmer`: Gradient shimmer effect for loading states
  - `glow-pulse`: Emerald glow pulsing for attention elements
  - All animations respect `prefers-reduced-motion` for accessibility

---

## 📊 Codebase Stats

| Language | Files | Lines | Share |
|----------|-------|-------|-------|
| JavaScript | 27 | 8,459 | 73.6% |
| Python | 11 | 1,752 | 15.2% |
| CSS | 7 | 916 | 8.0% |
| HTML | 1 | 580 | 3.2% |
| **Total** | **46** | **11,707** | **100%** |

---

## 🐍 Python RAG Backend (Optional)

For enhanced semantic search, you can run the Python backend with ChromaDB vector database.

### Requirements
- Python 3.10+ (tested with 3.13.9)
- Windows / Linux / macOS

### Quick Start

```powershell
# Navigate to server folder
cd server

# Windows
.\start-server.bat

# Linux / macOS
chmod +x start-server.sh && ./start-server.sh
```

The script will automatically:
1. Create a virtual environment
2. Install all dependencies (FastAPI, ChromaDB, sentence-transformers, etc.)
3. Download spaCy English model
4. Start the server at `http://localhost:8765`

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/documents/upload` | POST | Upload PDF/TXT files |
| `/documents/search` | POST | Semantic search |
| `/documents/{subject}` | DELETE | Clear subject documents |

### Without Python Backend

The app works fully without the Python backend — it will use the built-in JavaScript TF-IDF engine for document search. The frontend auto-detects which engine to use.

---

## ⚙️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Vanilla JavaScript (ES Modules) |
| **Styling** | Tailwind CSS + Custom Glass Effects |
| **Storage** | IndexedDB (8 object stores) |
| **AI Models** | Cerebras (Llama 3.3 70B) + Gemini 1.5 Flash |
| **RAG** | TF-IDF (JS) + ChromaDB (Python) |
| **PDF** | PDF.js (frontend) + PyMuPDF (backend) |
| **Charts** | Chart.js for analytics |
| **Markdown** | Marked.js + Prism.js (syntax highlighting) |
| **Backend** | FastAPI + Uvicorn (Python, optional) |
| **Vector DB** | ChromaDB (persistent storage) |
| **Embeddings** | sentence-transformers (all-MiniLM-L6-v2) |
| **NLP** | spaCy (semantic chunking) |

---

## 🔧 Development

No build step required! Just serve the files:

```powershell
# Python
python -m http.server 8000

# Node.js
npx serve .

# VS Code
Use Live Server extension
```

---

## 📖 Additional Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | Beautiful overview & quick start |
| [TECHNICAL.md](TECHNICAL.md) | This file - technical deep-dive |
| [HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md) | Architecture explanation |
| [DEVELOPMENT-PHASES.md](docs/DEVELOPMENT-PHASES.md) | Full 6-phase roadmap |

---

**Made with 💻 & ☕ by the cybersecurity community, for the cybersecurity community**
