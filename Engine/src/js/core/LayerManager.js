/**
 * LayerManager - Handles layered rendering with specific z-order
 * Render order (bottom to top):
 * BG_FAR -> BG_NEAR -> VIDEO_IMAGE -> SHAPES -> SPRITES -> TEXT -> UI_BUTTONS
 * 
 * Performance: Static layers (BG_FAR, BG_NEAR) are cached to an OffscreenCanvas
 * and only re-rendered when their content changes.
 */
export class LayerManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Internal resolution (matches Engine)
    this.width = 1080;
    this.height = 1920;

    // Define render layers in order (bottom to top)
    this.LAYERS = {
      BG_FAR: 0,
      BG_NEAR: 1,
      VIDEO_IMAGE: 2,
      SHAPES: 3,
      SPRITES: 4,
      TEXT: 5,
      UI_BUTTONS: 6
    };

    // Static layers that get cached
    this.STATIC_LAYERS = ['BG_FAR', 'BG_NEAR'];

    // Store entities for each layer
    this.layerEntities = {};

    // Initialize empty arrays for each layer
    Object.keys(this.LAYERS).forEach(layer => {
      this.layerEntities[layer] = [];
    });

    // OffscreenCanvas for static layer caching
    this.staticCache = null;
    this.staticCtx = null;
    this.needsStaticRedraw = true;

    this._initStaticCache();
  }

  /**
   * Initialize the OffscreenCanvas for static layer caching
   * @private
   */
  _initStaticCache() {
    // Use OffscreenCanvas if available (modern browsers), fallback to regular canvas
    if (typeof OffscreenCanvas !== 'undefined') {
      this.staticCache = new OffscreenCanvas(this.width, this.height);
    } else {
      this.staticCache = document.createElement('canvas');
      this.staticCache.width = this.width;
      this.staticCache.height = this.height;
    }
    this.staticCtx = this.staticCache.getContext('2d');
  }

  /**
   * Add an entity to a specific layer
   * @param {Object} entity - Entity with a render(ctx) method
   * @param {string} layerName - Layer name (e.g., 'SPRITES', 'UI_BUTTONS')
   */
  addToLayer(entity, layerName) {
    if (!this.LAYERS.hasOwnProperty(layerName)) {
      console.warn(`Unknown layer: ${layerName}`);
      return;
    }

    // Avoid duplicates
    if (!this.layerEntities[layerName].includes(entity)) {
      this.layerEntities[layerName].push(entity);

      // Mark static cache dirty if adding to static layer
      if (this.STATIC_LAYERS.includes(layerName)) {
        this.needsStaticRedraw = true;
      }
    }
  }

  /**
   * Remove an entity from a layer
   * @param {Object} entity - Entity to remove
   * @param {string} layerName - Layer name
   */
  removeFromLayer(entity, layerName) {
    if (!this.LAYERS.hasOwnProperty(layerName)) {
      return;
    }

    const index = this.layerEntities[layerName].indexOf(entity);
    if (index > -1) {
      this.layerEntities[layerName].splice(index, 1);

      // Mark static cache dirty if removing from static layer
      if (this.STATIC_LAYERS.includes(layerName)) {
        this.needsStaticRedraw = true;
      }
    }
  }

  /**
   * Clear all entities from a layer
   * @param {string} layerName - Layer name
   */
  clearLayer(layerName) {
    if (this.LAYERS.hasOwnProperty(layerName)) {
      this.layerEntities[layerName] = [];

      if (this.STATIC_LAYERS.includes(layerName)) {
        this.needsStaticRedraw = true;
      }
    }
  }

  /**
   * Clear all layers
   */
  clearAll() {
    Object.keys(this.LAYERS).forEach(layer => {
      this.layerEntities[layer] = [];
    });
    this.needsStaticRedraw = true;
  }

  /**
   * Force a redraw of the static cache (e.g., after window resize)
   */
  invalidateStaticCache() {
    this.needsStaticRedraw = true;
  }

  /**
   * Render all layers in order
   * Static layers are cached and composited; dynamic layers are drawn fresh.
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    // 1. Update static cache if needed
    if (this.needsStaticRedraw) {
      this.staticCtx.clearRect(0, 0, this.width, this.height);

      for (const layerName of this.STATIC_LAYERS) {
        const entities = this.layerEntities[layerName];
        for (const entity of entities) {
          if (entity && typeof entity.render === 'function') {
            entity.render(this.staticCtx);
          }
        }
      }
      this.needsStaticRedraw = false;
    }

    // 2. Composite cached static layers to main canvas
    ctx.drawImage(this.staticCache, 0, 0);

    // 3. Render dynamic layers on top
    const sortedLayers = Object.keys(this.LAYERS).sort(
      (a, b) => this.LAYERS[a] - this.LAYERS[b]
    );

    for (const layerName of sortedLayers) {
      // Skip static layers (already composited)
      if (this.STATIC_LAYERS.includes(layerName)) continue;

      const entities = this.layerEntities[layerName];
      for (const entity of entities) {
        if (entity && typeof entity.render === 'function') {
          entity.render(ctx);
        }
      }
    }
  }
}
