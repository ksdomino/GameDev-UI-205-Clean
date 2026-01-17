# GameDev UI - Development Notes

## 🎯 Strategic Priorities

**Prime Directive:** Achieve Top 20 ranking in iOS App Store and Google Play Store.

**Target Genres (Tier 1):**
- Rogue-lite Action (Vampire Survivors style)
- Hybrid-Casual (simple core + meta-progression)
- Match-3 / Puzzle
- Merge Games

**Key Success Factors:**
- 60fps mobile performance
- High retention mechanics (progression, daily rewards)
- Short session gameplay (5-15 minutes)

## 🤖 AI-First Development (2026)

**Workflow:** 50% prompting, 50% architecting

**AI Roles:**
- **Claude Opus 4.5** = Lead Dev (writes complex integrations)
- **Gemini 3 (1M Context)** = Architect (plans across files)

**Tool Selection Principle:** Choose the most powerful tools — AI bridges complexity.

**Backend:** PlayFab (100k free) + Firebase (Auth/Push) + Mixpanel (Analytics)

---

## Architecture Decisions

### Data-First Development (NEW - v2.02)
- **AI vibecoding must create /data/ files FIRST** before writing game code
- 7 file types: manifest, design, actors, logic, scenes, states, assets
- GameDev UI reads /data/ directly - NO reverse engineering
- Validation.json confirms data ↔ code correspondence
- More documentation = better modding experience

### The 5 Node Types (Logic System)
| Type | Color | Purpose |
|------|-------|---------|
| event | 🔴 Red | Triggers chains (OnUpdate, OnCollision) |
| variable | 🟢 Green | Read/write data (GetSpeed, SetPosition) |
| logic | 🟡 Yellow | Math/compare (NOT, AND, Add) |
| flow | 🟠 Orange | Decisions (Branch, Loop, Delay) |
| action | 🔵 Blue | Do things (Move, PlaySound, SpawnActor) |

### Center-Based Coordinates (v2.01)
- All entity x,y positions are CENTER-BASED in ConfigurableScene
- Engine internally converts to top-left for rendering
- (540, 960) = center of 1080x1920 canvas

### Game Objects vs Scene Entities
- **Game Objects** = Project-level templates (reusable, editable properties)
- **Scene Entities** = Instance in a specific scene/state
- Future: Link entities to Game Objects via `gameObjectRef`

### Mobile Deployment
- Capacitor is in **Engine/** folder (not SceneEditor)
- Games are built INTO the Engine, deployed as a complete app
- Export → Build → Sync → Android Studio workflow

### Hybrid Logic Model (Generic Studio)
- **JSON**: Visual layout and static variables
- **ConfigurableScene**: Engine base class that parses JSON
- **Custom JS**: Inherits for custom logic (Physics, AI, specialized systems)

## File Locations

| What | Where |
|------|-------|
| Data Files (NEW) | `Engine/data/*.json` |
| Projects | `SceneEditor/projects/*.json` |
| Exported Scenes | `Engine/public/scenes/*.json` |
| Game Manifest | `Engine/public/scenes/game-manifest.json` |
| Assets (Images) | `Engine/assets/images/` |
| Assets (Audio) | `Engine/assets/music/`, `Engine/assets/sfx/` |
| Capacitor Config | `Engine/capacitor.config.json` |
| Android Project | `Engine/android/` |

## Running the System

```bash
# Terminal 1: Engine dev server
cd Engine && npm run dev

# Terminal 2: SceneEditor backend
cd SceneEditor && npm run server

# Terminal 3: SceneEditor frontend
cd SceneEditor && npm run dev
```

Ports:
- Engine: 5174
- SceneEditor Frontend: 5175
- SceneEditor Backend: 5176

## Quick Commands

```bash
# Build for Android
cd Engine && npm run build:android

# Open Android Studio  
cd Engine && npx cap open android

# List all data files
find Engine/data -name "*.json"
```