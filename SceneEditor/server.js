/**
 * GameDev UI Backend Server
 * 
 * Handles filesystem operations for the GameDev UI:
 * - Save/load game projects as JSON files
 * - Manage scenes in the Engine folder
 * - Asset file management
 * 
 * Run: node server.js
 * API runs on: http://localhost:5176
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { watch, createWriteStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import http from 'http';
import { Readable } from 'stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = 5176;

// Connected WebSocket clients
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('📡 Client connected (WebSocket)');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('📡 Client disconnected');
  });
});

// Broadcast to all connected clients
function broadcast(message) {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(data);
    }
  });
}

// Paths
const PROJECTS_DIR = path.join(__dirname, 'projects');
const ENGINE_SCENES_DIR = path.join(__dirname, '..', 'Engine', 'public', 'scenes');
const ENGINE_ASSETS_DIR = path.join(__dirname, '..', 'Engine', 'public', 'assets');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    service: 'GameDev UI Backend',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Ensure directories exist
async function ensureDirectories() {
  await fs.mkdir(PROJECTS_DIR, { recursive: true });
  await fs.mkdir(ENGINE_SCENES_DIR, { recursive: true });
  await fs.mkdir(ENGINE_ASSETS_DIR, { recursive: true });
  // Also create the images, music, sfx subdirectories
  await fs.mkdir(path.join(ENGINE_ASSETS_DIR, 'images'), { recursive: true });
  await fs.mkdir(path.join(ENGINE_ASSETS_DIR, 'music'), { recursive: true });
  await fs.mkdir(path.join(ENGINE_ASSETS_DIR, 'sfx'), { recursive: true });
  console.log('📁 Directories ready');
}

// ========== PROJECT API ==========

/**
 * GET /api/projects - List all projects
 */
app.get('/api/projects', async (req, res) => {
  try {
    const files = await fs.readdir(PROJECTS_DIR);
    const projects = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(PROJECTS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const project = JSON.parse(content);
        projects.push({
          filename: file,
          name: project.name,
          updatedAt: project.updatedAt,
          sceneCount: project.scenes?.length || 0
        });
      }
    }

    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/projects/:filename - Load a specific project
 */
app.get('/api/projects/:filename', async (req, res) => {
  try {
    const filePath = path.join(PROJECTS_DIR, req.params.filename);
    const content = await fs.readFile(filePath, 'utf-8');
    const project = JSON.parse(content);
    res.json({ success: true, project });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ success: false, error: 'Project not found' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * POST /api/projects - Save a project
 */
app.post('/api/projects', async (req, res) => {
  try {
    const { project, filename } = req.body;

    if (!project || !project.name) {
      return res.status(400).json({ success: false, error: 'Invalid project data' });
    }

    // Generate filename from project name if not provided
    const safeFilename = filename || `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    const filePath = path.join(PROJECTS_DIR, safeFilename);

    // Update timestamp
    project.updatedAt = new Date().toISOString();

    // Save project
    await fs.writeFile(filePath, JSON.stringify(project, null, 2));

    console.log(`💾 Saved project: ${safeFilename}`);
    res.json({ success: true, filename: safeFilename, path: filePath });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/projects/:filename - Delete a project
 */
app.delete('/api/projects/:filename', async (req, res) => {
  try {
    const filePath = path.join(PROJECTS_DIR, req.params.filename);
    await fs.unlink(filePath);
    console.log(`🗑️ Deleted project: ${req.params.filename}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== SCENE EXPORT API ==========

/**
 * POST /api/export-scene - Export a scene to the Engine's scenes folder
 * This creates a .json file that the Engine can load
 */
app.post('/api/export-scene', async (req, res) => {
  try {
    const { scene, projectName } = req.body;

    if (!scene || !scene.name) {
      return res.status(400).json({ success: false, error: 'Invalid scene data' });
    }

    // Convert scene to Engine format
    const engineScene = {
      sceneName: scene.name,
      canvasSize: req.body.canvasSize || { width: 1080, height: 1920 },
      assets: scene.assets || { images: [], audio: [] },
      states: scene.states.map(state => ({
        name: state.name,
        duration: state.duration || 2,
        clearLayers: state.clearLayers || false,
        layers: state.layers || {},
        transition: state.transition || { type: 'none' }
      }))
    };

    const filename = `${scene.name}.json`;
    const filePath = path.join(ENGINE_SCENES_DIR, filename);

    await fs.writeFile(filePath, JSON.stringify(engineScene, null, 2));

    console.log(`🎬 Exported scene: ${filename}`);
    res.json({
      success: true,
      filename,
      path: filePath,
      engineUrl: `http://localhost:5174?scene=scenes/${filename}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/scenes - List all exported scenes
 */
app.get('/api/scenes', async (req, res) => {
  try {
    const files = await fs.readdir(ENGINE_SCENES_DIR);
    const scenes = files.filter(f => f.endsWith('.json'));
    res.json({ success: true, scenes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== ASSET API ==========

// Power of Two values for validation
const PO2_VALUES = [32, 64, 128, 256, 512, 1024, 2048, 4096];

/**
 * Check if a number is a power of two
 */
function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Get the next power of two >= n
 */
function nextPowerOfTwo(n) {
  for (const po2 of PO2_VALUES) {
    if (po2 >= n) return po2;
  }
  return 4096;
}

/**
 * Validate image dimensions and return warnings
 */
function validateImageDimensions(width, height, assetType) {
  const warnings = [];
  const recommendations = [];

  // PO2 check for sprite sheets
  if (assetType === 'sprite' || assetType === 'spritesheet') {
    if (!isPowerOfTwo(width)) {
      warnings.push(`Width ${width}px is not Power of Two. GPU will pad to ${nextPowerOfTwo(width)}px.`);
      recommendations.push(`Resize width to ${nextPowerOfTwo(width)}px`);
    }
    if (!isPowerOfTwo(height)) {
      warnings.push(`Height ${height}px is not Power of Two. GPU will pad to ${nextPowerOfTwo(height)}px.`);
      recommendations.push(`Resize height to ${nextPowerOfTwo(height)}px`);
    }
    if (width > 2048 || height > 2048) {
      warnings.push(`Image exceeds 2048px max sheet size. May not work on older devices.`);
      recommendations.push(`Keep sprite sheets ≤ 2048×2048`);
    }
  }

  // Background checks
  if (assetType === 'background') {
    if (width !== 1080 || height !== 1920) {
      if (width === 1080 && height > 1920) {
        // Tiled background - good!
        recommendations.push(`Good! Tiled background (${width}×${height}). Use 2 tiles for seamless scroll.`);
      } else if (height === 1920 && width > 1080) {
        recommendations.push(`Good! Horizontal scroll background (${width}×${height}).`);
      } else {
        warnings.push(`Background is ${width}×${height}. Standard is 1080×1920 for full-screen.`);
      }
    }
  }

  // General size warnings
  if (width > 4096 || height > 4096) {
    warnings.push(`Image is very large. May cause memory issues on mobile.`);
  }

  return { warnings, recommendations };
}

/**
 * GET /api/assets - List all assets with metadata
 */
app.get('/api/assets', async (req, res) => {
  try {
    const assets = { images: [], audio: [], sprites: [], backgrounds: [] };

    // Helper to get image dimensions from file
    async function getImageInfo(filePath, filename) {
      try {
        const stats = await fs.stat(filePath);
        return {
          id: filename.replace(/\.[^.]+$/, ''),
          filename,
          path: `/assets/images/${filename}`,
          size: stats.size,
          sizeFormatted: `${(stats.size / 1024).toFixed(1)} KB`
        };
      } catch (e) {
        return { id: filename.replace(/\.[^.]+$/, ''), filename, path: `/assets/images/${filename}` };
      }
    }

    // List images
    const imagesDir = path.join(ENGINE_ASSETS_DIR, 'images');
    try {
      await fs.mkdir(imagesDir, { recursive: true });
      const images = await fs.readdir(imagesDir);
      for (const f of images) {
        if (/\.(png|jpg|jpeg|gif|webp)$/i.test(f)) {
          const info = await getImageInfo(path.join(imagesDir, f), f);
          assets.images.push(info);

          // Categorize by naming convention
          if (f.includes('_bg') || f.includes('background') || f.startsWith('bg_')) {
            assets.backgrounds.push(info);
          } else {
            assets.sprites.push(info);
          }
        }
      }
    } catch (e) { /* images dir doesn't exist */ }

    // List audio
    const musicDir = path.join(ENGINE_ASSETS_DIR, 'music');
    const sfxDir = path.join(ENGINE_ASSETS_DIR, 'sfx');
    try {
      await fs.mkdir(musicDir, { recursive: true });
      const music = await fs.readdir(musicDir);
      for (const f of music) {
        if (/\.(mp3|wav|ogg|m4a)$/i.test(f)) {
          const stats = await fs.stat(path.join(musicDir, f));
          assets.audio.push({
            id: f.replace(/\.[^.]+$/, ''),
            filename: f,
            path: `/assets/music/${f}`,
            type: 'music',
            size: stats.size,
            sizeFormatted: `${(stats.size / 1024).toFixed(1)} KB`
          });
        }
      }
    } catch (e) { /* dir doesn't exist */ }

    try {
      await fs.mkdir(sfxDir, { recursive: true });
      const sfx = await fs.readdir(sfxDir);
      for (const f of sfx) {
        if (/\.(mp3|wav|ogg|m4a)$/i.test(f)) {
          const stats = await fs.stat(path.join(sfxDir, f));
          assets.audio.push({
            id: f.replace(/\.[^.]+$/, ''),
            filename: f,
            path: `/assets/sfx/${f}`,
            type: 'sfx',
            size: stats.size,
            sizeFormatted: `${(stats.size / 1024).toFixed(1)} KB`
          });
        }
      }
    } catch (e) { /* dir doesn't exist */ }

    res.json({ success: true, assets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/assets/upload - Upload an asset
 * Accepts base64 JSON
 */
app.post('/api/assets/upload', async (req, res) => {
  console.log('📤 Upload request received');

  try {
    const { filename, assetType, data } = req.body;

    console.log(`   Filename: ${filename}, Type: ${assetType}, Data length: ${data?.length || 0}`);

    if (!filename || !data) {
      console.log('   ❌ Missing filename or data');
      return res.status(400).json({ success: false, error: 'Missing filename or data' });
    }

    // Determine destination folder
    let destFolder;
    if (assetType === 'music') {
      destFolder = path.join(ENGINE_ASSETS_DIR, 'music');
    } else if (assetType === 'sfx') {
      destFolder = path.join(ENGINE_ASSETS_DIR, 'sfx');
    } else {
      destFolder = path.join(ENGINE_ASSETS_DIR, 'images');
    }

    await fs.mkdir(destFolder, { recursive: true });

    // Decode base64 and save
    const buffer = Buffer.from(data, 'base64');
    const filePath = path.join(destFolder, filename);
    await fs.writeFile(filePath, buffer);

    console.log(`📦 Uploaded asset: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);

    // Return asset info
    const assetInfo = {
      id: filename.replace(/\.[^.]+$/, ''),
      filename,
      path: assetType === 'music' ? `/assets/music/${filename}`
        : assetType === 'sfx' ? `/assets/sfx/${filename}`
          : `/assets/images/${filename}`,
      size: buffer.length,
      sizeFormatted: `${(buffer.length / 1024).toFixed(1)} KB`
    };

    res.json({
      success: true,
      asset: assetInfo,
      message: `Uploaded ${filename}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/assets/validate - Validate an image without uploading
 * Returns PO2 warnings and recommendations
 */
app.post('/api/assets/validate', async (req, res) => {
  try {
    const { width, height, assetType, fileSize } = req.body;

    const validation = validateImageDimensions(width, height, assetType);

    // File size warnings
    if (fileSize) {
      const sizeKB = fileSize / 1024;
      if (assetType === 'sprite' && sizeKB > 500) {
        validation.warnings.push(`File is ${sizeKB.toFixed(0)}KB. Sprite sheets should be < 500KB.`);
      }
      if (assetType === 'background' && sizeKB > 500) {
        validation.warnings.push(`File is ${sizeKB.toFixed(0)}KB. Backgrounds should be < 500KB for mobile.`);
      }
    }

    res.json({
      success: true,
      ...validation,
      isPO2: isPowerOfTwo(width) && isPowerOfTwo(height),
      suggestedWidth: nextPowerOfTwo(width),
      suggestedHeight: nextPowerOfTwo(height)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/assets/:type/:filename - Delete an asset
 */
app.delete('/api/assets/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;

    let folder;
    if (type === 'music') folder = 'music';
    else if (type === 'sfx') folder = 'sfx';
    else folder = 'images';

    const filePath = path.join(ENGINE_ASSETS_DIR, folder, filename);
    await fs.unlink(filePath);

    console.log(`🗑️ Deleted asset: ${type}/${filename}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// ========== HELPERS ==========

/**
 * Merge Game Object definitions into scene entities
 * This allows editing a Game Object once and having it update all scene instances.
 */
/**
 * Merge Game Object definitions into scene entities
 * This allows editing a Game Object once and having it update all scene instances.
 * Also collects used assets for automatic manifest population.
 */
function mergeGameObjects(scene, project) {
  if (!project.gameObjects || !scene.states) return { usedAssetIds: new Set() };

  const gameObjects = project.gameObjects;
  const gameObjectsMap = new Map(gameObjects.map(obj => [obj.id, obj]));
  const usedAssetIds = new Set();

  scene.states.forEach(state => {
    Object.keys(state.layers).forEach(layerName => {
      state.layers[layerName] = state.layers[layerName].map(entity => {
        // Collect assetId if present
        if (entity.assetId) usedAssetIds.add(entity.assetId);

        const template = gameObjectsMap.get(entity.id);
        if (template) {
          // Collect template assetId if present
          if (template.assetId) usedAssetIds.add(template.assetId);

          // Merge properties: Entity specific > Template > Defaults
          return {
            ...entity,
            width: entity.width || template.width,
            height: entity.height || template.height,
            color: entity.color || template.color,
            assetId: entity.assetId || template.assetId,
            variables: {
              ...(template.variables || {}),
              ...(entity.variables || {})
            },
            // Metadata for engine
            gameObjectType: template.type,
            visualType: template.visualType,
            shape: template.shape
          };
        }
        return entity;
      });
    });
  });

  return { usedAssetIds };
}

// ========== FULL GAME EXPORT ==========

/**
 * POST /api/export-game - Export the entire game to Engine folder
 */
app.post('/api/export-game', async (req, res) => {
  try {
    const { project } = req.body;

    if (!project) {
      return res.status(400).json({ success: false, error: 'No project data' });
    }

    const exportedScenes = [];

    const allImages = project.assets?.images || [];

    // Export each scene
    for (const scene of project.scenes) {
      // Create a copy to avoid mutating original project in memory if needed
      const sceneCopy = JSON.parse(JSON.stringify(scene));

      // Sync Game Objects attributes and collect used assets
      const { usedAssetIds } = mergeGameObjects(sceneCopy, project);
      console.log(`   Scene "${sceneCopy.name}": Found ${usedAssetIds.size} unique assets`);

      // Automatic asset manifest population
      const sceneAssets = {
        images: sceneCopy.assets?.images || [],
        audio: sceneCopy.assets?.audio || [],
        videos: sceneCopy.assets?.videos || []
      };

      // Add missing used images to scene manifest
      for (const id of usedAssetIds) {
        if (!id) continue;
        if (!sceneAssets.images.find(a => a.id === id)) {
          const assetInfo = allImages.find(a => a.id === id);
          if (assetInfo) {
            console.log(`     + Adding image: ${id} (${assetInfo.path})`);
            sceneAssets.images.push(assetInfo);
          } else {
            // Robust discovery: scan filesystem for actual extension
            const imgDir = path.join(ENGINE_ASSETS_DIR, 'images');
            const extensions = ['png', 'jpg', 'jpeg', 'webp'];
            let found = false;

            for (const ext of extensions) {
              const filename = `${id}.${ext}`;
              try {
                await fs.access(path.join(imgDir, filename));
                const fallbackPath = `/assets/images/${filename}`;
                console.log(`     ✓ Found filesystem asset: ${id} (${fallbackPath})`);
                sceneAssets.images.push({
                  id: id,
                  path: fallbackPath
                });
                found = true;
                break;
              } catch (e) { /* file not found with this ext */ }
            }

            if (!found) {
              console.warn(`     ⚠️ Asset not found on filesystem: ${id}`);
              // Last resort fallback
              sceneAssets.images.push({
                id: id,
                path: `/assets/images/${id}.png`
              });
            }
          }
        }
      }

      const engineScene = {
        sceneName: sceneCopy.name,
        canvasSize: project.canvas,
        assets: sceneAssets,
        states: sceneCopy.states
      };

      const filename = `${sceneCopy.name}.json`;
      const filePath = path.join(ENGINE_SCENES_DIR, filename);
      await fs.writeFile(filePath, JSON.stringify(engineScene, null, 2));
      exportedScenes.push(filename);
    }

    // Create game manifest
    const manifest = {
      name: project.name,
      version: project.version || '1.0.0',
      startScene: project.scenes.find(s => s.isStartScene)?.name || project.scenes[0]?.name,
      scenes: exportedScenes,
      canvas: project.canvas,
      exportedAt: new Date().toISOString()
    };

    await fs.writeFile(
      path.join(ENGINE_SCENES_DIR, 'game-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Also export the gameObjects array for reference
    await fs.writeFile(
      path.join(ENGINE_SCENES_DIR, 'game-objects.json'),
      JSON.stringify(project.gameObjects || [], null, 2)
    );

    console.log(`🎮 Exported game: ${project.name} (${exportedScenes.length} scenes)`);
    res.json({
      success: true,
      manifest,
      scenes: exportedScenes,
      enginePath: ENGINE_SCENES_DIR
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== HEALTH CHECK ==========

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    server: 'GameDev UI Backend',
    version: '1.0.0',
    paths: {
      projects: PROJECTS_DIR,
      scenes: ENGINE_SCENES_DIR,
      assets: ENGINE_ASSETS_DIR
    }
  });
});

// ========== MOBILE DEPLOYMENT ==========

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const ENGINE_DIR = path.join(__dirname, '..', 'Engine');

/**
 * POST /api/deploy-android - Build and deploy to Android
 * Steps: 1) Export game, 2) Build for production, 3) Sync with Capacitor, 4) Open Android Studio
 */
app.post('/api/deploy-android', async (req, res) => {
  console.log('📱 Starting Android deployment...');

  try {
    const { project } = req.body;

    // Step 1: Export game scenes if project provided
    if (project) {
      console.log('   1/4 Exporting game scenes...');
      const allImages = project.assets?.images || [];

      for (const scene of project.scenes) {
        const sceneCopy = JSON.parse(JSON.stringify(scene));
        const { usedAssetIds } = mergeGameObjects(sceneCopy, project);

        const sceneAssets = {
          images: sceneCopy.assets?.images || [],
          audio: sceneCopy.assets?.audio || [],
          videos: sceneCopy.assets?.videos || []
        };

        usedAssetIds.forEach(id => {
          if (!sceneAssets.images.find(a => a.id === id)) {
            const assetInfo = allImages.find(a => a.id === id);
            if (assetInfo) sceneAssets.images.push(assetInfo);
            else sceneAssets.images.push({ id: id, path: `/assets/images/${id}.png` });
          }
        });

        const engineScene = {
          sceneName: sceneCopy.name,
          canvasSize: project.canvas,
          assets: sceneAssets,
          states: sceneCopy.states
        };

        const filename = `${scene.name}.json`;
        const filePath = path.join(ENGINE_SCENES_DIR, filename);
        await fs.writeFile(filePath, JSON.stringify(engineScene, null, 2));
      }
      console.log(`   ✓ Exported ${project.scenes.length} scenes`);
    }

    // Step 2: Build for production
    console.log('   2/4 Building for production...');
    try {
      await execAsync('npm run build', { cwd: ENGINE_DIR });
      console.log('   ✓ Build complete');
    } catch (buildError) {
      console.error('   ✗ Build failed:', buildError.message);
      return res.status(500).json({
        success: false,
        error: 'Build failed: ' + buildError.message,
        step: 'build'
      });
    }

    // Step 3: Sync with Capacitor
    console.log('   3/4 Syncing with Capacitor...');
    try {
      await execAsync('npx cap sync android', { cwd: ENGINE_DIR });
      console.log('   ✓ Sync complete');
    } catch (syncError) {
      // Check if android platform is added
      if (syncError.message.includes('android platform has not been added')) {
        console.log('   Adding Android platform...');
        await execAsync('npx cap add android', { cwd: ENGINE_DIR });
        await execAsync('npx cap sync android', { cwd: ENGINE_DIR });
        console.log('   ✓ Android platform added and synced');
      } else {
        console.error('   ✗ Sync failed:', syncError.message);
        return res.status(500).json({
          success: false,
          error: 'Capacitor sync failed: ' + syncError.message,
          step: 'sync'
        });
      }
    }

    // Step 4: Open Android Studio
    console.log('   4/4 Opening Android Studio...');
    try {
      // Use spawn so it doesn't block
      spawn('npx', ['cap', 'open', 'android'], {
        cwd: ENGINE_DIR,
        detached: true,
        stdio: 'ignore'
      }).unref();
      console.log('   ✓ Android Studio launching...');
    } catch (openError) {
      console.warn('   ⚠ Could not auto-open Android Studio:', openError.message);
    }

    console.log('📱 Android deployment complete!');
    res.json({
      success: true,
      message: 'Build complete! Android Studio should open shortly.',
      steps: ['export', 'build', 'sync', 'open']
    });

  } catch (error) {
    console.error('Deploy error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== FILE WATCHING ==========

// Track file changes to avoid duplicate events
const recentChanges = new Map();

function setupFileWatching() {
  console.log('👁️ Watching for file changes...');

  // Watch projects directory
  watch(PROJECTS_DIR, (eventType, filename) => {
    if (!filename || !filename.endsWith('.json')) return;

    // Debounce - ignore if changed in last 2 seconds (likely our own save)
    const key = `${PROJECTS_DIR}/${filename}`;
    const now = Date.now();
    if (recentChanges.has(key) && now - recentChanges.get(key) < 2000) {
      return;
    }
    recentChanges.set(key, now);

    console.log(`📝 File changed: ${filename}`);
    broadcast({
      type: 'FILE_CHANGED',
      data: {
        folder: 'projects',
        filename,
        eventType
      }
    });
  });

  // Watch Engine scenes directory
  watch(ENGINE_SCENES_DIR, (eventType, filename) => {
    if (!filename || !filename.endsWith('.json')) return;

    const key = `${ENGINE_SCENES_DIR}/${filename}`;
    const now = Date.now();
    if (recentChanges.has(key) && now - recentChanges.get(key) < 2000) {
      return;
    }
    recentChanges.set(key, now);

    console.log(`📝 Scene file changed: ${filename}`);
    broadcast({
      type: 'SCENE_FILE_CHANGED',
      data: { filename, eventType }
    });
  });
}

// Mark our own saves to avoid triggering reload
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path.startsWith('/api/projects')) {
    // Will be handled after save
  }
  next();
});

// ========== DATA API (Game Logic Data Files) ==========
// These endpoints read from Engine/data/ for the data-first development system

const ENGINE_DATA_DIR = path.join(__dirname, '..', 'Engine', 'data');

/**
 * GET /api/data/manifest - Get game manifest
 */
app.get('/api/data/manifest', async (req, res) => {
  try {
    const manifestPath = path.join(ENGINE_DATA_DIR, 'manifest.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    res.json({ success: true, data: JSON.parse(content) });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({ success: false, error: 'No manifest.json found', data: null });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * GET /api/data/design - Get game design document
 */
app.get('/api/data/design', async (req, res) => {
  try {
    const designPath = path.join(ENGINE_DATA_DIR, 'design.json');
    const content = await fs.readFile(designPath, 'utf-8');
    res.json({ success: true, data: JSON.parse(content) });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({ success: false, error: 'No design.json found', data: null });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * GET /api/data/actors - List all actors
 */
app.get('/api/data/actors', async (req, res) => {
  try {
    const actorsDir = path.join(ENGINE_DATA_DIR, 'actors');
    await fs.mkdir(actorsDir, { recursive: true });

    const files = await fs.readdir(actorsDir);
    const actors = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(actorsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const actor = JSON.parse(content);
        actors.push(actor);
      }
    }

    res.json({ success: true, actors, count: actors.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/data/actors/:id - Get a specific actor
 */
app.get('/api/data/actors/:id', async (req, res) => {
  try {
    const actorPath = path.join(ENGINE_DATA_DIR, 'actors', `${req.params.id}.json`);
    const content = await fs.readFile(actorPath, 'utf-8');
    res.json({ success: true, data: JSON.parse(content) });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ success: false, error: `Actor ${req.params.id} not found` });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * GET /api/data/logic - List all logic sheets
 */
app.get('/api/data/logic', async (req, res) => {
  try {
    const logicDir = path.join(ENGINE_DATA_DIR, 'logic');
    await fs.mkdir(logicDir, { recursive: true });

    const files = await fs.readdir(logicDir);
    const logicSheets = [];

    for (const file of files) {
      if (file.endsWith('.logic.json')) {
        const filePath = path.join(logicDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const logic = JSON.parse(content);
        logicSheets.push({
          actorId: logic.actorId,
          description: logic.description,
          nodeCount: logic.nodes?.length || 0,
          connectionCount: logic.connections?.length || 0,
          file: file
        });
      }
    }

    res.json({ success: true, logicSheets, count: logicSheets.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/data/logic/:actorId - Get logic sheet for an actor
 */
app.get('/api/data/logic/:actorId', async (req, res) => {
  try {
    const logicPath = path.join(ENGINE_DATA_DIR, 'logic', `${req.params.actorId}.logic.json`);
    const content = await fs.readFile(logicPath, 'utf-8');
    res.json({ success: true, data: JSON.parse(content) });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ success: false, error: `Logic sheet for ${req.params.actorId} not found` });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * GET /api/data/scenes - List all scene definitions
 */
app.get('/api/data/scenes', async (req, res) => {
  try {
    const scenesDir = path.join(ENGINE_DATA_DIR, 'scenes');
    await fs.mkdir(scenesDir, { recursive: true });

    const files = await fs.readdir(scenesDir);
    const scenes = [];

    for (const file of files) {
      if (file.endsWith('.scene.json')) {
        const filePath = path.join(scenesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const scene = JSON.parse(content);
        scenes.push({
          sceneName: scene.sceneName,
          description: scene.description,
          actorCount: scene.actors?.length || 0,
          stateCount: scene.states?.length || 0,
          file: file
        });
      }
    }

    res.json({ success: true, scenes, count: scenes.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/data/scenes/:name - Get a specific scene
 */
app.get('/api/data/scenes/:name', async (req, res) => {
  try {
    const scenePath = path.join(ENGINE_DATA_DIR, 'scenes', `${req.params.name}.scene.json`);
    const content = await fs.readFile(scenePath, 'utf-8');
    res.json({ success: true, data: JSON.parse(content) });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ success: false, error: `Scene ${req.params.name} not found` });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * GET /api/data/states/:sceneName - Get state machine for a scene
 */
app.get('/api/data/states/:sceneName', async (req, res) => {
  try {
    const statesPath = path.join(ENGINE_DATA_DIR, 'states', `${req.params.sceneName}.states.json`);
    const content = await fs.readFile(statesPath, 'utf-8');
    res.json({ success: true, data: JSON.parse(content) });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ success: false, error: `States for ${req.params.sceneName} not found` });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * GET /api/data/assets - Get assets manifest
 */
app.get('/api/data/game-assets', async (req, res) => {
  try {
    const assetsPath = path.join(ENGINE_DATA_DIR, 'assets.json');
    const content = await fs.readFile(assetsPath, 'utf-8');
    res.json({ success: true, data: JSON.parse(content) });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({ success: false, error: 'No assets.json found', data: null });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * GET /api/data/validation - Get validation status
 */
app.get('/api/data/validation', async (req, res) => {
  try {
    const validationPath = path.join(ENGINE_DATA_DIR, 'validation.json');
    const content = await fs.readFile(validationPath, 'utf-8');
    res.json({ success: true, data: JSON.parse(content) });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({ success: false, error: 'No validation.json found', data: null });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * GET /api/data/all - Get complete data overview (for initial load)
 */
app.get('/api/data/all', async (req, res) => {
  try {
    const result = {
      manifest: null,
      design: null,
      actors: [],
      logicSheets: [],
      scenes: [],
      assets: null,
      validation: null
    };

    // Load manifest
    try {
      const manifestPath = path.join(ENGINE_DATA_DIR, 'manifest.json');
      result.manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    } catch (e) { /* not found */ }

    // Load design
    try {
      const designPath = path.join(ENGINE_DATA_DIR, 'design.json');
      result.design = JSON.parse(await fs.readFile(designPath, 'utf-8'));
    } catch (e) { /* not found */ }

    // Load actors
    try {
      const actorsDir = path.join(ENGINE_DATA_DIR, 'actors');
      const actorFiles = await fs.readdir(actorsDir);
      for (const file of actorFiles) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(actorsDir, file), 'utf-8');
          result.actors.push(JSON.parse(content));
        }
      }
    } catch (e) { /* dir not found */ }

    // Load logic sheets
    try {
      const logicDir = path.join(ENGINE_DATA_DIR, 'logic');
      const logicFiles = await fs.readdir(logicDir);
      for (const file of logicFiles) {
        if (file.endsWith('.logic.json')) {
          const content = await fs.readFile(path.join(logicDir, file), 'utf-8');
          result.logicSheets.push(JSON.parse(content));
        }
      }
    } catch (e) { /* dir not found */ }

    // Load scenes
    try {
      const scenesDir = path.join(ENGINE_DATA_DIR, 'scenes');
      const sceneFiles = await fs.readdir(scenesDir);
      for (const file of sceneFiles) {
        if (file.endsWith('.scene.json')) {
          const content = await fs.readFile(path.join(scenesDir, file), 'utf-8');
          result.scenes.push(JSON.parse(content));
        }
      }
    } catch (e) { /* dir not found */ }

    // Load assets
    try {
      const assetsPath = path.join(ENGINE_DATA_DIR, 'assets.json');
      result.assets = JSON.parse(await fs.readFile(assetsPath, 'utf-8'));
    } catch (e) { /* not found */ }

    // Load validation
    try {
      const validationPath = path.join(ENGINE_DATA_DIR, 'validation.json');
      result.validation = JSON.parse(await fs.readFile(validationPath, 'utf-8'));
    } catch (e) { /* not found */ }

    res.json({
      success: true,
      data: result,
      summary: {
        hasManifest: !!result.manifest,
        hasDesign: !!result.design,
        actorCount: result.actors.length,
        logicSheetCount: result.logicSheets.length,
        sceneCount: result.scenes.length,
        hasAssets: !!result.assets,
        isValidated: result.validation?.validated || false
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST ENDPOINTS FOR SAVING DATA ==========

/**
 * POST /api/data/actors/:id - Save an actor
 */
app.post('/api/data/actors/:id', async (req, res) => {
  try {
    const actorsDir = path.join(ENGINE_DATA_DIR, 'actors');
    await fs.mkdir(actorsDir, { recursive: true });

    const actorPath = path.join(actorsDir, `${req.params.id}.json`);
    await fs.writeFile(actorPath, JSON.stringify(req.body, null, 2));

    res.json({ success: true, message: `Actor ${req.params.id} saved` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/data/logic/:actorId - Save a logic sheet
 */
app.post('/api/data/logic/:actorId', async (req, res) => {
  try {
    const logicDir = path.join(ENGINE_DATA_DIR, 'logic');
    await fs.mkdir(logicDir, { recursive: true });

    const logicPath = path.join(logicDir, `${req.params.actorId}.logic.json`);
    await fs.writeFile(logicPath, JSON.stringify(req.body, null, 2));

    res.json({ success: true, message: `Logic sheet for ${req.params.actorId} saved` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// Start server
ensureDirectories().then(() => {
  server.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🎮 GameDev UI Backend Server');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  API:       http://localhost:${PORT}/api`);
    console.log(`  WebSocket: ws://localhost:${PORT}`);
    console.log(`  Projects:  ${PROJECTS_DIR}`);
    console.log(`  Scenes:    ${ENGINE_SCENES_DIR}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('Features:');
    console.log('  ✓ REST API for project management');
    console.log('  ✓ DATA API for game logic files (/api/data/*)');
    console.log('  ✓ WebSocket for real-time file watching');
    console.log('  ✓ IDE sync (edit files externally, UI auto-reloads)');
    console.log('');

    // Start file watching
    setupFileWatching();
  });
});
