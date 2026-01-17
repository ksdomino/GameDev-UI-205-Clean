# AI Context File

This project uses **`Engine/llms.txt`** as the master context file.

---

## 🚨 First Message Protocol

On **EVERY new session**, before responding to any user request:

1. Read `Engine/llms.txt` (full context, 1100+ lines)
2. Read `PROGRESS.md` (current session state)
3. Read `TODO.md` (active tasks)
4. State where we left off and what the immediate next step is

---

## Trigger Words

| Say This | Action |
|----------|--------|
| "hi", "hello", "morning", "let's go", "yo" | **Briefing Protocol** — Read context, state where we left off |
| "bye", "done", "handover", "back soon", "finished" | **Handover Protocol** — Update PROGRESS.md and TODO.md |

---

## Project Files

| File | Purpose |
|------|---------|
| `Engine/llms.txt` | Full project context (master) |
| `PROGRESS.md` | Session log and last handover |
| `TODO.md` | Active tasks |
| `NOTES.md` | Architecture decisions |
| `.cursorrules` | Cursor-specific rules |

---

## Prime Directive

**Goal:** Achieve Top 20 ranking in iOS App Store and Google Play Store.

**Target Genres:** Rogue-lite Action, Hybrid-Casual, Match-3, Merge Games
