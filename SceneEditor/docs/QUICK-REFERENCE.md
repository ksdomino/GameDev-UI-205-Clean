# 📋 GameDev UI Quick Reference

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Shift + Drag` | Create connection (Flow Map) |
| `Double-click` | Edit scene (Flow Map) |
| `Escape` | Close modal |
| `Enter` | Confirm input |

## Views

| View | Access | Purpose |
|------|--------|---------|
| Project Manager | Start screen | List/create games |
| Dashboard | After opening project | Project overview |
| Scene Flow Map | Dashboard → 🗺️ Flow Map | Scene connections |
| Scene Editor | Dashboard → Click scene | Edit scene content |
| Debug Panel | Editor → 🐛 Test | Live testing |

## Entity Types

| Type | Icon | Layers | Properties |
|------|------|--------|------------|
| Sprite | 🖼️ | Any | x, y, width, height, rotation, alpha, scale, assetId |
| Button | 🔘 | UI_BUTTONS | x, y, width, height, text, color, onClick |
| Text | 📝 | TEXT | x, y, content, font, color, textAlign |
| Shape | ⬡ | SHAPES | x, y, width, height, shape, color, fill |

## Layers (Bottom → Top)

| # | Name | Use For |
|---|------|---------|
| 0 | BG_FAR | Sky, distant backgrounds |
| 1 | BG_NEAR | Hills, near backgrounds |
| 2 | VIDEO_IMAGE | Full-screen images/video |
| 3 | SHAPES | Rectangles, circles, particles |
| 4 | SPRITES | Characters, items, obstacles |
| 5 | TEXT | Labels, scores, messages |
| 6 | UI_BUTTONS | Touch buttons (always on top) |

## Animation Types

| Type | Effect |
|------|--------|
| `fadeIn` | Opacity 0 → 1 |
| `fadeOut` | Opacity 1 → 0 |
| `slideIn` | Slide from direction |
| `slideOut` | Slide to direction |
| `scale` | Scale from 0 → 1 |
| `pulse` | Gentle size oscillation |

## Transition Types

| Type | Trigger |
|------|---------|
| `none` | Manual only |
| `timer` | After duration |
| `button` | On button click |
| `condition` | Custom logic |

## Button Actions

| Action | Target |
|--------|--------|
| `switchScene` | Scene name |
| `switchState` | State name |
| `playSound` | Sound ID |

## API Endpoints

```
GET  /api/health           - Server status
GET  /api/projects         - List projects
GET  /api/projects/:file   - Load project
POST /api/projects         - Save project
POST /api/export-game      - Export to Engine
```

## File Locations

| What | Where |
|------|-------|
| Projects | `SceneEditor/projects/*.json` |
| Exported Scenes | `Engine/public/scenes/*.json` |
| Assets | `Engine/public/assets/` |

## Ports

| Service | Port |
|---------|------|
| GameDev UI (React) | 5175 |
| Backend API | 5176 |
| Engine | 5174 |

## Common Patterns

### Add Entity to Scene
1. Open Scene Editor
2. Drag entity type from left panel
3. Drop on target layer in middle
4. Edit properties on right

### Create State Transition
1. Select state in State Flow
2. Set transition type (timer/button)
3. Set target (nextState/nextScene)
4. Set duration if timer

### Connect Scenes in Flow Map
1. Open Flow Map
2. Hold Shift
3. Drag from source scene
4. Drop on target scene

### Test Your Game
1. In Scene Editor, click 🐛 Test
2. Click ▶️ Run
3. Click state buttons to navigate
4. Check console for logs

### Use AI Generation
1. Click ✨ AI Generate
2. Paste Claude API key (first time)
3. Select mode (Entities/State/Scene)
4. Describe what you want
5. Click Generate
6. Review JSON
7. Click Apply

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Server Offline" | Run `npm run server` in SceneEditor |
| Engine not responding | Run `npm run dev` in Engine folder |
| Changes not saving | Check green checkmark in top-right |
| AI not working | Check API key in modal |
| Entities not showing | Check layer visibility in Debug |

## State Naming Convention

```
INTRO           - Opening animation
MAIN            - Primary state
WAITING         - Waiting for input
PLAYING         - Active gameplay
PAUSED          - Game paused
GAME_OVER       - End state
COUNTDOWN       - Timer display
TRANSITION      - Between states
```

## Scene Naming Convention

```
TitleScene      - Main menu
GameScene       - Gameplay
GameOverScene   - End screen
SettingsScene   - Options
TutorialScene   - Instructions
LevelSelectScene - Choose level
```
