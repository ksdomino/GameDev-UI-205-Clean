/**
 * Default project structure for a new game
 * This is the starting point when a user creates a new game
 * 
 * Scene Naming Convention:
 * - Title level scenes: Title_Scene_1, Title_Scene_2...
 * - Level N scenes: L{N}_Scene_1, L{N}_Scene_2...
 */
export const createDefaultProject = () => ({
  // Project metadata
  name: 'Untitled Game',
  description: 'A new mobile game',
  version: '0.1.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  // Canvas settings
  canvas: {
    width: 1080,
    height: 1920,
    orientation: 'portrait' // portrait or landscape
  },

  // Default starting level
  startLevel: 0,

  // Levels structure (groups of scenes)
  levels: [
    {
      id: 'level_0',
      name: 'Title',
      number: 0,
      description: 'Main menu and intro',
      sceneNames: ['Title_Scene_1']
    },
    {
      id: 'level_1',
      name: 'Level 1',
      number: 1,
      description: 'First gameplay level',
      sceneNames: ['L1_Scene_1']
    }
  ],

  // Scenes in this project (referenced by levels)
  scenes: [
    createDefaultScene('Title_Scene_1', true),
    createDefaultScene('L1_Scene_1', false)
  ],

  // Global assets (shared across scenes)
  assets: {
    images: [],
    audio: [],
    fonts: []
  },

  // Game Objects (reusable entities like Ball, Paddle, Enemy)
  gameObjects: [],

  // Build settings
  build: {
    target: 'mobile', // mobile, web, both
    platforms: ['android', 'ios']
  },

  // Custom scenes flag - set to true when using JavaScript scene classes
  // instead of JSON-driven ConfigurableScene (e.g., PongScene.js, PongTitleScene.js)
  useCustomScenes: false
});

/**
 * Create a default scene
 * @param {string} name - Scene name
 * @param {boolean} isStart - Is this the starting scene?
 */
export const createDefaultScene = (name = 'NewScene', isStart = false) => ({
  name,
  isStartScene: isStart,
  description: '',

  // Scene-specific assets
  assets: {
    images: [],
    audio: []
  },

  // States within this scene
  states: [
    {
      name: 'MAIN',
      duration: null, // null = no auto-transition
      clearLayers: false,
      layers: {
        BG_FAR: [],
        BG_NEAR: [],
        VIDEO_IMAGE: [],
        SHAPES: [],
        SPRITES: [],
        TEXT: [],
        UI_BUTTONS: []
      },
      transition: {
        type: 'none'
      }
    }
  ],

  // Transitions to other scenes
  transitions: []
});

/**
 * Generate a scene name for a given level
 * @param {number} levelNumber - The level number (0 = Title, 1+ = gameplay levels)
 * @param {number} sceneNumber - The scene number within the level
 * @returns {string} Scene name like "Title_Scene_1" or "L1_Scene_2"
 */
export const generateSceneName = (levelNumber, sceneNumber) => {
  if (levelNumber === 0) {
    return `Title_Scene_${sceneNumber}`;
  }
  return `L${levelNumber}_Scene_${sceneNumber}`;
};

/**
 * Get the next scene number for a level
 * @param {Array} existingSceneNames - Current scene names in the level
 * @param {number} levelNumber - The level number
 * @returns {number} Next available scene number
 */
export const getNextSceneNumber = (existingSceneNames, levelNumber) => {
  const prefix = levelNumber === 0 ? 'Title_Scene_' : `L${levelNumber}_Scene_`;
  let maxNum = 0;
  existingSceneNames.forEach(name => {
    if (name.startsWith(prefix)) {
      const num = parseInt(name.replace(prefix, ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });
  return maxNum + 1;
};

/**
 * Create a default state
 */
export const createDefaultState = (name = 'NEW_STATE') => ({
  name,
  duration: 2.0,
  clearLayers: true,
  layers: {
    BG_FAR: [],
    BG_NEAR: [],
    VIDEO_IMAGE: [],
    SHAPES: [],
    SPRITES: [],
    TEXT: [],
    UI_BUTTONS: []
  },
  transition: {
    type: 'timer',
    duration: 2.0,
    nextState: null
  }
});

/**
 * Available layer names (in render order, bottom to top)
 */
export const LAYERS = [
  { name: 'BG_FAR', label: 'Background (Far)', icon: '🌄' },
  { name: 'BG_NEAR', label: 'Background (Near)', icon: '🏞️' },
  { name: 'VIDEO_IMAGE', label: 'Video/Image', icon: '🖼️' },
  { name: 'SHAPES', label: 'Shapes', icon: '⬡' },
  { name: 'SPRITES', label: 'Sprites', icon: '🎮' },
  { name: 'TEXT', label: 'Text', icon: '📝' },
  { name: 'UI_BUTTONS', label: 'UI Buttons', icon: '🔘' }
];

/**
 * Available entity types
 */
export const ENTITY_TYPES = [
  { type: 'sprite', label: 'Image', icon: '🖼️', description: 'Sprite, background, or any image' },
  { type: 'button', label: 'Button', icon: '🔘', description: 'Clickable UI button' },
  { type: 'text', label: 'Text', icon: '📝', description: 'Text display' },
  { type: 'shape', label: 'Shape', icon: '⬡', description: 'Rectangle, circle, or line' }
];

/**
 * Available animation types
 */
export const ANIMATION_TYPES = [
  { type: 'none', label: 'None' },
  { type: 'fadeIn', label: 'Fade In' },
  { type: 'fadeOut', label: 'Fade Out' },
  { type: 'slideIn', label: 'Slide In' },
  { type: 'slideOut', label: 'Slide Out' },
  { type: 'scale', label: 'Scale In' },
  { type: 'pulse', label: 'Pulse' }
];

/**
 * Standard sprite frame sizes (Power of Two)
 */
export const SPRITE_FRAME_SIZES = [
  { size: 32, label: '32×32', description: 'Tiny - particles, small icons' },
  { size: 64, label: '64×64', description: 'Small - icons, collectibles, particles' },
  { size: 128, label: '128×128', description: 'Medium - enemies, items, small characters' },
  { size: 256, label: '256×256', description: 'Large - main player, detailed characters' },
  { size: 512, label: '512×512', description: 'Extra Large - bosses, full-body detail' }
];

/**
 * Recommended sprite sheet presets
 */
export const SPRITESHEET_PRESETS = [
  {
    name: 'Player Character',
    frameSize: 256,
    animations: {
      idle: { row: 0, frames: 4, frameRate: 8, loop: true },
      walk: { row: 1, frames: 8, frameRate: 12, loop: true },
      jump: { row: 2, frames: 6, frameRate: 10, loop: false },
      attack: { row: 3, frames: 6, frameRate: 15, loop: false }
    }
  },
  {
    name: 'Enemy (Simple)',
    frameSize: 128,
    animations: {
      idle: { row: 0, frames: 2, frameRate: 4, loop: true },
      walk: { row: 1, frames: 4, frameRate: 8, loop: true },
      death: { row: 2, frames: 4, frameRate: 10, loop: false }
    }
  },
  {
    name: 'Collectible',
    frameSize: 64,
    animations: {
      idle: { row: 0, frames: 8, frameRate: 10, loop: true },
      collected: { row: 1, frames: 4, frameRate: 15, loop: false }
    }
  },
  {
    name: 'UI Button',
    frameSize: 128,
    animations: {
      normal: { row: 0, frames: 1, frameRate: 1, loop: false },
      hover: { row: 1, frames: 1, frameRate: 1, loop: false },
      pressed: { row: 2, frames: 1, frameRate: 1, loop: false }
    }
  }
];

/**
 * Available transition types
 */
export const TRANSITION_TYPES = [
  { type: 'none', label: 'None (manual)' },
  { type: 'timer', label: 'Timer (auto after duration)' },
  { type: 'button', label: 'Button Click' },
  { type: 'condition', label: 'Condition (custom logic)' }
];
