import { Engine } from './core/Engine.js';
import { BootScene } from './scenes/BootScene.js';
import { ConfigurableScene } from './scenes/ConfigurableScene.js';
import { LogicExtractor } from './core/LogicExtractor.js';
import { NodeExecutor } from './core/NodeExecutor.js';

// Global instances for logic system
let logicExtractor = null;
let nodeExecutor = null;
let extractedActors = [];

/**
 * Main entry point - boots the Engine
 * 
 * Supports multiple modes:
 * 1. Default: Loads BootScene
 * 2. JSON mode: Load ?scene=SceneName.json to test JSON configs
 * 3. Embedded mode: Receives scene config via postMessage from GameDev UI
 */

// Get canvas element
const canvas = document.getElementById('gameCanvas');

if (!canvas) {
  console.error('Canvas element not found!');
} else {
  // Create engine
  const engine = new Engine(canvas, 1080, 1920);

  // Check for embedded mode (from iframe)
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbedded = urlParams.get('embedded') === 'true';
  const sceneParam = urlParams.get('scene');

  if (isEmbedded) {
    // Embedded mode: wait for postMessage commands
    console.log('Engine started in embedded mode - waiting for commands');
    setupPostMessageHandler(engine);

    // Show a "waiting" screen so user knows iframe is working
    showWaitingScreen(engine);

    // Notify parent that engine is ready
    notifyParent({ type: 'ENGINE_READY', data: { width: 1080, height: 1920 } });

  } else if (sceneParam) {
    // Load JSON scene from file
    loadJSONScene(engine, sceneParam);
  } else {
    // Try to load game from manifest first, fall back to BootScene
    tryLoadGameManifest(engine);
  }

  // Make engine globally available for debugging
  window.gameEngine = engine;

  // Expose helper to load JSON scenes from console
  window.loadScene = (jsonPath) => loadJSONScene(engine, jsonPath);
}

/**
 * Show a waiting screen in embedded mode
 */
function showWaitingScreen(engine) {
  const ctx = engine.ctx;
  const width = engine.width;
  const height = engine.height;

  // Dark background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  // Gradient overlay
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1e3a5f');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Center text
  ctx.fillStyle = '#64748b';
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🎮', width / 2, height / 2 - 40);

  ctx.font = '32px Arial';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Ready', width / 2, height / 2 + 30);

  ctx.font = '24px Arial';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Click Run to start', width / 2, height / 2 + 80);
}

/**
 * Setup postMessage handler for communication with GameDev UI
 */
function setupPostMessageHandler(engine) {
  window.addEventListener('message', async (event) => {
    const { type, data } = event.data || {};

    switch (type) {
      case 'LOAD_PROJECT_CONFIG':
        // Load ALL scenes from project config for proper scene transitions
        await loadProjectConfig(engine, data);
        break;

      case 'LOAD_LEVEL':
        // Load a specific level (subset of scenes)
        await loadLevel(engine, data);
        break;

      case 'SWITCH_LEVEL':
        // Switch to a different level during gameplay
        await switchLevel(engine, data);
        break;

      case 'LOAD_SCENE_CONFIG':
        // Load single scene from config object (legacy)
        await loadSceneFromConfig(engine, data);
        break;

      case 'START_ENGINE':
        if (!engine.isRunning) {
          engine.start();
          notifyParent({ type: 'ENGINE_STARTED' });
        }
        break;

      case 'STOP_ENGINE':
        engine.stop();
        notifyParent({ type: 'ENGINE_STOPPED' });
        break;

      case 'SWITCH_STATE':
        // Switch to a specific state in the current scene
        const currentScene = engine.sceneManager.currentScene;
        if (currentScene && currentScene._switchToState) {
          currentScene._switchToState(data.stateName);
          notifyParent({ type: 'STATE_CHANGED', data: { stateName: data.stateName } });
        }
        break;

      case 'GET_DEBUG_INFO':
        // Send debug info back to parent
        sendDebugInfo(engine);
        break;

      // ============ NODE LOGIC SYSTEM MESSAGES ============

      case 'GET_ACTORS':
        // Extract and return all actors from current scene
        handleGetActors(engine);
        break;

      case 'GET_LOGIC_SHEET':
        // Return full logic sheet for a specific actor
        handleGetLogicSheet(data.actorId);
        break;

      case 'SET_VARIABLE':
        // Update a variable value from UI
        handleSetVariable(data.actorId, data.variableId, data.value);
        break;

      case 'UPDATE_NODE':
        // Update a node's properties
        handleUpdateNode(data.actorId, data.nodeId, data.properties);
        break;

      case 'ADD_NODE':
        // Add a new node to an actor's logic sheet
        handleAddNode(data.actorId, data.node);
        break;

      case 'ADD_CONNECTION':
        // Add a connection between nodes
        handleAddConnection(data.actorId, data.connection);
        break;

      case 'REMOVE_NODE':
        // Remove a node from an actor's logic sheet
        handleRemoveNode(data.actorId, data.nodeId);
        break;

      case 'UPDATE_LOGIC':
        // Hot-reload: Replace entire logic sheet for an actor
        console.log('[HOT-RELOAD] Received UPDATE_LOGIC for:', data.actorId);
        if (nodeExecutor && data.logicSheet) {
          // Update the logic executor's cached logic sheet
          nodeExecutor.updateLogicSheet(data.actorId, data.logicSheet);
          notifyParent({ type: 'LOGIC_UPDATED', data: { actorId: data.actorId } });
        } else {
          console.warn('[HOT-RELOAD] NodeExecutor not available or missing logicSheet');
        }
        break;

      default:
        console.log('Unknown message type:', type);
    }
  });

  // Send debug info periodically when running
  setInterval(() => {
    if (engine.isRunning) {
      sendDebugInfo(engine);
    }
  }, 500);
}

/**
 * Send debug info to parent window
 */
function sendDebugInfo(engine) {
  const currentScene = engine.sceneManager.currentScene;
  const layers = engine.layerManager;

  // Count entities per layer
  const layerCounts = {};
  ['BG_FAR', 'BG_NEAR', 'VIDEO_IMAGE', 'SHAPES', 'SPRITES', 'TEXT', 'UI_BUTTONS'].forEach(name => {
    const layer = layers.getLayer(name);
    layerCounts[name] = layer ? layer.length : 0;
  });

  notifyParent({
    type: 'DEBUG_INFO',
    data: {
      isRunning: engine.isRunning,
      sceneName: currentScene?.name || 'None',
      stateName: currentScene?.getCurrentStateName?.() || 'N/A',
      fps: Math.round(1000 / 16.67), // Approximate
      layerCounts,
      totalEntities: Object.values(layerCounts).reduce((a, b) => a + b, 0)
    }
  });
}

/**
 * Notify parent window
 */
function notifyParent(message) {
  if (window.parent !== window) {
    window.parent.postMessage(message, '*');
  }
}

/**
 * Load a scene from a config object (from postMessage)
 */
async function loadSceneFromConfig(engine, config) {
  try {
    console.log('Loading scene from config:', config.sceneName);

    const scene = new ConfigurableScene();
    scene.loadFromConfig(config);

    engine.sceneManager.register(config.sceneName, scene);
    await engine.sceneManager.switchTo(config.sceneName);

    if (!engine.isRunning) {
      engine.start();
    }

    notifyParent({
      type: 'SCENE_LOADED',
      data: {
        sceneName: config.sceneName,
        states: config.states?.map(s => s.name) || []
      }
    });

    console.log(`Scene "${config.sceneName}" loaded from config`);
  } catch (error) {
    console.error('Failed to load scene config:', error);
    notifyParent({
      type: 'ERROR',
      data: { message: error.message }
    });
  }
}

/**
 * Load entire project config with ALL scenes (for embedded mode)
 * This allows proper scene transitions like TitleScene -> GameScene
 * @param {Engine} engine - Engine instance
 * @param {Object} projectConfig - Full project config with scenes array
 */
async function loadProjectConfig(engine, projectConfig) {
  try {
    const { scenes, startScene, canvasSize } = projectConfig;
    console.log(`Loading project with ${scenes.length} scenes, starting at: ${startScene}`);

    // Register ALL scenes first
    for (const sceneConfig of scenes) {
      // All scenes use ConfigurableScene (game-agnostic)
      const scene = new ConfigurableScene();
      scene.loadFromConfig({
        ...sceneConfig,
        canvasSize
      });
      engine.sceneManager.register(sceneConfig.sceneName, scene);
      console.log(`  Registered scene: ${sceneConfig.sceneName}`);
    }

    // Find and switch to start scene
    const startSceneName = startScene || scenes[0]?.sceneName;
    if (startSceneName) {
      await engine.sceneManager.switchTo(startSceneName);
    }

    if (!engine.isRunning) {
      engine.start();
    }

    notifyParent({
      type: 'PROJECT_LOADED',
      data: {
        sceneCount: scenes.length,
        startScene: startSceneName,
        scenes: scenes.map(s => s.sceneName)
      }
    });

    console.log(`Project loaded with ${scenes.length} scenes`);
  } catch (error) {
    console.error('Failed to load project config:', error);
    notifyParent({
      type: 'ERROR',
      data: { message: error.message }
    });
  }
}

/**
 * Load a specific level (for level-based gameplay)
 * @param {Engine} engine - Engine instance
 * @param {Object} levelConfig - Level config with scenes array and levelNumber
 */
async function loadLevel(engine, levelConfig) {
  try {
    const { levelNumber, levelName, scenes, canvasSize, startScene } = levelConfig;
    console.log(`Loading Level ${levelNumber}: ${levelName} (${scenes.length} scenes)`);

    // Store current level for progression
    engine.currentLevel = levelNumber;

    // Register all scenes for this level
    for (const sceneConfig of scenes) {
      const scene = new ConfigurableScene();
      scene.levelNumber = levelNumber; // Pass level for difficulty scaling
      scene.loadFromConfig({
        ...sceneConfig,
        canvasSize
      });
      engine.sceneManager.register(sceneConfig.sceneName, scene);
      console.log(`  Registered: ${sceneConfig.sceneName}`);
    }

    // Switch to start scene
    const startSceneName = startScene || scenes[0]?.sceneName;
    if (startSceneName) {
      await engine.sceneManager.switchTo(startSceneName);
    }

    if (!engine.isRunning) {
      engine.start();
    }

    notifyParent({
      type: 'LEVEL_LOADED',
      data: {
        levelNumber,
        levelName,
        sceneCount: scenes.length,
        startScene: startSceneName
      }
    });

    console.log(`Level ${levelNumber} loaded`);
  } catch (error) {
    console.error('Failed to load level:', error);
    notifyParent({
      type: 'ERROR',
      data: { message: error.message }
    });
  }
}

/**
 * Switch to a different level during gameplay
 * @param {Engine} engine - Engine instance
 * @param {Object} data - Level data with levelNumber
 */
async function switchLevel(engine, data) {
  try {
    const { levelNumber, levelName, scenes, canvasSize, startScene } = data;
    console.log(`Switching to Level ${levelNumber}: ${levelName}`);

    // Clear existing scenes
    engine.sceneManager.scenes.clear();
    engine.currentLevel = levelNumber;

    // Register scenes for new level
    for (const sceneConfig of scenes) {
      const scene = new ConfigurableScene();
      scene.levelNumber = levelNumber;
      scene.loadFromConfig({
        ...sceneConfig,
        canvasSize
      });
      engine.sceneManager.register(sceneConfig.sceneName, scene);
    }

    // Switch to start scene
    const startSceneName = startScene || scenes[0]?.sceneName;
    if (startSceneName) {
      await engine.sceneManager.switchTo(startSceneName);
    }

    notifyParent({
      type: 'LEVEL_CHANGED',
      data: {
        levelNumber,
        levelName,
        startScene: startSceneName
      }
    });

    console.log(`Switched to Level ${levelNumber}`);
  } catch (error) {
    console.error('Failed to switch level:', error);
    notifyParent({
      type: 'ERROR',
      data: { message: error.message }
    });
  }
}

/**
 * Load a scene from JSON file
 * @param {Engine} engine - Engine instance
 * @param {string} jsonPath - Path to JSON file (relative to /scenes/ or absolute)
 */
async function loadJSONScene(engine, jsonPath) {
  try {
    // Construct full path
    let fullPath = jsonPath;
    if (!jsonPath.startsWith('/') && !jsonPath.startsWith('http')) {
      if (jsonPath.includes('/')) {
        fullPath = jsonPath;
      } else {
        // PRIORITIZE Local Engine scenes over remote examples
        fullPath = `/scenes/${jsonPath}`;
      }
    }

    console.log(`Loading scene from: ${fullPath}`);

    // Fetch JSON
    let response = await fetch(fullPath);

    // Fallback: try SceneEditor examples folder if not found
    if (!response.ok && !jsonPath.startsWith('/') && !jsonPath.startsWith('http') && !jsonPath.includes('/')) {
      const examplePath = `../../SceneEditor/examples/${jsonPath}`;
      console.log(`File not found at ${fullPath}, trying example fallback: ${examplePath}`);
      response = await fetch(examplePath);
    }

    if (!response.ok) {
      throw new Error(`Failed to load ${jsonPath}: ${response.status}`);
    }

    const config = await response.json();
    console.log('Scene config loaded:', config.sceneName);

    // Create and configure scene
    const scene = new ConfigurableScene();
    scene.loadFromConfig(config);

    // Register and switch to scene
    engine.sceneManager.register(config.sceneName, scene);
    await engine.sceneManager.switchTo(config.sceneName);

    // Start engine if not already running
    if (!engine.isRunning) {
      engine.start();
    }

    console.log(`Scene "${config.sceneName}" loaded successfully`);
    console.log('States:', config.states.map(s => s.name).join(' → '));

    return scene;
  } catch (error) {
    console.error('Failed to load JSON scene:', error);

    // Fall back to boot scene
    const bootScene = new BootScene();
    await engine.sceneManager.changeScene(bootScene);
    engine.start();

    return null;
  }
}

/**
 * Try to load game from manifest, fall back to BootScene
 */
async function tryLoadGameManifest(engine) {
  try {
    console.log('Checking for game manifest...');

    // Try to fetch game manifest
    const response = await fetch('/scenes/game-manifest.json');

    if (response.ok) {
      const manifest = await response.json();
      console.log(`Found game: ${manifest.name}`);
      console.log(`Start scene: ${manifest.startScene}`);

      // Register all scenes from manifest
      for (const sceneName of manifest.scenes) {
        // If it's a JSON filename (e.g. TitleScene.json), strip .json
        const cleanName = sceneName.replace('.json', '');

        // Create configurable scene for all scenes
        const configScene = new ConfigurableScene(cleanName);

        // Load config
        try {
          const configResp = await fetch(`/scenes/${cleanName}.json`);
          if (configResp.ok) {
            const config = await configResp.json();
            configScene.loadFromConfig(config);

            engine.sceneManager.register(cleanName, configScene);
          }
        } catch (e) {
          console.warn(`Could not load config for scene ${cleanName}:`, e);
        }
      }
      // Start the specified start scene
      if (manifest.startScene) {
        console.log(`Switching to start scene: ${manifest.startScene}`);
        await engine.sceneManager.switchTo(manifest.startScene);
        engine.start();
        return;
      }
    }
  } catch (error) {
    console.log('No game manifest found, loading BootScene');
  }

  // Fall back to BootScene
  const bootScene = new BootScene();
  await engine.sceneManager.changeScene(bootScene);
  engine.start();

  console.log('Game Engine initialized');
  console.log('Internal resolution: 1080x1920');
  console.log('BootScene loaded - engine is alive');
}


/**
 * Helper to create scene from inline JSON (for console testing)
 * Usage: createScene({ sceneName: 'Test', states: [...] })
 */
window.createScene = (config) => {
  const engine = window.gameEngine;
  if (!engine) {
    console.error('Engine not initialized');
    return null;
  }

  const scene = new ConfigurableScene();
  scene.loadFromConfig(config);

  engine.sceneManager.register(config.sceneName, scene);
  engine.sceneManager.switchTo(config.sceneName);

  return scene;
};

// ============ NODE LOGIC SYSTEM HANDLERS ============

/**
 * Extract actors from current scene and send to GameDev UI
 */
function handleGetActors(engine) {
  const currentScene = engine.sceneManager.currentScene;

  if (!currentScene || !currentScene._config) {
    notifyParent({
      type: 'ACTORS_LIST',
      data: { actors: [], error: 'No configurable scene loaded' }
    });
    return;
  }

  // Initialize LogicExtractor if needed
  if (!logicExtractor) {
    logicExtractor = new LogicExtractor();
  }
  logicExtractor.reset();

  // Extract actors from scene config
  extractedActors = logicExtractor.extractActors(currentScene._config);

  // Initialize NodeExecutor if needed
  if (!nodeExecutor) {
    nodeExecutor = new NodeExecutor(engine);
  }

  // Register actors with executor
  for (const actor of extractedActors) {
    nodeExecutor.registerActor(actor);
  }

  // Send actor list to UI
  notifyParent({
    type: 'ACTORS_LIST',
    data: logicExtractor.exportActorsToJSON(extractedActors)
  });

  console.log(`[NodeLogic] Extracted ${extractedActors.length} actors from scene`);
}

/**
 * Get full logic sheet for a specific actor
 */
function handleGetLogicSheet(actorId) {
  const actor = extractedActors.find(a => a.id === actorId);

  if (!actor) {
    notifyParent({
      type: 'LOGIC_SHEET',
      data: { error: `Actor not found: ${actorId}` }
    });
    return;
  }

  notifyParent({
    type: 'LOGIC_SHEET',
    data: logicExtractor.exportLogicSheet(actor)
  });
}

/**
 * Update a variable value from GameDev UI
 */
function handleSetVariable(actorId, variableId, value) {
  if (!nodeExecutor) {
    notifyParent({
      type: 'VARIABLE_UPDATED',
      data: { success: false, error: 'NodeExecutor not initialized' }
    });
    return;
  }

  nodeExecutor.updateVariableFromUI(actorId, variableId, value);

  // Also update the extractedActors cache
  const actor = extractedActors.find(a => a.id === actorId);
  if (actor && actor.variables[variableId]) {
    actor.variables[variableId].value = value;
  }

  notifyParent({
    type: 'VARIABLE_UPDATED',
    data: { success: true, actorId, variableId, value }
  });
}

/**
 * Update a node's properties
 */
function handleUpdateNode(actorId, nodeId, properties) {
  if (!nodeExecutor) {
    notifyParent({
      type: 'NODE_UPDATED',
      data: { success: false, error: 'NodeExecutor not initialized' }
    });
    return;
  }

  const success = nodeExecutor.updateNodeProperties(actorId, nodeId, properties);

  // Also update extractedActors cache
  if (success) {
    const actor = extractedActors.find(a => a.id === actorId);
    if (actor) {
      const node = actor.logicSheet.nodes.find(n => n.id === nodeId);
      if (node) {
        node.properties = { ...node.properties, ...properties };
      }
    }
  }

  notifyParent({
    type: 'NODE_UPDATED',
    data: { success, actorId, nodeId }
  });
}

/**
 * Add a new node to an actor's logic sheet
 */
function handleAddNode(actorId, node) {
  if (!nodeExecutor) {
    notifyParent({
      type: 'NODE_ADDED',
      data: { success: false, error: 'NodeExecutor not initialized' }
    });
    return;
  }

  const success = nodeExecutor.addNode(actorId, node);

  // Also update extractedActors cache
  if (success) {
    const actor = extractedActors.find(a => a.id === actorId);
    if (actor) {
      actor.logicSheet.nodes.push(node);
    }
  }

  notifyParent({
    type: 'NODE_ADDED',
    data: { success, actorId, nodeId: node.id }
  });
}

/**
 * Add a connection between nodes
 */
function handleAddConnection(actorId, connection) {
  if (!nodeExecutor) {
    notifyParent({
      type: 'CONNECTION_ADDED',
      data: { success: false, error: 'NodeExecutor not initialized' }
    });
    return;
  }

  const success = nodeExecutor.addConnection(actorId, connection);

  // Also update extractedActors cache
  if (success) {
    const actor = extractedActors.find(a => a.id === actorId);
    if (actor) {
      actor.logicSheet.connections.push(connection);
    }
  }

  notifyParent({
    type: 'CONNECTION_ADDED',
    data: { success, actorId }
  });
}

/**
 * Remove a node from an actor's logic sheet
 */
function handleRemoveNode(actorId, nodeId) {
  if (!nodeExecutor) {
    notifyParent({
      type: 'NODE_REMOVED',
      data: { success: false, error: 'NodeExecutor not initialized' }
    });
    return;
  }

  const success = nodeExecutor.removeNode(actorId, nodeId);

  // Also update extractedActors cache
  if (success) {
    const actor = extractedActors.find(a => a.id === actorId);
    if (actor) {
      actor.logicSheet.nodes = actor.logicSheet.nodes.filter(n => n.id !== nodeId);
      actor.logicSheet.connections = actor.logicSheet.connections.filter(
        c => c.from.nodeId !== nodeId && c.to.nodeId !== nodeId
      );
    }
  }

  notifyParent({
    type: 'NODE_REMOVED',
    data: { success, actorId, nodeId }
  });
}

// Expose LogicExtractor for console debugging
window.getActorLogic = (actorId) => {
  const actor = extractedActors.find(a => a.id === actorId);
  return actor ? actor.logicSheet : null;
};

window.listActors = () => {
  return extractedActors.map(a => ({ id: a.id, type: a.type, nodes: a.logicSheet.nodes.length }));
};

// Log available commands
console.log('═══════════════════════════════════════════════════════');
console.log('Canvas Engine - GameDev UI Test Environment');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('Console Commands:');
console.log('  loadScene("TestScene.json")  - Load a JSON scene');
console.log('  createScene({...})           - Create scene from object');
console.log('  listActors()                 - List extracted actors');
console.log('  getActorLogic("actorId")     - Get actor logic sheet');
console.log('  gameEngine                   - Access engine instance');
console.log('');
console.log('URL Parameters:');
console.log('  ?scene=TestScene.json        - Auto-load JSON scene');
console.log('═══════════════════════════════════════════════════════');

