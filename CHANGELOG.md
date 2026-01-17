# Changelog

All notable changes to the GameDev UI project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.03-alpha] - 2026-01-16

### ✨ Clean Template Rebuild
- **SCRUBBED** all Pong-specific data, scenes, projects, and leftover images
- **REFACTORED** `main.js` to be generic (removed `PongScene` special casing)
- **GENERICIZED** `llms.txt` in both Engine and SceneEditor with standard templates for AI vibecoding
- **VERIFIED** empty state for `Engine/data`, `Engine/public/scenes`, and `SceneEditor/projects`
- **READY** for fresh game generation from simple prompts
- **NEW**: `.gitignore` optimized for Mac/Windows collaboration

## [2.02-alpha] - 2026-01-16

### 🚀 Major Features

#### Phase 1: Data-First Development System
- **NEW**: AI vibecoding now creates `/data/` documentation FIRST before writing code
- **NEW**: 4-stage documentation process: Plan → Implement → Validate → Log
- **NEW**: 12 data files (manifest, design, actors, logic, scenes, states, assets, validation)
- **ELIMINATES** reverse engineering - GameDev UI reads data directly

#### Phase 2: DATA API & UI Components
- **NEW**: 12+ REST API endpoints in `server.js` under `/api/data/*`
- **NEW**: 15 client API functions in `api.js` for data loading
- **NEW**: `ActorList.jsx` - Displays actors with type icons (⚪🏓⭐👾), colors, variable counts
- **NEW**: `GameDataPanel.jsx` - Game overview, stats grid, actor list
- **NEW**: "📊 Game Data" button in Dashboard (cyan gradient)

#### Phase 3: Visual Node Editor
- **NEW**: `NodeEditor.jsx` - Full visual canvas for logic graphs
- **5 Node Type Colors**: Event🔴, Variable🟢, Logic🟡, Flow🟠, Action🔵
- **Bezier Curve Connections** between nodes with SVG rendering
- **Properties Panel** - Shows node details, inputs, outputs, and properties
- **"🔗 View Logic"** button on each actor card to open editor

#### Phase 4: Output Modes
- **Mode A: "🔄 Sync to Engine"** - Saves logic to filesystem + sends postMessage to Engine
  - Status states: idle → syncing → synced/error
- **Mode B: "📋 Generate Prompt"** - Creates markdown IDE prompt for code updates
  - Modal with preformatted prompt text
  - Copy to clipboard button

### 📚 Documentation
- Updated `Engine/llms.txt` with data-first 4-stage process (~200 lines added)
- Updated `SceneEditor/llms.txt` with data-first instructions
- Updated `TODO.md`, `PROGRESS.md`, `NOTES.md`, `CHANGELOG.md`

### 🔧 New Files Created
- `Engine/data/manifest.json`, `design.json`, `assets.json`, `validation.json`
- `Engine/data/actors/Ball.json`, `PlayerPaddle.json`, `AIPaddle.json`
- `Engine/data/logic/Ball.logic.json`, `PlayerPaddle.logic.json`, `AIPaddle.logic.json`
- `Engine/data/scenes/GameScene.scene.json`
- `Engine/data/states/GameScene.states.json`
- `SceneEditor/src/components/ActorList.jsx`
- `SceneEditor/src/components/GameDataPanel.jsx`
- `SceneEditor/src/components/NodeEditor.jsx`

---

## [2.01-alpha] - 2026-01-16


#### Async Scene Initialization
- **Fixed critical asset loading race condition** - Assets are now guaranteed to be cached before scenes render
- Made `Scene.enter()`, `SceneManager.switchTo()`, and `SceneManager.changeScene()` fully async
- `ConfigurableScene.enter()` now properly awaits base class initialization
- Eliminates "white rectangle" bug where backgrounds failed to load on mobile

#### Center-Based Coordinate System
- **All entity coordinates (x, y) are now CENTER-BASED** in ConfigurableScene
- Updated `_createSprite()` and `_createShape()` to convert center coords to top-left internally
- Sprites, buttons, and shapes now render identically in Scene Editor preview and Engine
- Position (540, 960) now correctly centers an entity on the 1080x1920 canvas

#### Automatic Asset Extension Discovery
- Backend export now scans filesystem for correct image extensions (.jpg, .png, .webp, etc.)
- No more hardcoded `.png` fallback causing missing assets
- Robust asset manifest population during game export

### ✨ Enhancements

#### Granular Font Controls
- **New separate controls** for text styling in EntityPropertyEditor:
  - `fontSize` (number input)
  - `fontFamily` (dropdown: Arial, Helvetica, Courier New, Georgia, System UI)
  - `fontWeight` (dropdown: Normal, Bold, Light)
- Legacy `font` string field still supported for backward compatibility
- Engine's `ConfigurableScene._createText()` dynamically constructs CSS font string

#### Editor Preview Improvements
- Fixed text container in Scene Editor preview to prevent clipping of large fonts
- Text and button entities now render at correct sizes in the visual preview
- Added checkered transparency background for sprite previews

#### UX Polish
- Added loading states (`isExporting`, `isDeploying`) to Dashboard "Test in Browser" and "Test on Device" buttons
- Improved visual feedback during export and deployment operations

### 📚 Documentation
- Updated **Engine/llms.txt** to version 2.2:
  - Documented async scene initialization flow
  - Added center-based coordinate notes for ConfigurableScene
  - Clarified that `switchTo()` and `changeScene()` must be awaited
  
- Updated **SceneEditor/llms.txt** to version 2.2:
  - Added center-based coordinate documentation in entity examples
  - Documented new font control properties
  - Added notes about automatic asset sync

### 🐛 Bug Fixes
- Fixed background images not loading on mobile devices
- Fixed coordinate mismatch between Scene Editor preview and Engine rendering
- Fixed text preview container being too small for large font sizes
- Fixed asset extension handling (`.jpg` files no longer fail to load)

### 🔧 Technical Changes

#### Files Modified - Engine
- `src/js/core/SceneManager.js` - Made async
- `src/js/scenes/Scene.js` - Made `enter()` async with proper await
- `src/js/scenes/ConfigurableScene.js` - Center-based coord conversion, async enter, improved font handling
- `src/js/main.js` - Await all scene switches
- `llms.txt` - Version 2.2 documentation

#### Files Modified - SceneEditor
- `src/components/EntityPropertyEditor.jsx` - Granular font controls
- `src/components/SceneEditor.jsx` - Fixed text preview containers
- `src/components/Dashboard.jsx` - Loading state buttons
- `server.js` - Dynamic asset extension discovery
- `llms.txt` - Version 2.2 documentation

---

## [2.0] - Previous Release

Initial version with:
- Custom Variables support
- Hybrid Logic (Configurable + JS)
- Game Objects system
- Asset Library
- Mobile deployment via Capacitor
- Synthesized audio (playBeep)
- Touch auto-unlock for mobile audio
