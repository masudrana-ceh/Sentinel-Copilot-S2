# S2-Sentinel Copilot 🛡️

> **Hyper-Intelligent AI Study Platform for CS Engineering Semester 2**  
> Built specifically for Howest University Belgium

![Version](https://img.shields.io/badge/version-1.6.1-emerald)
![Phase](https://img.shields.io/badge/phase-6%2F6%20%2B%20bugfix-brightgreen)
![Courses](https://img.shields.io/badge/courses-8-purple)
![Lines](https://img.shields.io/badge/lines-11.5k%2B-blue)
![AI](https://img.shields.io/badge/AI-Cerebras%20%7C%20Gemini-orange)

---

## 🎯 What is S2-Sentinel?

S2-Sentinel Copilot is a **subject-aware AI tutor** that understands your specific courses, uses your uploaded materials for context, and teaches using the **optimal pedagogy style** for each subject. All 6 development phases are complete — from foundation through AI integration, RAG, toolkits, analytics/quiz, and final polish.

### Key Differentiators

| Feature | Description |
|---------|-------------|
| **8 Subjects Configured** | Each with unique teaching style & dedicated tools |
| **5-Layer Prompt System** | Identity → Expertise → Pedagogy → Examples → Context |
| **Document RAG** | Upload PDFs, get context-aware answers (TF-IDF + ChromaDB) |
| **24 Subject Tools** | Across 7 subject-specific tool modules |
| **Quiz System** | 4 question types with spaced repetition |
| **12 Themes** | Glass, Sentinel-Dark, Hacker, and 9 more |
| **Global Stats** | Streak tracking, sessions, topics learned |
| **Study Analytics** | Track time, quizzes, weak topics with Chart.js |

---

## 📚 Courses Covered

| Course | Credits | Teaching Style | Tools |
|--------|---------|----------------|-------|
| 🔵 Computer Networks | 6 ECTS | Packet-First | Subnet Calc, Port Lookup |
| 🔴 Web Pentesting | 3 ECTS | Attack-Chain | Encoder, Header Analyzer |
| 🟢 Web Backend | 3 ECTS | Code-First | JWT Decoder, SQL Formatter |
| 🟡 Linux for Ethical Hackers | 6 ECTS | CLI-First | Permission Calc, Cron Gen |
| 🟣 Capture The Flag | 3 ECTS | Hint-Ladder | Base Converter, Hash ID |
| 🔵 Scripting & Code Analysis | 6 ECTS | Annotated-Code | Regex Tester |
| 🌸 Data Privacy & IT Law | 3 ECTS | Case-Based | GDPR Lookup |
| 🤖 AI Security | 3 ECTS | Threat-Model | AI Threat Analyzer |

---

## 🎨 Themes

12 fully-designed themes with CSS custom properties:

| Theme | Style |
|-------|-------|
| Glass | Frosted glass morphism (default) |
| Sentinel-Dark | Deep dark with emerald accents |
| Hacker | Green-on-black terminal aesthetic |
| Midnight | Deep blue night palette |
| Cyber | Neon cyan & magenta |
| Ocean | Cool blue-green depths |
| Forest | Natural greens & earth tones |
| Nebula | Purple cosmic gradients |
| Aurora | Northern lights gradient |
| Sunset | Warm orange & pink hues |
| Lavender | Soft purple pastels |
| Light | Clean white & light gray |

---

## 🚀 Quick Start

### 1. Open the App
```
Open index.html in Chrome (or any modern browser)
```

### 2. Add API Key
Get a **free** API key from one of:
- [Cerebras](https://cloud.cerebras.ai/) (Recommended - Fast!)
- [Google AI Studio](https://aistudio.google.com/apikey)

### 3. Select a Course
Click any subject card on the dashboard

### 4. Upload Materials
Drop your PDF course slides/notes for context-aware responses

### 5. Start Learning!
Ask questions, use tools, take quizzes, track your progress

---

## 🏗️ Development Status — All Phases Complete ✅

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

---

## 📊 Codebase Stats

| Language | Files | Lines | Share |
|----------|-------|-------|-------|
| JavaScript | 27 | 8,459 | 73.6% |
| Python | 11 | 1,752 | 15.2% |
| CSS | 7 | 916 | 8.0% |
| HTML | 1 | 372 | 3.2% |
| **Total** | **46** | **11,499** | **100%** |

---

## 📁 Project Structure

```
S2-Sentinel-Copilot/
├── index.html                  # SPA entry point (372 lines)
├── manifest.json               # PWA manifest
├── README.md                   # This file
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
│   │   ├── api.js              # AI providers (Cerebras/Gemini)
│   │   ├── storage-idb.js      # IndexedDB (8 stores)
│   │   └── web-search.js       # Web search integration
│   │
│   ├── views/
│   │   ├── dashboard.js        # Subject grid & global stats
│   │   └── workspace/
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

## 🔧 Architecture Highlights

### Modular Design
- **`toolkit.js`** dynamically imports 7 tool sub-modules from `js/features/tools/` — each subject gets its own tool file
- **`workspace.js`** orchestrates 4 sub-modules in `js/views/workspace/` — chat, docs, tools-tab, and quiz
- **Reactive state** via `state-manager.js` with subscription-based updates across all components

### Quiz System
- 4 question types: Multiple Choice, True/False, Fill-in-the-Blank, Short Answer
- AI-generated questions based on subject context
- Spaced repetition scheduling for optimal retention
- Per-subject quiz history and performance tracking

### Analytics & Stats
- **Global stats**: Study streak, total sessions, topics learned
- **Per-subject**: Time spent, quiz scores, weak topics
- **Visualizations**: Chart.js bar/line/doughnut charts

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

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | Quick start & overview |
| [HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md) | Architecture deep-dive |
| [DEVELOPMENT-PHASES.md](docs/DEVELOPMENT-PHASES.md) | Full 6-phase roadmap |

---

## 🎓 About

Built by **Muhammad Izaz Haider (MIHx0)**  
Cybersecurity Student @ Howest University Belgium 🇧🇪  
Junior DevSecOps & AI Security Engineer @ Damno Solutions  
Founder of The PenTrix

---

## 📜 License

MIT License — Use freely, modify as needed.

---

**Made with 🛡️ for Semester 2 success**
