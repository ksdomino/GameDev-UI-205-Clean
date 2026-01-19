/**
 * ConfigurableScene - A scene that loads its behavior from JSON configuration
 * 
 * This enables the JSON-driven architecture where scenes are defined as data,
 * not code. The GameDev UI generates JSON configs, and this class executes them.
 */
import { Scene } from './Scene.js';
import { Sprite } from '../entities/Sprite.js';
import { Button } from '../entities/Button.js';

export class ConfigurableScene extends Scene {
  constructor(name = 'ConfigurableScene') {
    super(name);

    // Config data
    this.config = null;
    this.canvasSize = { width: 1080, height: 1920 };

    // State management
    this.states = [];
    this.currentStateIndex = 0;
    this.currentStateName = null;
    this.stateTimer = 0;

    // Entity tracking
    this.entities = new Map(); // id -> entity
    this.entityAnimations = new Map(); // id -> animation state

    // Assets to load
    this.assetsToLoad = { images: [], audio: [], videos: [] };
  }

  /**
   * Load scene from JSON configuration
   * @param {Object} config - Scene JSON config (matches scene-schema.json)
   * @returns {ConfigurableScene} this (for chaining)
   */
  loadFromConfig(config) {
    this.config = config;
    this._config = config;  // Also store as _config for internal methods
    this.name = config.sceneName || 'ConfigurableScene';

    if (config.canvasSize) {
      this.canvasSize = config.canvasSize;
    }

    // Store states
    this.states = config.states || [];

    // Collect assets to preload
    if (config.assets) {
      this.assetsToLoad = {
        images: config.assets.images || [],
        audio: config.assets.audio || [],
        videos: config.assets.videos || []
      };
    }

    return this;
  }

  /**
   * Initialize - load all assets
   */
  async init() {
    if (!this.config) {
      console.warn('ConfigurableScene: No config loaded');
      return;
    }

    const loader = this.engine.assetLoader;

    // Load images
    if (this.assetsToLoad.images.length > 0) {
      await loader.loadImages(this.assetsToLoad.images);
    }

    // Load audio
    if (this.assetsToLoad.audio.length > 0) {
      await loader.loadAudioFiles(this.assetsToLoad.audio);
    }

    // Log loaded assets
    console.log(`[${this.name}] Assets loaded:`, {
      images: this.assetsToLoad.images.length,
      audio: this.assetsToLoad.audio.length
    });
  }

  /**
   * Enter scene - start first state
   */
  async enter() {
    await super.enter();
    this.currentStateIndex = 0;
    this.stateTimer = 0;

    if (this.states.length > 0) {
      this.currentStateName = this.states[0].name;
      console.log(`[${this.name}] Entering state: ${this.currentStateName}`);
    }
  }

  /**
   * Exit scene - cleanup
   */
  exit() {
    super.exit();
    this.entities.clear();
    this.entityAnimations.clear();

    // Unload scene-specific assets
    const assetIds = [
      ...this.assetsToLoad.images.map(a => a.id),
      ...this.assetsToLoad.audio.map(a => a.id)
    ];

    if (assetIds.length > 0 && this.engine.assetLoader.unloadAssets) {
      this.engine.assetLoader.unloadAssets(assetIds);
    }
  }

  /**
   * Populate layers - set up initial state
   */
  populateLayers() {
    if (this.states.length > 0) {
      this._setupState(this.states[0]);
    }
  }

  /**
   * Update - handle state logic and transitions
   * @param {number} dt - Delta time in seconds
   */
  update(deltaTime) {
    if (!this.isActive || !this.isInitialized) return;

    if (!this.currentStateName && this.states.length > 0) {
      this._changeState(0);
    }

    const currentState = this.states[this.currentStateIndex];
    if (!currentState) return;

    this.stateTimer += deltaTime;

    // Update entity animations
    this._updateAnimations(deltaTime);

    // Handle button clicks
    if (this.inputHandler.mouse.pressed) {
      this._handleButtonClicks();
      // Also check interactive entities for visual scripting OnClick events
      this._handleInteractiveClicks();
    }

    // Check for timer transition
    if (currentState.transition && currentState.transition.type === 'timer') {
      if (this.stateTimer >= currentState.transition.duration) {
        this._handleTransition(currentState.transition);
      }
    }
  }

  /**
   * Set up a state - clear layers and create entities
   * @private
   */
  _setupState(state) {
    if (state.clearLayers) {
      this.layerManager.clearAll();
      this.entities.clear();
      this.entityAnimations.clear();
    }

    if (!state.layers) return;

    // Process each layer
    for (const [layerName, entities] of Object.entries(state.layers)) {
      if (!Array.isArray(entities)) continue;

      for (const entityConfig of entities) {
        const entity = this._createEntity(entityConfig);
        if (entity) {
          this.layerManager.addToLayer(entity, layerName);

          // Track entity by id
          if (entityConfig.id) {
            this.entities.set(entityConfig.id, entity);
          }

          // Set up animation if present
          if (entityConfig.animation) {
            this._setupAnimation(entity, entityConfig.animation);
          }
        }
      }
    }
  }

  /**
   * Create an entity from config
   * @private
   */
  _createEntity(config) {
    const visualType = config.visualType || (config.type === 'sprite' ? 'sprite' : 'shape');

    switch (config.type) {
      case 'sprite':
      case 'paddle': // Support custom types from UI
        return this._createSprite(config);
      case 'button':
        return this._createButton(config);
      case 'text':
        return this._createText(config);
      case 'shape':
        if (visualType === 'sprite' || config.spriteId) {
          return this._createSprite(config);
        }
        return this._createShape(config);
      default:
        console.warn(`Unknown entity type: ${config.type}`);
        return null;
    }
  }

  /**
   * Create a Sprite entity
   * @private
   */
  _createSprite(config) {
    const width = config.width || 0;
    const height = config.height || 0;
    const x = (config.x || 0) - width / 2;
    const y = (config.y || 0) - height / 2;

    const sprite = new Sprite(
      x,
      y,
      width,
      height
    );

    const assetId = config.assetId || config.spriteId;
    // Set image from asset loader
    if (assetId && this.engine.assetLoader) {
      const image = this.engine.assetLoader.getImage(assetId);
      if (image) {
        sprite.setImage(image);
      } else {
        // Fallback: try loading directly if path provided
        const path = config.path || config.spritePath;
        if (path) {
          sprite.setImage(path);
        }
      }
    }

    // Apply additional properties
    if (config.rotation !== undefined) sprite.rotation = config.rotation;
    if (config.alpha !== undefined) sprite.alpha = config.alpha;
    if (config.scaleX !== undefined) sprite.scaleX = config.scaleX;
    if (config.scaleY !== undefined) sprite.scaleY = config.scaleY;
    if (config.visible !== undefined) sprite.visible = config.visible;

    return sprite;
  }

  /**
   * Create a Button entity
   * @private
   */
  _createButton(config) {
    // Button x,y in JSON is the CENTER position, so offset to top-left
    const width = config.width || 200;
    const height = config.height || 80;
    const x = (config.x || 0) - width / 2;
    const y = (config.y || 0) - height / 2;

    const button = new Button(
      x,
      y,
      width,
      height,
      config.text || '',
      config.color || '#4a90e2',
      config.alpha !== undefined ? config.alpha : 1,
      null // onClick set below
    );

    // Set up onClick handler
    if (config.onClick) {
      button.onClick = () => this._handleButtonAction(config.onClick);
      button._actionConfig = config.onClick; // Store for reference
    }

    // Apply additional properties
    if (config.textColor) button.textColor = config.textColor;
    if (config.fontSize) button.fontSize = config.fontSize;

    return button;
  }

  /**
   * Create a Text entity (render object)
   * @private
   */
  _createText(config) {
    const textEntity = {
      type: 'text',
      content: config.content || '',
      x: config.x || 0,
      y: config.y || 0,
      font: config.font || '48px Arial',
      color: config.color || '#ffffff',
      textAlign: config.textAlign || 'left',
      alpha: config.alpha !== undefined ? config.alpha : 1,
      visible: config.visible !== undefined ? config.visible : true,

      render(ctx) {
        if (!this.visible) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;

        // Construct font string from separate properties or fall back to 'font'
        let fontString = this.font || '48px Arial';
        if (config.fontSize || config.fontFamily || config.fontWeight) {
          const weight = config.fontWeight || 'normal';
          const size = config.fontSize || 48;
          const family = config.fontFamily || 'Arial';
          fontString = `${weight} ${size}px ${family}`;
        }

        ctx.font = fontString;
        ctx.textAlign = this.textAlign;
        ctx.textBaseline = 'top';
        ctx.fillText(this.content, this.x, this.y);
        ctx.restore();
      }
    };

    return textEntity;
  }

  /**
   * Create a Shape entity (render object)
   * @private
   */
  _createShape(config) {
    const isRect = config.shape === 'rect' || config.shape === 'square';
    const width = config.width || 100;
    const height = config.height || 100;

    // Offset rects/squares to be centered like buttons and sprites
    const x = isRect ? (config.x || 0) - width / 2 : (config.x || 0);
    const y = isRect ? (config.y || 0) - height / 2 : (config.y || 0);

    const shapeEntity = {
      type: 'shape',
      shape: config.shape || 'rect',
      x: x,
      y: y,
      width: width,
      height: height,
      radius: config.radius || 50,
      color: config.color || '#ffffff',
      fill: config.fill !== undefined ? config.fill : true,
      strokeWidth: config.strokeWidth || 1,
      alpha: config.alpha !== undefined ? config.alpha : 1,
      visible: config.visible !== undefined ? config.visible : true,

      render(ctx) {
        if (!this.visible) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;

        if (this.fill) {
          ctx.fillStyle = this.color;
        } else {
          ctx.strokeStyle = this.color;
          ctx.lineWidth = this.strokeWidth;
        }

        switch (this.shape) {
          case 'rect':
            if (this.fill) {
              ctx.fillRect(this.x, this.y, this.width, this.height);
            } else {
              ctx.strokeRect(this.x, this.y, this.width, this.height);
            }
            break;

          case 'circle':
            ctx.beginPath();
            ctx.arc(this.x + this.radius, this.y + this.radius, this.radius, 0, Math.PI * 2);
            if (this.fill) {
              ctx.fill();
            } else {
              ctx.stroke();
            }
            break;

          case 'line':
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.stroke();
            break;
        }

        ctx.restore();
      }
    };

    return shapeEntity;
  }

  /**
   * Set up an animation for an entity
   * @private
   */
  _setupAnimation(entity, animConfig) {
    const animation = {
      entity,
      type: animConfig.type,
      duration: animConfig.duration || 1,
      delay: animConfig.delay || 0,
      easing: animConfig.easing || 'linear',
      direction: animConfig.direction || 'top',
      elapsed: 0,
      started: false,
      completed: false,

      // Store initial values
      initialAlpha: entity.alpha,
      initialX: entity.x,
      initialY: entity.y,
      initialScaleX: entity.scaleX || 1,
      initialScaleY: entity.scaleY || 1
    };

    // Set initial state based on animation type
    switch (animConfig.type) {
      case 'fadeIn':
        entity.alpha = 0;
        break;
      case 'fadeOut':
        // Already visible
        break;
      case 'slideIn':
        this._setSlideInStart(entity, animation);
        break;
      case 'scale':
        entity.scaleX = 0;
        entity.scaleY = 0;
        break;
    }

    // Store animation (use entity reference as key)
    this.entityAnimations.set(entity, animation);
  }

  /**
   * Set initial position for slideIn animation
   * @private
   */
  _setSlideInStart(entity, animation) {
    switch (animation.direction) {
      case 'top':
        entity.y = -entity.height - 100;
        break;
      case 'bottom':
        entity.y = this.canvasSize.height + 100;
        break;
      case 'left':
        entity.x = -entity.width - 100;
        break;
      case 'right':
        entity.x = this.canvasSize.width + 100;
        break;
    }
  }

  /**
   * Update all active animations
   * @private
   */
  _updateAnimations(dt) {
    for (const [entity, anim] of this.entityAnimations) {
      if (anim.completed) continue;

      anim.elapsed += dt;

      // Handle delay
      if (anim.elapsed < anim.delay) continue;

      const effectiveElapsed = anim.elapsed - anim.delay;
      const progress = Math.min(effectiveElapsed / anim.duration, 1);
      const easedProgress = this._applyEasing(progress, anim.easing);

      switch (anim.type) {
        case 'fadeIn':
          entity.alpha = easedProgress * anim.initialAlpha;
          break;

        case 'fadeOut':
          entity.alpha = anim.initialAlpha * (1 - easedProgress);
          break;

        case 'slideIn':
          this._updateSlideIn(entity, anim, easedProgress);
          break;

        case 'scale':
          entity.scaleX = easedProgress * anim.initialScaleX;
          entity.scaleY = easedProgress * anim.initialScaleY;
          break;

        case 'pulse':
          const pulse = 1 + Math.sin(effectiveElapsed * 4) * 0.1;
          entity.scaleX = anim.initialScaleX * pulse;
          entity.scaleY = anim.initialScaleY * pulse;
          break;
      }

      if (progress >= 1 && anim.type !== 'pulse') {
        anim.completed = true;
      }
    }
  }

  /**
   * Update slideIn animation
   * @private
   */
  _updateSlideIn(entity, anim, progress) {
    switch (anim.direction) {
      case 'top':
      case 'bottom':
        entity.y = anim.initialY + (anim.initialY - entity.y) * (1 - (1 - progress));
        // Simpler: lerp to target
        const targetY = anim.direction === 'top'
          ? anim.initialY
          : anim.initialY;
        entity.y = this._lerp(entity.y, anim.initialY, progress);
        break;
      case 'left':
      case 'right':
        entity.x = this._lerp(entity.x, anim.initialX, progress);
        break;
    }
  }

  /**
   * Apply easing function
   * @private
   */
  _applyEasing(t, easing) {
    switch (easing) {
      case 'easeIn':
        return t * t;
      case 'easeOut':
        return 1 - (1 - t) * (1 - t);
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'linear':
      default:
        return t;
    }
  }

  /**
   * Linear interpolation
   * @private
   */
  _lerp(start, end, t) {
    return start + (end - start) * t;
  }

  /**
   * Handle button clicks
   * @private
   */
  _handleButtonClicks() {
    const { x, y } = this.inputHandler.mouse;

    console.log(`[${this.name}] Button click at (${x.toFixed(0)}, ${y.toFixed(0)})`);

    for (const [id, entity] of this.entities) {
      if (entity.checkClick) {
        console.log(`[${this.name}] Checking entity ${id}:`, {
          type: entity.constructor.name,
          x: entity.x,
          y: entity.y,
          w: entity.w,
          h: entity.h
        });
        const clicked = entity.checkClick(x, y);
        if (clicked) {
          console.log(`[${this.name}] Button ${id} was clicked!`);
        }
      }
    }
  }

  /**
   * Handle clicks on interactive entities (for visual scripting)
   * @private
   */
  _handleInteractiveClicks() {
    const { x, y } = this.inputHandler.mouse;
    const nodeExecutor = this.engine.nodeExecutor;

    console.log(`[${this.name}] Checking interactive clicks at (${x.toFixed(0)}, ${y.toFixed(0)}), nodeExecutor:`, !!nodeExecutor, 'entities:', this.entities.size);

    if (!nodeExecutor) return;

    for (const [id, entity] of this.entities) {
      // Check if entity is interactive (from config) and was clicked
      const config = this._getEntityConfig(id);
      console.log(`[${this.name}] Entity ${id}: config=`, config?.interactive);
      if (!config || !config.interactive) continue;

      // Check if click is within entity bounds
      const isInBounds = this._isPointInEntity(x, y, entity, config);
      console.log(`[${this.name}] Entity ${id}: click(${x.toFixed(0)},${y.toFixed(0)}) entity.x=${entity.x} entity.y=${entity.y} config.x=${config.x} config.y=${config.y} isInBounds=${isInBounds}`);

      if (isInBounds) {
        console.log(`[NodeExecutor] OnClick triggered for: ${id}`);

        // Track which actors we've already triggered to avoid duplicates
        const triggeredActors = new Set();

        // First, trigger for the entity ID itself if an actor exists with that ID
        if (nodeExecutor.actors.has(id)) {
          nodeExecutor.triggerEvent(id, 'OnClick', { clickX: x, clickY: y });
          triggeredActors.add(id);
        }

        // Also trigger for actors that reference this entity via entityRef
        for (const [actorId, actor] of nodeExecutor.actors) {
          if (!triggeredActors.has(actorId) && actor.entityRef === id) {
            nodeExecutor.triggerEvent(actorId, 'OnClick', { clickX: x, clickY: y });
            triggeredActors.add(actorId);
          }
        }
      }
    }
  }

  /**
   * Get config for entity by ID
   * @private
   */
  _getEntityConfig(id) {
    if (!this._config) return null;

    for (const state of this._config.states || []) {
      // Check in layers object (new format)
      if (state.layers) {
        for (const layerEntities of Object.values(state.layers)) {
          for (const entity of layerEntities || []) {
            if (entity.id === id) return entity;
          }
        }
      }
      // Also check entities array (legacy format)
      for (const entity of state.entities || []) {
        if (entity.id === id) return entity;
      }
    }
    return null;
  }

  /**
   * Check if point is within entity bounds
   * @private
   */
  _isPointInEntity(x, y, entity, config) {
    if (entity.contains) {
      // Sprite/Button with proper hit detection
      return entity.contains(x, y);
    }

    // Shape-based entities - use config dimensions
    const ex = entity.x || config.x || 0;
    const ey = entity.y || config.y || 0;
    const ew = entity.width || config.width || 100;
    const eh = entity.height || config.height || 100;
    const shape = config.shapeType || config.shape || 'rect';

    if (shape === 'circle') {
      // Circular hit detection
      // Note: circles render at (x + radius, y + radius) so center needs same offset
      const radius = config.radius || ew / 2;
      const cx = ex + radius;
      const cy = ey + radius;
      const dx = x - cx;
      const dy = y - cy;
      return (dx * dx + dy * dy) <= (radius * radius);
    }

    // Rectangle hit detection (centered origin)
    const left = ex - ew / 2;
    const top = ey - eh / 2;
    return x >= left && x <= left + ew && y >= top && y <= top + eh;
  }

  /**
   * Handle button action
   * @private
   */
  _handleButtonAction(action) {
    console.log(`[${this.name}] Button action:`, action);

    switch (action.action) {
      case 'switchScene':
      case 'changeScene':  // Support both action names
        if (action.target) {
          this.switchScene(action.target);
        }
        break;

      case 'switchState':
      case 'changeState':  // Support both action names
        if (action.target) {
          this._switchToState(action.target);
        }
        break;

      case 'playSound':
        if (action.sound && this.engine.audioManager) {
          this.engine.audioManager.playSFX(action.sound);
        }
        break;

      case 'custom':
        // For custom actions, emit an event or call a callback
        console.log('Custom action:', action);
        break;

      case 'none':
        // Do nothing
        break;
    }
  }

  /**
   * Handle transition to next state/scene
   * @private
   */
  _handleTransition(transition) {
    if (transition.nextScene) {
      this.switchScene(transition.nextScene);
    } else if (transition.nextState) {
      this._switchToState(transition.nextState);
    }
  }

  /**
   * Switch to a named state
   * @private
   */
  _switchToState(stateName) {
    const stateIndex = this.states.findIndex(s => s.name === stateName);
    if (stateIndex === -1) {
      console.warn(`[${this.name}] State not found: ${stateName}`);
      return;
    }

    console.log(`[${this.name}] Switching to state: ${stateName}`);

    this.currentStateIndex = stateIndex;
    this.currentStateName = stateName;
    this.stateTimer = 0;

    this._setupState(this.states[stateIndex]);
  }

  /**
   * Get current state name
   * @returns {string}
   */
  getCurrentStateName() {
    return this.currentStateName;
  }

  /**
   * Get entity by id
   * @param {string} id - Entity id
   * @returns {Object|null}
   */
  getEntity(id) {
    return this.entities.get(id) || null;
  }
}
