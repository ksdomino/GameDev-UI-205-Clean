# TODO.md

## Next Task
- [ ] **Build Variable Editor UI** - GameDev UI reads .variables.json and renders sliders/toggles/color pickers

## VibeCoder Architecture (Priority Order)
1. [x] VibeCoder output format in llms.txt ✅
2. [ ] Variables manifest system (UI reads/edits variables.json)
3. [ ] Actor modularity (standard interface: init, update, render, getVariables)
4. [ ] Logic nodes → variables bridge
5. [ ] Build optimization (bake JSON → JS)

## Backlog
- [ ] State template library (countdown, pause, gameover)
- [ ] Actor registry manifest
- [ ] Profiling workflow (FPS, bundle size)

## Completed (2026-01-18)
- [x] VibeCoder output format with min/max/step
- [x] Delete levels/scenes with custom modals
- [x] Undo capability (toast + Ctrl+Z)
- [x] Level Node Editor improvements
