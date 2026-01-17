# Scene Editor - Next Steps & Implementation Plan

> **Created:** January 13, 2026  
> **Based on:** Gemini's recommendations + PROJECT_HANDOFF.md  
> **Target:** Platinum Standard with Ease of Use

---

## 🎯 Key Architectural Decision: JSON-Driven Scenes

**Gemini's core recommendation:** Instead of Claude generating `.js` files directly, generate a **Scene JSON Schema** that the engine parses at runtime.

### Why This Is Better

| Current Approach | JSON-Driven Approach |
|------------------|---------------------|
| Claude generates full JS code | Claude generates structured JSON |
| Any code change = regenerate entire file | Tweak JSON values instantly |
| More prone to syntax errors | Validated schema = fewer errors |
| No hot-reloading possible | Hot-reload JSON changes live |
| Harder to edit manually | JSON is human-readable |

### Implementation Strategy

1. **Scene.js becomes a "player"** that reads and executes JSON
2. **Claude generates Scene JSON** instead of raw JavaScript
3. **Editor can live-preview** changes without full regeneration
4. **Backwards compatible** - existing scenes still work

---

## 📋 Revised Phase Plan

### Phase 0: Foundation (NEW - 1-2 days)

**Goal:** Establish JSON-driven architecture before building UI

#### Tasks:
1. ☐ Create `SceneEditor/schemas/scene-schema.json` - Define the schema
2. ☐ Update `Engine/src/js/scenes/Scene.js` - Add `loadFromConfig(json)` method
3. ☐ Create example `TestScene.json` to validate the approach
4. ☐ Add PO2 validation to `AssetLoader.js` (warn on non-PO2 assets)
5. ☐ Test: Scene.js can load and run from JSON config

**Success Criteria:**
- `Scene.loadFromConfig(json)` works
- Can define states, layers, entities in JSON
- Engine runs the JSON-defined scene correctly

---

### Phase 1: Backend + Simple Editor (1 week)

**Goal:** Generate Scene JSON via Claude API, test end-to-end

#### Tasks (from PROJECT_HANDOFF.md, updated):
1. ☐ Set up Express server in `SceneEditor/server/`
2. ☐ Claude API integration (`@anthropic-ai/sdk`)
3. ☐ **NEW:** Claude generates Scene JSON (not raw JS)
4. ☐ File manager writes both JSON and optional JS wrapper
5. ☐ Simple HTML editor with JSON textarea
6. ☐ Test end-to-end flow

#### API Changes:
```javascript
// POST /api/generate-scene
// Response now includes:
{
  success: true,
  jsonPath: "/Engine/src/js/scenes/TestScene.json",
  json: { /* Scene JSON */ },
  // Optionally generate JS wrapper if needed
  jsPath: "/Engine/src/js/scenes/TestScene.js"
}
```

**Success Criteria:**
- Claude generates valid Scene JSON
- JSON file appears in `Engine/src/js/scenes/`
- Scene loads and runs via `Scene.loadFromConfig()`

---

### Phase 2: Timeline UI (1 week)

**Goal:** Visual timeline editor in vanilla JS (no React!)

#### Mockup Conversion Task:
The mockups in `SceneEditor/docs/mockup-*.jsx` are in React.
**First task:** Convert to vanilla JS + HTML + CSS.

#### Timeline Features:
- Visual bars for states
- Drag edges to resize duration
- Click to select/edit state
- Add/delete states
- Time markers

#### Implementation Approach (from Gemini):
- Use HTML `<canvas>` or absolute-positioned `<div>` elements
- Each state = div with `width = duration * pixels_per_second`
- Drag handles = small div on right edge

**Success Criteria:**
- Build 3+ state timeline visually
- Resize durations by dragging
- No React code in final product

---

### Phase 3: Asset Management (1 week)

**Goal:** Upload assets, assign to layers, PO2 validation

#### Features:
- File upload (images: PNG, WebP, JPEG | audio: MP3, OGG)
- Copy to `Engine/assets/images/` or `Engine/assets/music/`
- **NEW:** Auto-validate PO2 dimensions on upload
- Show warning if asset isn't PO2 (from Gemini)
- Layer assignment dropdowns
- Property editor (x, y, w, h, rotation, alpha)

#### PO2 Validation:
```javascript
// In AssetLoader or during upload
function isPowerOfTwo(n) {
  return n && (n & (n - 1)) === 0;
}

function validatePO2(width, height) {
  const isValid = isPowerOfTwo(width) && isPowerOfTwo(height);
  if (!isValid) {
    console.warn(`⚠️ Asset is ${width}x${height} (not PO2). May cause GPU performance issues.`);
  }
  return isValid;
}
```

**Success Criteria:**
- Upload works, files land in Engine/assets
- PO2 warnings appear in console/debug panel
- Can assign assets to layers per state

---

### Phase 4: Debug Panel + Polish (1 week)

**Goal:** Real-time debugging, professional UX

#### Debug Panel Features:
- FPS graph (60-frame history)
- Entity inspector (click to edit x, y, rotation, etc.)
- Layer visibility toggles
- Memory stats from `AssetLoader.getCacheStats()`
- **NEW:** PO2 warnings displayed prominently

#### Polish:
- Error handling with clear messages
- Loading spinners
- Keyboard shortcuts (Ctrl+S = Generate, etc.)
- **Future:** Remote debugging via WebSocket (Gemini suggestion)

**Success Criteria:**
- Debug Panel works at `localhost:3000/debug`
- Can edit entity properties live
- See PO2 warnings in UI

---

## 📐 Scene JSON Schema (Draft)

```json
{
  "$schema": "scene-config-v1",
  "sceneName": "QuizIntroScene",
  "canvasSize": { "width": 1080, "height": 1920 },
  "assets": {
    "images": [
      { "id": "bg_logo", "path": "/assets/images/bg_logo.png" }
    ],
    "audio": [
      { "id": "click", "path": "/assets/music/click.mp3" }
    ]
  },
  "states": [
    {
      "name": "TITLE_SPLASH",
      "duration": 2.0,
      "clearLayers": false,
      "layers": {
        "BG_FAR": [
          {
            "type": "sprite",
            "assetId": "bg_logo",
            "x": 0, "y": 0,
            "width": 1080, "height": 1920,
            "animation": { "type": "fadeIn", "duration": 1.0 }
          }
        ]
      },
      "transition": {
        "type": "timer",
        "duration": 2.0,
        "nextState": "INSTRUCTIONS"
      }
    },
    {
      "name": "INSTRUCTIONS",
      "duration": 3.0,
      "clearLayers": true,
      "layers": {
        "UI_BUTTONS": [
          {
            "type": "button",
            "text": "Start Quiz",
            "x": 140, "y": 500,
            "width": 200, "height": 80,
            "color": "#4a9eff",
            "onClick": { "action": "switchScene", "target": "GameScene" }
          }
        ]
      },
      "transition": {
        "type": "button",
        "buttonText": "Start Quiz",
        "nextScene": "GameScene"
      }
    }
  ]
}
```

---

## 🛠️ Technology Decisions

### Confirmed:
- ✅ **Vanilla JS** - No React, no Tailwind
- ✅ **Express.js** - Backend server
- ✅ **Claude API** - Code/JSON generation
- ✅ **JSON-driven scenes** - Engine parses JSON
- ✅ **Capacitor** - Future mobile deployment

### Consider Later (from Gemini):
- 🤔 **TypeScript** - For engine core (Engine.js, LayerManager.js)
  - Benefit: Catch null errors before runtime
  - Cost: Learning curve, build setup
  - Verdict: **Phase 5** enhancement, not blocker
  
- 🤔 **PixiJS** - For WebGL rendering
  - Benefit: Hardware-accelerated, handles PO2 automatically
  - Cost: Major refactor, different API
  - Verdict: **Future engine upgrade**, not for SceneEditor

- 🤔 **XState** - For state management
  - Benefit: Visual state machine debugging
  - Cost: Another library to learn
  - Verdict: **Nice-to-have** for complex scenes

- 🤔 **Supabase** - For cloud save/export
  - Benefit: Database + file storage
  - Cost: Network dependency, hosting costs
  - Verdict: **Phase 5** feature for game publishing

---

## ⚡ Quick Wins (Do First)

1. **Add PO2 validation to AssetLoader** (30 min)
   - Log warning for non-PO2 images
   - Can be shown in Debug Panel later

2. **Create Scene JSON schema file** (1 hour)
   - Defines the contract for scene configuration
   - Reference for Claude prompts

3. **Add `loadFromConfig(json)` to Scene.js** (2 hours)
   - Core of JSON-driven approach
   - Test with simple JSON first

---

## 📝 Files to Create (Phase 0)

```
SceneEditor/
├── schemas/
│   └── scene-schema.json      ← Scene JSON schema definition
├── examples/
│   └── TestScene.json         ← Example scene for testing
└── NEXT_STEPS.md              ← This file

Engine/src/js/scenes/
└── Scene.js                   ← Add loadFromConfig() method
```

---

## 🚀 Recommended First Session

1. Create the Scene JSON schema
2. Implement `Scene.loadFromConfig(json)` in Engine
3. Create a test JSON file
4. Verify the engine can run from JSON
5. Then proceed to Phase 1 backend

This validates the JSON-driven approach before investing in UI work.

---

## 📋 Questions Answered (from PROJECT_HANDOFF.md)

> 1. Should I build the Express backend first or the simple HTML editor first?

**Answer:** Build **Phase 0 (JSON foundation)** first, then backend. The JSON schema drives everything.

> 2. What's the absolute simplest timeline UI I can start with (even if ugly)?

**Answer:** A list of `<div>` elements with width = duration. Add drag handles later.

> 3. How should I structure the Claude API prompt for best code generation results?

**Answer:** Ask Claude to generate **valid JSON matching the schema**, not raw JS. Include the schema in the prompt.

> 4. Should I include the entire llms.txt in every API call?

**Answer:** Include relevant sections only. For JSON generation, focus on:
- Layer names (BG_FAR, SPRITES, etc.)
- Entity types (sprite, button)
- Animation types
- Scene lifecycle info

> 5. How do I test the backend without building the full frontend first?

**Answer:** Use `curl` or Postman to POST JSON to `/api/generate-scene`.

> 6. What's the best way to handle file paths across Windows/Mac/Linux?

**Answer:** Use Node's `path.join()` and relative paths in config.json.

> 7. Should I use a database or just read/write JSON files?

**Answer:** JSON files for now. Database (Supabase) is a Phase 5 feature.

---

*Ready to start Phase 0? Let's create the Scene JSON schema!* 🚀
