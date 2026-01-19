/**
 * API Service - Communicates with the backend server
 * 
 * Backend runs on: http://localhost:5176
 * WebSocket for file watching: ws://localhost:5176
 */

const API_BASE = 'http://localhost:5176/api';
const WS_URL = 'ws://localhost:5176';

// WebSocket connection for file watching
let ws = null;
let wsReconnectTimeout = null;
const fileChangeListeners = new Set();

/**
 * Connect to WebSocket for real-time file updates
 */
export function connectFileWatcher(onFileChange) {
  if (onFileChange) {
    fileChangeListeners.add(onFileChange);
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    return; // Already connected
  }

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('📡 Connected to file watcher');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        fileChangeListeners.forEach(listener => listener(message));
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      console.log('📡 File watcher disconnected, reconnecting...');
      // Reconnect after 3 seconds
      wsReconnectTimeout = setTimeout(() => connectFileWatcher(), 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  } catch (error) {
    console.error('Failed to connect to WebSocket:', error);
  }
}

/**
 * Disconnect file watcher
 */
export function disconnectFileWatcher(onFileChange) {
  if (onFileChange) {
    fileChangeListeners.delete(onFileChange);
  }

  if (fileChangeListeners.size === 0 && ws) {
    clearTimeout(wsReconnectTimeout);
    ws.close();
    ws = null;
  }
}

/**
 * Check if backend server is running
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    return { connected: true, ...data };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

// ========== PROJECT OPERATIONS ==========

/**
 * List all saved projects
 */
export async function listProjects() {
  const response = await fetch(`${API_BASE}/projects`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.projects;
}

/**
 * Load a project by filename
 */
export async function loadProject(filename) {
  const response = await fetch(`${API_BASE}/projects/${filename}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.project;
}

/**
 * Save a project to the filesystem
 */
export async function saveProject(project, filename = null) {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project, filename })
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

/**
 * Delete a project
 */
export async function deleteProject(filename) {
  const response = await fetch(`${API_BASE}/projects/${filename}`, {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

// ========== SCENE EXPORT ==========

/**
 * Export a single scene to the Engine
 */
export async function exportScene(scene, canvasSize) {
  const response = await fetch(`${API_BASE}/export-scene`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene, canvasSize })
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

/**
 * Export entire game to the Engine
 */
export async function exportGame(project) {
  const response = await fetch(`${API_BASE}/export-game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project })
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

/**
 * List exported scenes in Engine
 */
export async function listExportedScenes() {
  const response = await fetch(`${API_BASE}/scenes`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.scenes;
}

// ========== ASSETS ==========

/**
 * List available assets
 */
export async function listAssets() {
  const response = await fetch(`${API_BASE}/assets`);
  const data = await response.json();
  return data; // Returns { success, assets }
}

// Alias for component compatibility
export const getAssets = listAssets;

/**
 * Upload an asset
 * @param {Object} params - { filename, assetType, data (base64) }
 */
export async function uploadAsset({ filename, assetType, data }) {
  try {
    const response = await fetch(`${API_BASE}/assets/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, assetType, data })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Upload asset error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate asset dimensions (for PO2 checking)
 * @param {Object} params - { width, height, assetType, fileSize }
 */
export async function validateAsset({ width, height, assetType, fileSize }) {
  const response = await fetch(`${API_BASE}/assets/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ width, height, assetType, fileSize })
  });
  return await response.json();
}

/**
 * Delete an asset
 * @param {string} type - 'images', 'music', or 'sfx'
 * @param {string} filename - The filename to delete
 */
export async function deleteAsset(type, filename) {
  const response = await fetch(`${API_BASE}/assets/${type}/${filename}`, {
    method: 'DELETE'
  });
  return await response.json();
}

// ========== MOBILE DEPLOYMENT ==========

/**
 * Deploy to Android
 * Builds the game and opens Android Studio
 * @param {Object} project - The project to deploy
 */
export async function deployAndroid(project) {
  const response = await fetch(`${API_BASE}/deploy-android`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project })
  });
  return await response.json();
}

// ========== DATA API (Game Logic Data Files) ==========

/**
 * Get all game data (manifest, actors, logic, scenes, etc.)
 * Use this for initial load to get everything at once
 */
export async function getGameData() {
  try {
    const response = await fetch(`${API_BASE}/data/all`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get game manifest
 */
export async function getManifest() {
  try {
    const response = await fetch(`${API_BASE}/data/manifest`);
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get game design document
 */
export async function getDesign() {
  try {
    const response = await fetch(`${API_BASE}/data/design`);
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * List all actors
 */
export async function getActors() {
  try {
    const response = await fetch(`${API_BASE}/data/actors`);
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message, actors: [] };
  }
}

/**
 * Create a new actor
 */
export async function createActor(id, type) {
  try {
    const response = await fetch(`${API_BASE}/data/actors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type })
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get a specific actor by ID
 */
export async function getActor(actorId) {
  try {
    const response = await fetch(`${API_BASE}/data/actors/${actorId}`);
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Save an actor
 */
export async function saveActor(actorId, actorData) {
  try {
    const response = await fetch(`${API_BASE}/data/actors/${actorId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actorData)
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * List all logic sheets
 */
export async function getLogicSheets() {
  try {
    const response = await fetch(`${API_BASE}/data/logic`);
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message, logicSheets: [] };
  }
}

/**
 * Get logic sheet for a specific actor
 */
export async function getLogicSheet(actorId) {
  try {
    const response = await fetch(`${API_BASE}/data/logic/${actorId}`);
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Save a logic sheet
 */
export async function saveLogicSheet(actorId, logicData) {
  try {
    const response = await fetch(`${API_BASE}/data/logic/${actorId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logicData)
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * List all scene definitions
 */
export async function getSceneDefinitions() {
  try {
    const response = await fetch(`${API_BASE}/data/scenes`);
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message, scenes: [] };
  }
}

/**
 * Get a specific scene definition
 */
export async function getSceneDefinition(sceneName) {
  try {
    const response = await fetch(`${API_BASE}/data/scenes/${sceneName}`);
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get sub-scenes for a scene
 */
export async function getSceneSubScenes(sceneName) {
  try {
    const response = await fetch(`${API_BASE}/data/subscenes/${sceneName}`);
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get assets manifest (from /data/assets.json)
 */
export async function getGameAssets() {
  try {
    const response = await fetch(`${API_BASE}/data/game-assets`);
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get validation status
 */
export async function getValidation() {
  try {
    const response = await fetch(`${API_BASE}/data/validation`);
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

