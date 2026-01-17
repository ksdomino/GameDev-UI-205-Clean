/**
 * TextureAtlas - TexturePacker sprite atlas loader
 * 
 * Part of the Platinum 10 stack asset pipeline.
 * Loads TexturePacker-format JSON + PNG atlases for optimized sprite rendering.
 * 
 * TexturePacker Export Settings:
 *   - Data format: JSON (Array or Hash)
 *   - Texture format: PNG
 *   - Trim: Enabled
 *   - Allow rotation: Disabled (for simplicity)
 * 
 * Usage:
 *   const atlas = new TextureAtlas();
 *   await atlas.load('sprites.json');
 *   
 *   // In render loop:
 *   const frame = atlas.getFrame('player_run_01');
 *   ctx.drawImage(
 *     atlas.image,
 *     frame.x, frame.y, frame.w, frame.h,  // Source
 *     x, y, frame.w, frame.h               // Destination
 *   );
 *   
 *   // Animation helper:
 *   const runFrames = atlas.getAnimation('player_run_', 8);
 */
export class TextureAtlas {
    constructor() {
        this.image = null;
        this.frames = {};
        this.animations = {};
        this.meta = null;
        this.loaded = false;
    }

    /**
     * Load atlas from TexturePacker JSON
     * @param {string} jsonPath - Path to JSON file
     * @returns {Promise<TextureAtlas>}
     */
    async load(jsonPath) {
        try {
            // Fetch JSON
            const response = await fetch(jsonPath);
            if (!response.ok) {
                throw new Error(`Failed to load atlas: ${jsonPath}`);
            }
            const data = await response.json();

            // Store metadata
            this.meta = data.meta;

            // Parse frames (supports both array and hash format)
            this._parseFrames(data.frames);

            // Load image
            const imagePath = this._resolveImagePath(jsonPath, data.meta.image);
            await this._loadImage(imagePath);

            this.loaded = true;
            console.log(`[TextureAtlas] Loaded: ${jsonPath} (${Object.keys(this.frames).length} frames)`);

            return this;
        } catch (error) {
            console.error('[TextureAtlas] Load failed:', error);
            throw error;
        }
    }

    /**
     * Parse frames from TexturePacker data
     * @private
     */
    _parseFrames(frames) {
        // TexturePacker can export as array or object
        if (Array.isArray(frames)) {
            frames.forEach(item => {
                this.frames[item.filename] = this._normalizeFrame(item);
            });
        } else {
            Object.entries(frames).forEach(([name, item]) => {
                this.frames[name] = this._normalizeFrame(item);
            });
        }
    }

    /**
     * Normalize frame data to consistent format
     * @private
     */
    _normalizeFrame(frameData) {
        const frame = frameData.frame || frameData;

        return {
            x: frame.x,
            y: frame.y,
            w: frame.w,
            h: frame.h,
            // Original size (before trim)
            sourceW: frameData.sourceSize?.w || frame.w,
            sourceH: frameData.sourceSize?.h || frame.h,
            // Trim offset
            offsetX: frameData.spriteSourceSize?.x || 0,
            offsetY: frameData.spriteSourceSize?.y || 0,
            // Rotation (we don't handle this, but store it)
            rotated: frameData.rotated || false,
            trimmed: frameData.trimmed || false
        };
    }

    /**
     * Resolve image path relative to JSON
     * @private
     */
    _resolveImagePath(jsonPath, imageName) {
        const lastSlash = jsonPath.lastIndexOf('/');
        const basePath = lastSlash >= 0 ? jsonPath.substring(0, lastSlash + 1) : '';
        return basePath + imageName;
    }

    /**
     * Load image
     * @private
     */
    _loadImage(path) {
        return new Promise((resolve, reject) => {
            this.image = new Image();
            this.image.onload = resolve;
            this.image.onerror = () => reject(new Error(`Failed to load image: ${path}`));
            this.image.src = path;
        });
    }

    /**
     * Get a single frame by name
     * @param {string} frameName
     * @returns {Object|null} Frame data { x, y, w, h, ... }
     */
    getFrame(frameName) {
        // Try exact match first
        if (this.frames[frameName]) {
            return this.frames[frameName];
        }

        // Try with common extensions
        for (const ext of ['.png', '.jpg', '']) {
            if (this.frames[frameName + ext]) {
                return this.frames[frameName + ext];
            }
        }

        console.warn(`[TextureAtlas] Frame not found: ${frameName}`);
        return null;
    }

    /**
     * Get array of frames for an animation
     * @param {string} prefix - Frame name prefix (e.g., 'player_run_')
     * @param {number} count - Number of frames (or 0 to auto-detect)
     * @returns {Array} Array of frame objects
     */
    getAnimation(prefix, count = 0) {
        // Check cache
        const cacheKey = `${prefix}${count}`;
        if (this.animations[cacheKey]) {
            return this.animations[cacheKey];
        }

        const frames = [];

        if (count > 0) {
            // Specific count requested
            for (let i = 0; i < count; i++) {
                const paddedNum = String(i).padStart(2, '0');
                const frame = this.getFrame(`${prefix}${paddedNum}`) ||
                    this.getFrame(`${prefix}${i}`);
                if (frame) {
                    frames.push(frame);
                }
            }
        } else {
            // Auto-detect frames with this prefix
            Object.keys(this.frames)
                .filter(name => name.startsWith(prefix))
                .sort()
                .forEach(name => {
                    frames.push(this.frames[name]);
                });
        }

        // Cache and return
        this.animations[cacheKey] = frames;
        return frames;
    }

    /**
     * Draw a frame to canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} frameName
     * @param {number} x - Destination X
     * @param {number} y - Destination Y
     * @param {number} scale - Optional scale
     */
    drawFrame(ctx, frameName, x, y, scale = 1) {
        const frame = this.getFrame(frameName);
        if (!frame || !this.image) return;

        ctx.drawImage(
            this.image,
            frame.x, frame.y, frame.w, frame.h,
            x + (frame.offsetX * scale),
            y + (frame.offsetY * scale),
            frame.w * scale,
            frame.h * scale
        );
    }

    /**
     * Check if atlas is loaded
     * @returns {boolean}
     */
    isLoaded() {
        return this.loaded;
    }

    /**
     * Get all frame names
     * @returns {Array<string>}
     */
    getFrameNames() {
        return Object.keys(this.frames);
    }

    /**
     * Get atlas size
     * @returns {Object} { width, height }
     */
    getSize() {
        return {
            width: this.meta?.size?.w || this.image?.width || 0,
            height: this.meta?.size?.h || this.image?.height || 0
        };
    }
}
