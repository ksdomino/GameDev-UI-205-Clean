# GameDev UI Project

A mobile-first game development platform consisting of two parts:
- **Engine/** — Vanilla JS Canvas game runtime (targets mobile via Capacitor)
- **SceneEditor/** — React-based visual development tool

---

## 🤖 AI AGENTS — READ FIRST

> **CRITICAL:** Before doing ANYTHING, read these files in order:

1. **`Engine/llms.txt`** — Full project context (1100+ lines)
2. **`PROGRESS.md`** — Current session state and last handover
3. **`TODO.md`** — Active tasks and priorities

### Trigger Words (from llms.txt)

| Say This | Action |
|----------|--------|
| "hi", "hello", "morning" | **Briefing Protocol** — Read context files, state where we left off |
| "bye", "done", "handover" | **Handover Protocol** — Update PROGRESS.md and TODO.md |

### Tool-Specific Files
- **Cursor:** `.cursorrules` (auto-read)
- **Gemini/Other:** `.agent/CONTEXT.md`

---

## 🎯 Prime Directive

**Goal:** Achieve Top 20 ranking in iOS App Store and Google Play Store.

**Target Genres:** Rogue-lite Action, Hybrid-Casual, Match-3, Merge Games

---

## Quick Start (Humans)

```bash
# Terminal 1: Engine dev server
cd Engine && npm run dev

# Terminal 2: SceneEditor backend  
cd SceneEditor && npm run server

# Terminal 3: SceneEditor frontend
cd SceneEditor && npm run dev
```

**Ports:** Engine (5174), SceneEditor Frontend (5175), Backend (5176)

---

## Project Structure

```
/
├── Engine/           # Game runtime (Vanilla JS + Capacitor)
│   ├── llms.txt      # AI context file (READ THIS)
│   ├── src/js/       # Engine source
│   └── docs/         # Performance guides
├── SceneEditor/      # Visual dev tool (React)
├── PROGRESS.md       # Session state
├── TODO.md           # Task list
├── NOTES.md          # Architecture decisions
└── .cursorrules      # Cursor AI rules
```
