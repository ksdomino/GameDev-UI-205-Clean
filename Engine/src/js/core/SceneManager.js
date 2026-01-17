/**
 * SceneManager - Manages game scenes and holds the currentScene
 */
export class SceneManager {
  constructor(engine) {
    this.engine = engine;
    this.currentScene = null;
    this.scenes = new Map(); // Scene registry for name-based switching
  }

  /**
   * Register a scene by name
   * @param {string} name - Scene name identifier
   * @param {Scene} scene - Scene instance
   */
  register(name, scene) {
    this.scenes.set(name, scene);
  }

  /**
   * Switch to a scene by name
   * @param {string} sceneName - Name of the scene to switch to
   */
  async switchTo(sceneName) {
    const scene = this.scenes.get(sceneName);
    if (!scene) {
      console.warn(`Scene not found: ${sceneName}`);
      return;
    }
    await this.changeScene(scene);
  }

  /**
   * Change to a new scene
   * Clears the LayerManager and populates it with the new scene's entities
   * @param {Scene} newScene - Scene instance to switch to
   */
  async changeScene(newScene) {
    console.log(`[SceneManager] Switching to scene: ${newScene.name}`);

    // Exit current scene if it exists
    if (this.currentScene && typeof this.currentScene.exit === 'function') {
      this.currentScene.exit();
    }

    // Set engine reference on new scene
    if (newScene) {
      newScene.setEngine(this.engine);
    }

    // Clear LayerManager
    this.engine.layerManager.clearAll();

    // Enter new scene (await async init)
    if (newScene && typeof newScene.enter === 'function') {
      await newScene.enter();
    }

    // Set new scene
    this.currentScene = newScene;

    // Populate LayerManager with new scene's entities
    if (newScene && typeof newScene.populateLayers === 'function') {
      newScene.populateLayers();
    }

    console.log(`[SceneManager] Scene "${newScene.name}" is now active and populated`);
  }

  /**
   * Get current scene
   * @returns {Scene|null}
   */
  getCurrentScene() {
    return this.currentScene;
  }

  /**
   * Update current scene
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    if (this.currentScene && typeof this.currentScene.update === 'function') {
      this.currentScene.update(deltaTime);
    }
  }
}
