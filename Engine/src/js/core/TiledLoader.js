/**
 * TiledLoader - Tiled map editor JSON loader
 * 
 * Part of the Platinum 10 stack. Loads Tiled maps in JSON format (.tmj).
 * 
 * Tiled Export Settings:
 *   - Format: JSON map files
 *   - Tile layer format: CSV or Base64 (uncompressed)
 *   - Embed tilesets: Yes (simpler) or No (reference external TSX)
 * 
 * Usage:
 *   const loader = new TiledLoader();
 *   const map = await loader.load('level1.tmj');
 *   
 *   // Render layer:
 *   map.renderLayer(ctx, 'ground', tileset);
 *   
 *   // Get objects:
 *   const enemies = map.getObjects('enemies');
 */
export class TiledLoader {
    constructor() {
        this.maps = {};
    }

    /**
     * Load a Tiled map from JSON
     * @param {string} path - Path to .tmj file
     * @returns {Promise<TiledMap>}
     */
    async load(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load map: ${path}`);
            }
            const data = await response.json();

            const map = new TiledMap(data, path);
            this.maps[path] = map;

            console.log(`[TiledLoader] Loaded: ${path} (${map.width}x${map.height} tiles)`);
            return map;
        } catch (error) {
            console.error('[TiledLoader] Load failed:', error);
            throw error;
        }
    }

    /**
     * Get a previously loaded map
     * @param {string} path
     * @returns {TiledMap|null}
     */
    getMap(path) {
        return this.maps[path] || null;
    }
}

/**
 * TiledMap - Represents a loaded Tiled map
 */
export class TiledMap {
    constructor(data, path) {
        this.data = data;
        this.path = path;

        // Map properties
        this.width = data.width;
        this.height = data.height;
        this.tileWidth = data.tilewidth;
        this.tileHeight = data.tileheight;

        // Pixel dimensions
        this.pixelWidth = this.width * this.tileWidth;
        this.pixelHeight = this.height * this.tileHeight;

        // Parse layers
        this.layers = {};
        this.tileLayers = [];
        this.objectLayers = [];

        data.layers.forEach(layer => {
            this.layers[layer.name] = layer;
            if (layer.type === 'tilelayer') {
                this.tileLayers.push(layer);
            } else if (layer.type === 'objectgroup') {
                this.objectLayers.push(layer);
            }
        });

        // Parse tilesets
        this.tilesets = data.tilesets || [];
    }

    /**
     * Get a layer by name
     * @param {string} name
     * @returns {Object|null}
     */
    getLayer(name) {
        return this.layers[name] || null;
    }

    /**
     * Get tile at position in a layer
     * @param {string} layerName
     * @param {number} x - Tile X coordinate
     * @param {number} y - Tile Y coordinate
     * @returns {number} Tile ID (0 = empty)
     */
    getTileAt(layerName, x, y) {
        const layer = this.layers[layerName];
        if (!layer || layer.type !== 'tilelayer') return 0;

        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;

        const index = y * this.width + x;
        return layer.data[index] || 0;
    }

    /**
     * Set tile at position (for runtime modification)
     * @param {string} layerName
     * @param {number} x
     * @param {number} y
     * @param {number} tileId
     */
    setTileAt(layerName, x, y, tileId) {
        const layer = this.layers[layerName];
        if (!layer || layer.type !== 'tilelayer') return;

        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

        const index = y * this.width + x;
        layer.data[index] = tileId;
    }

    /**
     * Get objects from an object layer
     * @param {string} layerName
     * @returns {Array}
     */
    getObjects(layerName) {
        const layer = this.layers[layerName];
        if (!layer || layer.type !== 'objectgroup') return [];

        return layer.objects.map(obj => ({
            id: obj.id,
            name: obj.name,
            type: obj.type || obj.class, // Tiled uses 'type' or 'class'
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
            rotation: obj.rotation || 0,
            visible: obj.visible !== false,
            properties: this._parseProperties(obj.properties)
        }));
    }

    /**
     * Get objects of a specific type
     * @param {string} layerName
     * @param {string} type
     * @returns {Array}
     */
    getObjectsByType(layerName, type) {
        return this.getObjects(layerName).filter(obj => obj.type === type);
    }

    /**
     * Parse Tiled custom properties
     * @private
     */
    _parseProperties(props) {
        if (!props) return {};

        const result = {};
        props.forEach(p => {
            result[p.name] = p.value;
        });
        return result;
    }

    /**
     * Get tileset for a tile ID
     * @param {number} tileId
     * @returns {Object|null} Tileset info
     */
    getTilesetForTile(tileId) {
        // Tilesets are sorted by firstgid
        for (let i = this.tilesets.length - 1; i >= 0; i--) {
            const ts = this.tilesets[i];
            if (tileId >= ts.firstgid) {
                return {
                    tileset: ts,
                    localId: tileId - ts.firstgid
                };
            }
        }
        return null;
    }

    /**
     * Render a tile layer to canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} layerName
     * @param {Image} tilesetImage - Image containing tiles
     * @param {number} offsetX - Camera offset X
     * @param {number} offsetY - Camera offset Y
     */
    renderLayer(ctx, layerName, tilesetImage, offsetX = 0, offsetY = 0) {
        const layer = this.layers[layerName];
        if (!layer || layer.type !== 'tilelayer') return;
        if (!layer.visible) return;

        const tilesPerRow = Math.ceil(tilesetImage.width / this.tileWidth);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tileId = layer.data[y * this.width + x];
                if (tileId === 0) continue; // Empty tile

                // Get local tile ID (subtract firstgid)
                const tsInfo = this.getTilesetForTile(tileId);
                if (!tsInfo) continue;

                const localId = tsInfo.localId;
                const srcX = (localId % tilesPerRow) * this.tileWidth;
                const srcY = Math.floor(localId / tilesPerRow) * this.tileHeight;

                const destX = x * this.tileWidth - offsetX;
                const destY = y * this.tileHeight - offsetY;

                // Culling - skip tiles outside viewport
                if (destX + this.tileWidth < 0 || destX > ctx.canvas.width) continue;
                if (destY + this.tileHeight < 0 || destY > ctx.canvas.height) continue;

                ctx.drawImage(
                    tilesetImage,
                    srcX, srcY, this.tileWidth, this.tileHeight,
                    destX, destY, this.tileWidth, this.tileHeight
                );
            }
        }
    }

    /**
     * Check collision with a layer
     * @param {string} layerName
     * @param {number} x - World X
     * @param {number} y - World Y
     * @param {number} width - Entity width
     * @param {number} height - Entity height
     * @returns {boolean} True if collision
     */
    checkCollision(layerName, x, y, width, height) {
        const startX = Math.floor(x / this.tileWidth);
        const startY = Math.floor(y / this.tileHeight);
        const endX = Math.floor((x + width) / this.tileWidth);
        const endY = Math.floor((y + height) / this.tileHeight);

        for (let ty = startY; ty <= endY; ty++) {
            for (let tx = startX; tx <= endX; tx++) {
                const tileId = this.getTileAt(layerName, tx, ty);
                if (tileId !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get map custom properties
     * @returns {Object}
     */
    getProperties() {
        return this._parseProperties(this.data.properties);
    }
}
