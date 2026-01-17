# TODO.md

## Next Task
- [ ] **Test Pong in browser** - Run `cd Engine && npm run dev` and open http://localhost:5174

## Backlog
- [ ] Add difficulty settings (Easy/Medium/Hard via AI paddle speed)
- [ ] Add pause functionality
- [ ] Add high score persistence via SaveManager
- [ ] Replace playBeep() with actual sound files

## Completed (2026-01-17)
- [x] Pong data files (manifest, design, actors, logic, scenes, states, assets)
- [x] SceneEditor/projects/pong.json with full project structure
- [x] PongScene.js - complete gameplay (ball, paddles, collision, scoring)
- [x] PongTitleScene.js - title screen with Play button
- [x] main.js updated to load custom scenes via game-manifest.json
- [x] game-manifest.json created with useCustomScenes flag
- [x] Debug Panel game preview fix
- [x] Levels System implementation
- [x] Scene naming convention (Title_Scene_1, L1_Scene_1)
- [x] Engine llms.txt audit for vibecoding
