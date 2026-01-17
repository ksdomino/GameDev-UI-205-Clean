# 🎮 GameDev UI

Visual game development tool for creating 2D mobile games with the Canvas Engine.

## Features

- **📁 Project Manager** - Create and manage multiple game projects
- **🗺️ Scene Flow Map** - Visual node editor for scene connections
- **🎬 Scene Editor** - Drag-drop entity placement with live preview
- **🔀 State Flow** - Visual state machine within scenes
- **🌳 Behavior Trees** - Node-based game logic editor
- **📈 Animation Curves** - Visual easing curve designer
- **🤖 AI Generation** - Claude API integration for content creation
- **🐛 Debug Panel** - Live game testing with Engine iframe
- **🔄 IDE Sync** - File watching for Cursor/VSCode integration

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
cd SceneEditor
npm install

cd ../Engine
npm install
```

### Running

You need **3 terminals**:

```bash
# Terminal 1: Backend Server (port 5176)
cd SceneEditor
npm run server

# Terminal 2: GameDev UI (port 5175)
cd SceneEditor
npm run dev

# Terminal 3: Game Engine (port 5174)
cd Engine
npm run dev
```

Then open: **http://localhost:5175**

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React App     │ ←→  │  Express API    │ ←→  │   File System   │
│   (5175)        │     │  + WebSocket    │     │   projects/     │
│                 │     │  (5176)         │     │   Engine/       │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         │ postMessage
         ↓
┌─────────────────┐
│  Engine iframe  │
│  (5174)         │
└─────────────────┘
```

## Project Structure

```
SceneEditor/
├── server.js              # Express backend + WebSocket
├── src/
│   ├── App.jsx            # Main app with routing
│   ├── services/api.js    # Backend API client
│   ├── data/defaultProject.js
│   └── components/
│       ├── ProjectManager.jsx
│       ├── Dashboard.jsx
│       ├── SceneFlowMap.jsx
│       ├── SceneEditor.jsx
│       ├── StateFlowView.jsx
│       ├── EntityPropertyEditor.jsx
│       ├── AIGenerateModal.jsx
│       ├── BehaviorTreeEditor.jsx
│       ├── AnimationCurveEditor.jsx
│       └── DebugPanel.jsx
├── projects/              # Saved game projects
├── schemas/               # JSON schemas
├── examples/              # Example scenes
└── docs/                  # Documentation
```

## Workflow

1. **Create Project** - Start with a blank game
2. **Add Scenes** - Title, Game, GameOver, etc.
3. **Design Scenes** - Add states, entities, transitions
4. **Connect Scenes** - Use Flow Map to define navigation
5. **Add Logic** - Use Behavior Trees for game flow
6. **Test** - Debug Panel runs game in real Engine
7. **Export** - Export to Engine for production build

## Entity Types

| Type | Use Case |
|------|----------|
| **Sprite** | Images, characters, backgrounds |
| **Button** | Clickable UI elements |
| **Text** | Labels, scores, messages |
| **Shape** | Rectangles, circles, lines |

## Layer System

| Layer | Z-Order | Purpose |
|-------|---------|---------|
| BG_FAR | 0 | Far backgrounds |
| BG_NEAR | 1 | Near backgrounds |
| VIDEO_IMAGE | 2 | Full-screen media |
| SHAPES | 3 | Primitives, particles |
| SPRITES | 4 | Game objects |
| TEXT | 5 | UI text |
| UI_BUTTONS | 6 | Touch buttons (top) |

## AI Generation

Click **✨ AI Generate** in Scene Editor to use Claude:

```
Example prompt:
"Create a title screen with game name 'PONGO' at top, 
blue PLAY button in center, smaller SETTINGS below"
```

Modes:
- **Entities** - Add to current state
- **State** - Create new state
- **Full Scene** - Generate multiple states

## IDE Integration

Edit project files directly in Cursor/VSCode:

```
SceneEditor/projects/my_game.json
```

The GameDev UI auto-reloads when files change externally.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | List all projects |
| GET | /api/projects/:file | Load project |
| POST | /api/projects | Save project |
| DELETE | /api/projects/:file | Delete project |
| POST | /api/export-scene | Export single scene |
| POST | /api/export-game | Export entire game |
| GET | /api/assets | List assets |

WebSocket: `ws://localhost:5176` for file change notifications

## Documentation

- `llms.txt` - Full LLM context for AI agents
- `docs/ELI10-ACTION-PLAN.md` - Simple getting started guide
- `schemas/scene-schema.json` - JSON schema for scenes
- `GAMEDEV_UI_VISION.md` - Product vision document

## Target Platform

- Canvas: 1080×1920 (portrait mobile)
- Packaging: Capacitor for iOS/Android
- Runtime: Vanilla JS Canvas Engine

## License

Private - All rights reserved
