/**
 * ObjectPool - Generic utility for recycling game objects
 * 
 * Prevents garbage collection (GC) spikes by reusing objects instead of
 * creating/destroying them. Essential for mobile performance with particles,
 * bullets, and other high-frequency spawn objects.
 * 
 * Usage:
 *   const leafPool = new ObjectPool(() => new Sprite(...), 30);
 *   
 *   // Spawn
 *   const leaf = leafPool.acquire();
 *   leaf.x = spawnX;
 *   leaf.y = spawnY;
 *   
 *   // Despawn (when off-screen)
 *   leafPool.release(leaf);
 */
export class ObjectPool {
    /**
     * @param {Function} factory - Function that creates a new instance
     * @param {number} initialSize - Number of objects to pre-allocate
     */
    constructor(factory, initialSize = 10) {
        this.factory = factory;
        this.pool = [];

        // Pre-allocate objects
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.factory());
        }
    }

    /**
     * Get an object from the pool (or create new if empty)
     * @returns {Object}
     */
    acquire() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        // Pool empty, create new instance
        return this.factory();
    }

    /**
     * Return an object to the pool for reuse
     * Important: Reset the object's state before or after calling this
     * @param {Object} obj
     */
    release(obj) {
        this.pool.push(obj);
    }

    /**
     * Get current pool size (available objects)
     * @returns {number}
     */
    get available() {
        return this.pool.length;
    }

    /**
     * Clear the pool
     */
    clear() {
        this.pool = [];
    }
}
