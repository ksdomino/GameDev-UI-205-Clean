1. - # Canvas Engine Development Tools - Complete Project Handoff

     **Date:** January 13, 2026
      **Target:** Cursor + Claude Opus 4.5
      **Developer:** Beginner-intermediate JavaScript (no React knowledge)

     ------

     ## 🎯 Project Goal

     Build a **two-screen development environment** for creating 2D mobile games with my Canvas Engine:

     1. **Debug Panel** - Real-time game debugging (landscape, 1920x1080)
     2. **Scene Editor** - Visual timeline-based scene creation with Claude API (landscape, 1920x1080)

     Both tools run locally and help me rapidly prototype games at 480x720 (scales to 1080x1920 production).

     ------

     ## ✅ What I Already Have

     ### Complete Game Engine

     - Vanilla JavaScript HTML5 Canvas engine
     - Internal resolution: 1080x1920 (9:16 portrait mobile)
     - Letterbox scaling for any screen size
     - Scene system, layer manager, input handler, asset loader, audio manager
     - Sprite and Button entity classes
     - Documentation: `llms.txt` and `ASSET_PIPELINE_AND_PERFORMANCE.md`

     ### Development Environment

     - Node.js installed
     - Claude API key ready (Anthropic)
     - Comfortable with JavaScript, Express basics
     - **Don't know React** - need vanilla JS solutions

     ### Design Decisions Already Made

     - Two separate HTML pages (debug.html, editor.html)
     - Express backend for both screens
     - Claude API for scene code generation
     - Cost acceptable: ~$0.03 per scene generation
     - Timeline-based scene editing (like simple video editor)
     - Scenes have temporal "states" (points in time)

     ------

     ## 🏗️ Architecture Overview

```
    ┌──────────────────────────────────────────────────────────────┐
    │                    Browser (localhost)                        │
    │  ┌────────────────────┐         ┌────────────────────┐      │
    │  │  Screen 1:         │         │  Screen 2:         │      │
    │  │  Debug Panel       │         │  Scene Editor      │      │
    │  │  :3000/debug       │         │  :3000/editor      │      │
    │  └────────────────────┘         └────────────────────┘      │
    └──────────────────────────────────────────────────────────────┘
                        ↓ HTTP                    ↓ HTTP
    ┌──────────────────────────────────────────────────────────────┐
    │              Express Server (localhost:3000)                  │
    │  ┌─────────────────────────────────────────────────────┐    │
    │  │  Routes:                                             │    │
    │  │  - GET /debug       → debug panel HTML              │    │
    │  │  - GET /editor      → scene editor HTML             │    │
    │  │  - POST /api/generate-scene → Claude API            │    │
    │  │  - POST /api/copy-asset → File system               │    │
    │  │  - GET /api/assets → List files                     │    │
    │  └─────────────────────────────────────────────────────┘    │
    └──────────────────────────────────────────────────────────────┘
                                  ↓
                  ┌───────────────────────────────┐
                  │   Claude API (Anthropic)      │
                  │   Model: sonnet-4-20250514   │
                  └───────────────────────────────┘
                                  ↓
    ┌──────────────────────────────────────────────────────────────┐
    │              Game Engine Project Files                        │
    │  /Engine/                                                    │
    │  ├── src/js/scenes/     ← Generated scenes written here     │
    │  ├── assets/images/     ← Uploaded images copied here       │
    │  ├── assets/music/      ← Uploaded audio copied here        │
    │  ├── llms.txt           ← Engine docs (for Claude prompt)   │
    │  └── docs/ASSET_PIPELINE_AND_PERFORMANCE.md                 │
    └──────────────────────────────────────────────────────────────┘
    ```

     ------

     ## 📺 Screen 1: Debug Panel (Already Prototyped)

     ### Purpose

     Real-time debugging interface while developing/testing games.

     ### Layout (1920x1080 landscape)

     ```
     ┌─────────────────────────────────────────────────────────────┐
     │  Debug Panel (1440px)          │  Game Preview (480px)      │
     │                                 │                            │
     │  Scene: [TitleScene ▼]         │   ┌──────────────┐        │
     │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   │              │        │
     │  📊 Performance                 │   │              │        │
     │  FPS: 60  Entities: 45          │   │   480x720    │        │
     │  Memory: 23.5 MB                │   │   Preview    │        │
     │  [FPS Graph ___/‾‾‾\___]        │   │  (Canvas)    │        │
     │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   │              │        │
     │  🎬 Layers                      │   └──────────────┘        │
     │  ☑ BG_FAR (2 entities)          │                            │
     │  ☑ BG_NEAR (0 entities)         │   [Toggle Preview]        │
     │  ☑ SPRITES (15 entities) ⚠️     │                            │
     │  ☑ UI_BUTTONS (3 entities)      │                            │
     │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │                            │
     │  🎮 Entities (SPRITES layer)    │                            │
     │  └─ player [AnimatedSprite]     │                            │
     │     x: 240    [edit]            │                            │
     │     y: 360    [edit]            │                            │
     │     rotation: 0 [edit]          │                            │
     │     alpha: 1.0  [edit]          │                            │
     │     ☑ visible  ☑ active         │                            │
     │  └─ enemy_1 [Sprite]            │                            │
     │     x: 100    y: 200            │                            │
     │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │                            │
     │  📦 Assets                      │                            │
     │  🖼️ player.png (512x512, 1MB)  │                            │
     │     [Unload]                    │                            │
     │  🔊 click.mp3 (0.5s, 50KB)      │                            │
     │     [Unload]                    │                            │
     └─────────────────────────────────────────────────────────────┘
     ```

     ### Features

     ✅ **Already prototyped in vanilla JS** (see earlier artifact in this chat)

     - Scene switcher dropdown (jump between scenes instantly)
     - Real-time FPS graph (60-frame history)
     - Entity count per layer
     - Memory usage display
     - Layer visibility toggles (show/hide entire layers)
     - Entity list for selected layer
     - Live property editing (change x, y, rotation, alpha, visible, active)
     - Asset viewer with unload buttons
     - Game preview in 480x720 canvas (can be toggled on/off)

     ### Technical Notes

     - Uses `DebugBridge` class to read engine state
     - Updates via `requestAnimationFrame` (60 FPS)
     - Game canvas is 480x720 (half of 1080x1920 for desktop viewing)
     - All entity property changes are live (no save button needed)

     ### Status

     **Phase 1 Complete** - Working prototype exists in this chat history.

     ------

     ## 📺 Screen 2: Scene Editor (To Be Built)

     ### Purpose

     Visual timeline-based interface for creating game scenes with Claude API code generation.

     ### User Workflow

     1. Open editor at `http://localhost:3000/editor`
     2. Create scene name: "QuizIntroScene"
     3. Add states to timeline (drag-drop visual bars):
        - State 1: "TITLE_SPLASH" (0-2 seconds)
        - State 2: "INSTRUCTIONS" (2-5 seconds)
        - State 3: "COUNTDOWN" (5-8 seconds)
     4. For each state, assign assets to layers:
        - Select state "TITLE_SPLASH"
        - Layer BG_FAR: Choose "bg_logo.png"
        - Set properties: x=0, y=0, width=1080, height=1920
        - Add animation: "Fade In" over 1 second
     5. Click "Generate Scene" button
     6. Backend sends timeline data + engine docs to Claude API
     7. Claude generates complete `QuizIntroScene.js` file
     8. Backend writes file to `/Engine/src/js/scenes/`
     9. Success message: "Scene generated! Open in Debug Panel to test."
     10. Switch to Debug Panel, select "QuizIntroScene" from dropdown, test immediately

     ### Layout (1920x1080 landscape)

     ```
     ┌─────────────────────────────────────────────────────────────┐
     │  Scene Editor                                               │
     ├─────────────────────────────────────────────────────────────┤
     │  Scene Name: [QuizIntroScene]                               │
     │  [Generate Scene] [Load Existing Scene] [Clear All]        │
     ├─────────────────────────────────────────────────────────────┤
     │  📅 Timeline (Horizontal, drag to resize)                   │
     │  ┌──────────────────────────────────────────────────────┐  │
     │  │ 0s    1s    2s    3s    4s    5s    6s    7s    8s   │  │
     │  ├──────────────────────────────────────────────────────┤  │
     │  │ ████████████                    [TITLE_SPLASH]       │  │
     │  │             ██████████████      [INSTRUCTIONS]       │  │
     │  │                           █████ [COUNTDOWN]          │  │
     │  └──────────────────────────────────────────────────────┘  │
     │  [+ Add State]                                              │
     ├─────────────────────────────────────────────────────────────┤
     │  ⚙️ Selected State: TITLE_SPLASH (0.0s - 2.0s)             │
     │  Name: [TITLE_SPLASH]  Duration: [2.0]s  [Delete State]   │
     │  ☑ Clear all layers when entering this state              │
     ├─────────────────────────────────────────────────────────────┤
     │  🎬 Layer Assignment (for TITLE_SPLASH state)              │
     │  ┌────────────────────────────────────────────────────┐   │
     │  │ BG_FAR:      [bg_logo.png ▼]                        │   │
     │  │              x: 0    y: 0    w: 1080   h: 1920      │   │
     │  │              rotation: 0  alpha: 1.0                │   │
     │  │              Animation: [Fade In ▼] Duration: 1.0s  │   │
     │  │ BG_NEAR:     [None ▼]                               │   │
     │  │ VIDEO_IMAGE: [None ▼]                               │   │
     │  │ SHAPES:      [None ▼]                               │   │
     │  │ SPRITES:     [None ▼]                               │   │
     │  │ TEXT:        [None ▼]                               │   │
     │  │ UI_BUTTONS:  [None ▼]                               │   │
     │  └────────────────────────────────────────────────────┘   │
     ├─────────────────────────────────────────────────────────────┤
     │  📦 Assets                                                  │
     │  Images: [+ Upload Image]                                  │
     │    • bg_logo.png (1080x1920, 500KB) [Delete]              │
     │    • instruction_text.png (300x400, 120KB) [Delete]       │
     │  Audio: [+ Upload Audio]                                   │
     │    • click.mp3 (0.5s, 50KB) [Delete]                       │
     └─────────────────────────────────────────────────────────────┘
     ```

     ### Components to Build

     #### 1. Timeline Component

     - **Visual bars** representing states (colored rectangles)
     - **Drag handles** on right edge to resize duration
     - **Click** to select state (highlights selected)
     - **Time markers** at top (0s, 1s, 2s, 3s...)
     - **"+ Add State"** button below timeline
     - States cannot overlap (validation)

     **Implementation Approach:**

     - Use HTML Canvas or SVG for timeline
     - Or use HTML divs with absolute positioning (simpler)
     - Each state = div with width = duration * pixels_per_second
     - Drag handles = small div on right edge with mousedown listener

     #### 2. State Editor Panel

     - **Name input** (text field)
     - **Duration slider** (0.1s to 30s range)
     - **"Clear layers"** checkbox
     - **Delete button**
     - Shows which state is currently selected

     #### 3. Layer Assignment Grid

     - **7 dropdowns** (one for each layer: BG_FAR, BG_NEAR, VIDEO_IMAGE, SHAPES, SPRITES, TEXT, UI_BUTTONS)
     - Each dropdown populated with available assets
     - When asset selected, show property inputs:
       - **For Sprites**: x, y, width, height, rotation, alpha, scaleX, scaleY
       - **For Buttons**: x, y, width, height, text, color, onClick action
       - **For Text**: x, y, content, font, size, color, textAlign
     - **Animation dropdown** (optional):
       - None
       - Fade In
       - Fade Out
       - Slide In (from: top/bottom/left/right)
       - Custom (manual code entry)
     - **Animation duration** input (if animation selected)

     #### 4. Asset Manager

     - **Upload buttons** for images and audio
     - Opens file browser
     - Copies file to `/Engine/assets/images/` or `/assets/music/`
     - Generates asset ID from filename (e.g., "bg_logo.png" → "bg_logo")
     - Shows list of uploaded assets with thumbnails (for images)
     - **Delete button** per asset
     - File validation:
       - Images: PNG, WebP, JPEG only
       - Audio: MP3, OGG only
       - Max file size: 5MB

     #### 5. Generate Scene Button

     - **Validation**:
       - Scene name not empty
       - At least one state exists
       - No overlapping states
       - All asset references valid
     - **On click**:
       - Show loading spinner
       - Convert timeline to JSON
       - Send POST request to `/api/generate-scene`
       - Display success message with file path
       - Or display error message if failed
     - **Optional**: Show generated code in modal (for review before saving)

     ### API Endpoints to Build

     ```javascript
     // Generate new scene
     POST /api/generate-scene
     Body: {
       sceneName: "QuizIntroScene",
       canvasSize: { width: 1080, height: 1920 },
       states: [
         {
           name: "TITLE_SPLASH",
           duration: 2.0,
           clearLayers: false,
           layers: {
             BG_FAR: [{
               type: "sprite",
               assetId: "bg_logo",
               assetPath: "/assets/images/bg_logo.png",
               x: 0, y: 0, width: 1080, height: 1920,
               animation: { type: "fadeIn", duration: 1.0 }
             }]
           }
         }
       ]
     }
     Response: {
       success: true,
       filePath: "/Engine/src/js/scenes/QuizIntroScene.js",
       code: "import { Scene } from './Scene.js';..."
     }
     
     // Upload and copy asset
     POST /api/copy-asset
     Body: FormData with file
     Response: {
       success: true,
       assetId: "bg_logo",
       assetPath: "/assets/images/bg_logo.png",
       fileSize: 512000
     }
     
     // List available assets
     GET /api/assets
     Response: {
       images: [
         { id: "bg_logo", path: "/assets/images/bg_logo.png", size: 512000 },
         { id: "player", path: "/assets/images/player.png", size: 256000 }
       ],
       audio: [
         { id: "click", path: "/assets/music/click.mp3", size: 50000 }
       ]
     }
     
     // List existing scenes
     GET /api/scenes
     Response: {
       scenes: ["TitleScene", "GameScene", "BossScene"]
     }
     
     // Load existing scene (Phase 2 feature)
     POST /api/load-scene
     Body: { sceneName: "QuizIntroScene" }
     Response: {
       success: true,
       sceneName: "QuizIntroScene",
       states: [...parsed states if possible...],
       assets: [...detected assets...]
     }
     ```

     ------

     ## 🤖 Claude API Integration

     ### Prompt Building Strategy

     The backend must build a detailed prompt for Claude that includes:

     1. **Full Canvas Engine docs** (`llms.txt`)
     2. **Relevant sections** from `ASSET_PIPELINE_AND_PERFORMANCE.md`
     3. **Timeline data** converted to human-readable format
     4. **Clear requirements** for code generation

     ### Prompt Template

     ```
     I need a Scene class for my Canvas Engine game with these specifications:
     
     [PASTE FULL CONTENTS OF Engine/llms.txt HERE]
     
     [PASTE RELEVANT SECTIONS FROM ASSET_PIPELINE_AND_PERFORMANCE.md]
     Specifically include:
     - Delta-Time patterns
     - State machine patterns
     - Scene lifecycle (init, enter, exit, populateLayers, update)
     - Layer management
     - Asset loading/unloading
     
     Scene Requirements:
     
     Scene Name: {sceneName}
     Canvas Resolution: {width}x{height}
     Engine Classes Available: Engine, Scene, Sprite, Button, AnimatedSprite
     
     Timeline States:
     {for each state}
     {stateNumber}. State "{stateName}" ({startTime}s to {endTime}s)
        Duration: {duration} seconds
        Clear layers on enter: {clearLayers ? "Yes" : "No"}
        
        Layer Assignments:
        {for each layer with entities}
        - {layerName}:
          {for each entity in layer}
          • {entityType}: asset "{assetId}" from {assetPath}
            Position: ({x}, {y})
            Size: {width}x{height}
            {if sprite}Rotation: {rotation}, Alpha: {alpha}, Scale: ({scaleX}, {scaleY}){/if}
            {if button}Text: "{text}", Color: {color}, onClick: {onClick.action} {onClick.target}{/if}
            {if animation}Animation: {animation.type} over {animation.duration} seconds{/if}
        
        State Transition:
        Trigger: {transitionTrigger (timer/button/input)}
        {if timer}After {duration} seconds → {nextState or nextScene}{/if}
        {if button}On button "{buttonText}" click → {nextState or nextScene}{/if}
     
     Critical Requirements:
     1. Use deltaTime (dt) for ALL timing - dt is in SECONDS
     2. Implement proper state machine with enum
     3. Handle layer clearing with layerManager.clearAll() when clearLayers=true
     4. Load all assets in init() method using engine.assetLoader.loadImages([...])
     5. Use populateLayers() ONLY for setting up initial state
     6. Implement state transitions in update(dt) method
     7. Clean up assets in exit() method with engine.assetLoader.unloadAssets([...])
     8. Follow all performance guardrails from ASSET_PIPELINE docs
     9. Use ES6 import syntax
     10. Export scene class as default
     
     Generate the complete {sceneName}.js file following Canvas Engine patterns exactly.
     Do not include any markdown formatting or code fences - output pure JavaScript only.
     ```

     ### Claude API Call

     ```javascript
     // server/claude-api.js
     
     const Anthropic = require('@anthropic-ai/sdk');
     const fs = require('fs').promises;
     const path = require('path');
     
     const anthropic = new Anthropic({
       apiKey: process.env.ANTHROPIC_API_KEY
     });
     
     async function generateScene(timelineData, enginePath) {
       // Read engine docs
       const llmsTxt = await fs.readFile(
         path.join(enginePath, 'llms.txt'),
         'utf8'
       );
       const assetPipelineMd = await fs.readFile(
         path.join(enginePath, 'docs/ASSET_PIPELINE_AND_PERFORMANCE.md'),
         'utf8'
       );
       
       // Build prompt
       const prompt = buildPrompt(timelineData, llmsTxt, assetPipelineMd);
       
       // Call Claude API
       const response = await anthropic.messages.create({
         model: 'claude-sonnet-4-20250514',
         max_tokens: 4000,
         messages: [{
           role: 'user',
           content: prompt
         }]
       });
       
       // Extract generated code
       const sceneCode = response.content[0].text;
       
       return sceneCode;
     }
     
     function buildPrompt(timelineData, llmsTxt, assetPipelineMd) {
       // Convert timeline JSON to human-readable format
       let prompt = `I need a Scene class for my Canvas Engine game with these specifications:\n\n`;
       
       // Include engine docs
       prompt += `${llmsTxt}\n\n`;
       prompt += `Performance Guidelines:\n${assetPipelineMd}\n\n`;
       
       // Add scene requirements
       prompt += `Scene Name: ${timelineData.sceneName}\n`;
       prompt += `Canvas: ${timelineData.canvasSize.width}x${timelineData.canvasSize.height}\n\n`;
       
       prompt += `Timeline States:\n`;
       
       let currentTime = 0;
       timelineData.states.forEach((state, index) => {
         const endTime = currentTime + state.duration;
         prompt += `${index + 1}. State "${state.name}" (${currentTime.toFixed(1)}s to ${endTime.toFixed(1)}s)\n`;
         prompt += `   Duration: ${state.duration} seconds\n`;
         prompt += `   Clear layers: ${state.clearLayers ? 'Yes' : 'No'}\n`;
         
         if (Object.keys(state.layers).length > 0) {
           prompt += `   Layer Assignments:\n`;
           for (const [layerName, entities] of Object.entries(state.layers)) {
             if (entities.length > 0) {
               prompt += `   - ${layerName}:\n`;
               entities.forEach(entity => {
                 if (entity.type === 'sprite') {
                   prompt += `     • Sprite: asset "${entity.assetId}" from ${entity.assetPath}\n`;
                   prompt += `       Position: (${entity.x}, ${entity.y}), Size: ${entity.width}x${entity.height}\n`;
                   if (entity.animation) {
                     prompt += `       Animation: ${entity.animation.type} over ${entity.animation.duration}s\n`;
                   }
                 } else if (entity.type === 'button') {
                   prompt += `     • Button: "${entity.text}" at (${entity.x}, ${entity.y})\n`;
                   prompt += `       Size: ${entity.width}x${entity.height}, Color: ${entity.color}\n`;
                   prompt += `       onClick: ${entity.onClick.action} → ${entity.onClick.target}\n`;
                 }
               });
             }
           }
         }
         
         prompt += `\n`;
         currentTime = endTime;
       });
       
       prompt += `\nGenerate the complete ${timelineData.sceneName}.js file.\n`;
       prompt += `Output pure JavaScript only - no markdown formatting or code fences.`;
       
       return prompt;
     }
     
     module.exports = { generateScene };
     ```

     ------

## 📁 Project Structure

    ```
    /SceneEditor/                      # Development tools (build here)
    ├── server/
    │   ├── server.js                  # Express server (main entry point)
    │   ├── claude-api.js              # Claude API integration
    │   ├── file-manager.js            # Read/write scene files
    │   └── asset-manager.js           # Copy assets to engine project
    ├── public/
    │   ├── debug.html                 # Screen 1: Debug panel
    │   ├── debug.js                   # Debug panel JavaScript
    │   ├── editor.html                # Screen 2: Scene editor
    │   ├── editor.js                  # Scene editor JavaScript
    │   ├── timeline.js                # Timeline UI component
    │   └── styles.css                 # Shared styles
    ├── config.json                    # Configuration
    ├── .env                           # Environment variables (API key)
    ├── .gitignore                     # Ignore .env, node_modules
    ├── package.json                   # Dependencies
    └── README.md                      # Setup instructions
    
    /Engine/                           # Game engine (moved from root)
    ├── src/js/
    │   ├── public/
    │   │   ├── scenes/                # Exported game scenes written here ⬅️
    │   ├── core/                      # Engine classes (don't modify)
    │   └── entities/                  # Sprite, Button (don't modify)
    ├── assets/
    │   ├── images/                    # Uploaded images copied here ⬅️
    │   └── music/                     # Uploaded audio copied here ⬅️
    ├── llms.txt                       # Engine docs (read by Scene Editor)
    └── docs/
        └── ASSET_PIPELINE_AND_PERFORMANCE.md
    ```

### config.json Format

    ```json
    {
      "enginePath": "../Engine",
      "scenesPath": "../Engine/src/js/scenes",
      "assetsPath": "../Engine/assets",
      "port": 3000
    }
    ```

     ### package.json Dependencies

     ```json
     {
       "name": "scene-editor-dev-tools",
       "version": "1.0.0",
       "main": "server/server.js",
       "scripts": {
         "start": "node server/server.js",
         "dev": "nodemon server/server.js"
       },
       "dependencies": {
         "@anthropic-ai/sdk": "^0.30.0",
         "express": "^4.18.2",
         "multer": "^1.4.5-lts.1",
         "dotenv": "^16.4.5"
       },
       "devDependencies": {
         "nodemon": "^3.0.2"
       }
     }
     ```

     ### .env Format

     ```
     ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
     ```

     ------

     ## 🚀 Development Phases

     ### Phase 1: Backend + Simple Editor (Week 1) 🎯 START HERE

     **Goal:** Generate a basic scene from simple JSON input.

     **Tasks:**

     1. ✅ Set up Express server
        - Install dependencies
        - Create `server/server.js`
        - Serve static files from `public/`
        - Set up routes for `/debug` and `/editor`
     2. ✅ Claude API integration
        - Install `@anthropic-ai/sdk`
        - Create `server/claude-api.js`
        - Implement `generateScene()` function
        - Test with simple timeline JSON
     3. ✅ File writing
        - Create `server/file-manager.js`
        - Implement `writeSceneFile()` function
        - Write to `../Engine/src/js/scenes/`
        - Handle errors (file exists, permissions)
     4. ✅ Simple editor UI
        - Create `public/editor.html`
        - Single `<textarea>` for JSON input
        - "Generate Scene" button
        - Success/error message display
        - Test with example JSON
     5. ✅ Test end-to-end
        - Enter timeline JSON
        - Click generate
        - Verify file created
        - Open Debug Panel
        - Load generated scene
        - Verify it runs

     **Success Criteria:**

     - Can generate a scene with 1-2 states from JSON input
     - Generated scene file appears in Engine project
     - Scene runs in Debug Panel without errors

     ------

     ### Phase 2: Timeline UI (Week 2)

     **Goal:** Replace JSON textarea with visual timeline editor.

     **Tasks:**

     1. ✅ Timeline component
        - Create `public/timeline.js`
        - Draw timeline canvas with time markers
        - Render state bars (colored rectangles)
        - Click to select state
     2. ✅ Add/Delete states
        - "+ Add State" button
        - Creates new state with default duration (2s)
        - "Delete State" button on selected state
        - Prevents deleting if only one state
     3. ✅ Resize states
        - Drag handles on state bar edges
        - Update duration as user drags
        - Snap to 0.1s increments
        - Visual feedback during drag
     4. ✅ State editor panel
        - Name input (text field)
        - Duration slider (0.1s to 30s)
        - "Clear layers" checkbox
        - Update state data in real-time
     5. ✅ Convert timeline to JSON
        - On "Generate Scene" click
        - Convert visual timeline to JSON format
        - Send to backend API

     **Success Criteria:**

     - Can create 3+ states visually
     - Can resize state durations by dragging
     - Can rename states
     - Generated scenes use correct timing

     ------

     ### Phase 3: Asset Management (Week 2-3)

     **Goal:** Upload assets and assign them to layers.

     **Tasks:**

     1. ✅ File upload
        - Create `POST /api/copy-asset` endpoint
        - Use `multer` for file uploads
        - Copy files to Engine assets folder
        - Return asset ID and path
     2. ✅ Asset list UI
        - Show uploaded images and audio
        - Display thumbnails for images
        - Show file size
        - "Delete" button per asset
     3. ✅ Layer assignment dropdowns
        - 7 dropdowns (one per layer)
        - Populate with available assets
        - Filter by asset type (images for most layers, text for TEXT layer)
     4. ✅ Property editor
        - Show property inputs when asset selected
        - Sprite properties: x, y, width, height, rotation, alpha
        - Button properties: text, color, onClick
        - Update state data on change
     5. ✅ Animation options
        - Animation type dropdown (None, Fade In, Fade Out, Slide In)
        - Animation duration input
        - Include in generated scene code

     **Success Criteria:**

     - Can upload image and audio files
     - Files copied to Engine/assets folder
     - Can assign assets to layers for each state
     - Generated scenes load correct assets

     ------

     ### Phase 4: Polish & Advanced Features (Week 3)

     **Goal:** Production-ready tool with nice UX.

     **Tasks:**

     1. ✅ Error handling
        - Validation before generating
        - Clear error messages
        - Handle API failures gracefully
     2. ✅ Loading states
        - Show spinner during generation
        - Disable buttons during API call
        - Estimated time remaining
     3. ✅ Scene loading (optional)
        - Parse existing scene files
        - Populate timeline from parsed data
        - Allow editing existing scenes
     4. ✅ Keyboard shortcuts
        - Ctrl+S: Generate scene
        - Ctrl+N: New scene
        - Delete: Delete selected state
     5. ✅ Visual improvements
        - Better color scheme
        - Hover effects
        - Smooth animations
        - Responsive layout

     **Success Criteria:**

     - Professional-looking interface
     - Intuitive to use without documentation
     - Handles errors gracefully
     - Fast and responsive

     ------

     ## 🎯 Starting Point for Cursor + Opus 4.5

     ### What to Build First

     Start with **Phase 1: Backend + Simple Editor**. Here's the exact order:

     1. **Set up project structure**

        ```bash
        mkdir scene-editor
        cd scene-editor
        npm init -y
        npm install express @anthropic-ai/sdk multer dotenv
        npm install --save-dev nodemon
        ```

     2. **Create config files**

        - Create `config.json` with your Engine path
        - Create `.env` with your Anthropic API key
        - Create `.gitignore` (ignore `.env` and `node_modules`)

     3. **Build Express server** (`server/server.js`)

        - Basic Express setup
        - Serve static files from `public/`
        - Routes for `/debug` and `/editor`
        - Route for `POST /api/generate-scene`

     4. **Build Claude API integration** (`server/claude-api.js`)

        - Read llms.txt and ASSET_PIPELINE_AND_PERFORMANCE.md
        - Build prompt from timeline JSON
        - Call Anthropic API
        - Return generated code

     5. **Build file manager** (`server/file-manager.js`)

        - Write scene file to disk
        - Check if file already exists
        - Handle file permissions errors

     6. **Create simple editor UI** (`public/editor.html`)

        - Single page with textarea for JSON
        - "Generate Scene" button
        - Success/error message display
        - Example JSON pre-filled

     7. **Test with example scene**

        - Use QuizIntroScene example
        - Verify file creation
        - Load in Debug Panel
        - Verify scene runs

     ### Example Starting JSON

     ```json
     {
       "sceneName": "TestScene",
       "canvasSize": { "width": 1080, "height": 1920 },
       "states": [
         {
           "name": "INTRO",
           "duration": 2.0,
           "clearLayers": false,
           "layers": {
             "TEXT": [
               {
                 "type": "text",
                 "content": "Test Scene",
                 "x": 540,
                 "y": 960,
                 "font": "48px Arial",
                 "color": "#ffffff"
               }
             ]
           }
         }
       ]
     }
     ```

     ------

     ## 📝 Important Notes & Constraints

     ### What I Know

     - JavaScript basics (variables, functions, classes, async/await)
     - Node.js and Express fundamentals
     - HTML, CSS, DOM manipulation
     - Canvas API basics

     ### What I Don't Know

     - **React** (need vanilla JS solutions)
     - Advanced AST parsing (that's why we're using Claude API)
     - Complex state management libraries

     ### Technical Constraints

     - Must work locally (no deployment needed)
     - Vanilla JavaScript only (no frameworks)
     - Files written to disk (not in-memory)
     - Desktop-only tool (1920x1080 landscape)
     - Game preview is 480x720 (half of 1080x1920)

     ### Critical Requirements

     - Generated scenes must follow Canvas Engine patterns exactly
     - All timing must use deltaTime (seconds)
     - Assets must follow PO2 rules (Power of Two dimensions)
     - Proper memory cleanup (unload assets in exit())
     - ES6 import syntax
     - Scene exported as default class

     ------

     ## 🤔 Questions for Cursor/Opus 4.5

     When starting the project, please answer:

     1. Should I build the Express backend first or the simple HTML editor first?
     2. What's the absolute simplest timeline UI I can start with (even if ugly)?
     3. How should I structure the Claude API prompt for best code generation results?
     4. Should I include the entire llms.txt (very long) in every API call, or just relevant sections?
     5. How do I test the backend without building the full frontend first?
     6. What's the best way to handle file paths across Windows/Mac/Linux?
     7. Should I use a database or just read/write JSON files for editor state?

     ------

     ## 📎 Files to Attach

     **When starting the chat with Cursor + Opus 4.5, attach these files:**

     1. `scene-editor-llms.txt` (this artifact)
     2. `PROJECT_HANDOFF.md` (this artifact)
3. `Engine/llms.txt` (game engine documentation)
    4. `Engine/docs/ASSET_PIPELINE_AND_PERFORMANCE.md` (performance specs)

     ------

     ## 🎬 Opening Prompt for Cursor/Opus 4.5

     ```
     I need to build a scene editor for my Canvas Engine game using Claude API.
     
     I've attached:
     1. scene-editor-llms.txt - Complete specs for the scene editor tool
     2. PROJECT_HANDOFF.md - Detailed project requirements and phases
     3. llms.txt - My game engine documentation
     4. ASSET_PIPELINE_AND_PERFORMANCE.md - Engine performance specs
     
     Please read all documents carefully, then:
     
     1. Confirm you understand the overall architecture (two screens, Claude API integration)
     2. Answer the "Questions for Cursor/Opus 4.5" in PROJECT_HANDOFF.md
     3. Create the Phase 1 implementation:
        - Express server setup
        - Claude API integration
        - File writing functionality
        - Simple HTML editor with JSON textarea
        - Test scene generation
     
     Start with the absolute simplest working version - we'll add the visual timeline later.
     
     My setup:
     - Node.js installed ✅
     - Claude API key ready ✅
     - Comfortable with JavaScript, Express basics ✅
     - Don't know React (need vanilla JS) ❌
     - Canvas Engine project path: [I'll provide this]
     
     Let's start with Phase 1: Backend + Simple Editor.
     ```

     ------

     ## ✅ Success Metrics

     **Phase 1 Complete When:**

     - Can paste JSON into textarea
     - Click "Generate Scene" button
     - Scene file appears in Engine/src/js/scenes/
     - Scene loads and runs in Debug Panel
     - Generated code follows all Canvas Engine patterns

     **Phase 2 Complete When:**

     - Can visually create timeline with 3+ states
     - Can drag to resize state durations
     - Can rename states
     - Timeline converts to correct JSON format

     **Phase 3 Complete When:**

     - Can upload images and audio files
     - Files copied to correct Engine/assets folders
     - Can assign assets to layers per state
     - Generated scenes load and display assets correctly

     **Phase 4 Complete When:**

     - Professional UI that's easy to use
     - All errors handled gracefully
     - Fast and responsive
     - Ready for daily use in game development

     ------

     ## 🎉 End Goal

     A production-ready development environment where I can:

     1. **Create scenes visually** in minutes instead of hours
     2. **Test immediately** in the Debug Panel
     3. **Iterate quickly** with Claude API generating code
     4. **Debug easily** with live entity inspection
     5. **Build games faster** by focusing on design, not boilerplate

     **Estimated Time Investment:**

     - Phase 1: 1-2 days
     - Phase 2: 2-3 days
     - Phase 3: 2-3 days
     - Phase 4: 1-2 days
     - **Total: 1-2 weeks** vs. **4-6 weeks** for traditional backend

     **Cost:**

     - Claude API: ~$0.03 per scene generation
     - For 100 scenes: $3
     - For 1000 scenes: $30
     - **Negligible for local development**

     ------

     *Ready to start building! 🚀*