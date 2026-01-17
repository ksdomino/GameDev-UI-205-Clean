# 🎮 GameDev UI
## ELI10 Guide (Explain Like I'm 10)

> **What is this?** A tool that lets you build mobile games by clicking and dragging, without writing code!

---

## 🤔 The Problem

Making mobile games is **hard and slow**:
- Write thousands of lines of code 😫
- Easy to make mistakes 🐛
- Changes take forever ⏰

---

## ✨ The Solution: GameDev UI

### 5 Cool Screens to Build Games! 🚀

---

### 📁 Screen 1: Project Manager
> "Your game collection"

- See all your games in one place
- Create new games with one click
- Games auto-save to your computer!

---

### 🏠 Screen 2: Dashboard
> "Your game's home page"

What you see:
- Your game's name (click to rename!)
- Cards for each scene (TitleScene, GameScene, etc.)
- Stats: how many scenes, states, entities

What you can do:
- **🗺️ Flow Map** - See how scenes connect
- **🐛 Debug** - Test your game live
- **📤 Export** - Save game to Engine folder

---

### 🗺️ Screen 3: Scene Flow Map
> "Your game's map"

```
  ┌──────────┐       ┌──────────┐       ┌──────────┐
  │  Title   │ ───→  │   Game   │ ───→  │ Game Over│
  │  Scene   │       │  Scene   │       │  Scene   │
  └──────────┘       └──────────┘       └──────────┘
      ⭐ START
```

- Drag boxes around
- Shift+drag to connect scenes
- Double-click to edit a scene

---

### 🎬 Screen 4: Scene Editor
> "Build what happens in each scene"

**4 columns:**

| Entities | Preview | Layers | Properties |
|----------|---------|--------|------------|
| 🖼️ Sprite | See your scene! | Drop here! | Edit selected |
| 🔘 Button | | BG_FAR | x, y, color |
| 📝 Text | | SPRITES | animation |
| ⬡ Shape | | UI_BUTTONS | onClick |

**How to add stuff:**
1. Drag "Button" from left
2. Drop on "UI_BUTTONS" layer
3. Edit properties on right
4. See it in preview!

**Cool tools at top:**
- **🌳 Logic** - Make game decisions (if score > 10, then...)
- **📈 Curves** - Custom animations
- **✨ AI Generate** - Tell AI what you want!
- **🐛 Test** - Play your game!

---

### 🐛 Screen 5: Debug Panel
> "Test your game for real!"

```
┌─────────────────────────────────────────────┐
│  📊 Stats         │                         │
│  FPS: 60          │     ┌──────────────┐    │
│  Entities: 12     │     │              │    │
│                   │     │  Your game   │    │
│  📋 Console       │     │  plays here! │    │
│  Scene loaded ✓   │     │              │    │
│  State: MAIN      │     └──────────────┘    │
│                   │                         │
│  [▶️ Run] [⏹️ Stop]│    [STATE_1] [STATE_2]  │
└─────────────────────────────────────────────┘
```

- Click **Run** to start your game
- Click **Stop** to pause
- Click state buttons to jump around
- Watch the console for messages

---

## 🤖 AI Magic!

Click **✨ AI Generate** and tell it what you want:

> "Make a title screen with 'PONGO' at the top, a blue PLAY button in the middle, and SETTINGS button below"

The AI creates it for you! 🪄

---

## 🏃 How to Start

### First Time:
```bash
# 1. Go to SceneEditor folder
cd SceneEditor

# 2. Install stuff (one time)
npm install

# 3. Start the backend
npm run server

# 4. In another terminal, start the UI
npm run dev

# 5. Also start the Engine (third terminal)
cd Engine
npm run dev
```

### Every Other Time:
```bash
# Terminal 1:
cd SceneEditor && npm run server

# Terminal 2:
cd SceneEditor && npm run dev

# Terminal 3:
cd Engine && npm run dev
```

Then open: **http://localhost:5175** 🎉

---

## 📁 Where Stuff Lives

```
Game Dev UI/
├── SceneEditor/           ← The tool you use
│   ├── projects/          ← Your saved games!
│   └── src/               ← Tool code
│
└── Engine/                ← The game runner
    └── scenes/            ← Exported game scenes
```

---

## 🎮 Make Your First Game!

1. **Open** http://localhost:5175
2. **Click** "New Project"
3. **Name it** "My First Game"
4. **Click** the TitleScene card
5. **Drag** a Text to the TEXT layer
6. **Type** "Hello World!" in properties
7. **Click** 🐛 Test
8. **Click** ▶️ Run

You just made a game! 🎉

---

## 🔥 Pro Tips

| Want to... | Do this... |
|------------|------------|
| Add a button | Drag Button → UI_BUTTONS layer |
| Make something fade in | Set Animation → fadeIn |
| Go to next scene | Button onClick → switchScene |
| Test quickly | Click 🐛 then ▶️ Run |
| Use AI | Click ✨ AI Generate |
| See scene connections | Click 🗺️ Flow Map |
| Edit in VS Code | Edit files in projects/ folder |

---

## 🆘 Help!

**Debug Panel shows "Engine Not Responding"?**
→ Make sure Engine is running: `cd Engine && npm run dev`

**Changes not saving?**
→ Check the green dot in top-right (✓ = saved)

**AI not working?**
→ Paste your Claude API key in the modal

---

## 🎯 Summary

| Old Way | New Way with GameDev UI |
|---------|------------------------|
| Write code for hours | Click and drag |
| Debug by reading code | See live preview |
| Guess what it looks like | Visual editor |
| Code scene transitions | Draw connections |
| Manual testing | One-click testing |

**Build games faster. Have more fun!** 🚀

---

*Questions? The AI in ✨ AI Generate can help you build anything!*
