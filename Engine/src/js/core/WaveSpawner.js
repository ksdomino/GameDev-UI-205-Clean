/**
 * WaveSpawner - Manages timed enemy/object spawning for action games
 * 
 * Essential for rogue-lite and shoot-em-up genres. Handles:
 * - Timed wave sequences
 * - Spawn positions and patterns
 * - Integration with ObjectPool for performance
 * 
 * Usage:
 *   const spawner = new WaveSpawner(engine);
 *   spawner.defineWave('wave1', {
 *     delay: 0,          // Start immediately
 *     spawnCount: 5,     // 5 enemies
 *     spawnInterval: 500, // 500ms apart
 *     factory: () => enemyPool.acquire(),
 *     positions: [{ x: 100, y: 0 }, { x: 300, y: 0 }, ...] // or 'random'
 *   });
 *   spawner.start('wave1');
 */
export class WaveSpawner {
    constructor(engine) {
        this.engine = engine;
        this.waves = new Map();
        this.activeWaves = [];
        this.onWaveComplete = null; // Callback when a wave finishes
    }

    /**
     * Define a wave configuration
     * @param {string} waveId - Unique identifier for this wave
     * @param {Object} config - Wave configuration
     */
    defineWave(waveId, config) {
        this.waves.set(waveId, {
            delay: config.delay || 0,
            spawnCount: config.spawnCount || 1,
            spawnInterval: config.spawnInterval || 1000,
            factory: config.factory, // Function that returns a spawned entity
            positions: config.positions || 'random',
            onSpawn: config.onSpawn || null, // Callback(entity, index)
            onComplete: config.onComplete || null
        });
    }

    /**
     * Start a wave by ID
     * @param {string} waveId
     */
    start(waveId) {
        const config = this.waves.get(waveId);
        if (!config) {
            console.warn(`[WaveSpawner] Unknown wave: ${waveId}`);
            return;
        }

        const waveState = {
            id: waveId,
            config,
            spawned: 0,
            timer: 0,
            delayComplete: config.delay === 0,
            complete: false
        };

        this.activeWaves.push(waveState);
        console.log(`[WaveSpawner] Starting wave: ${waveId}`);
    }

    /**
     * Update all active waves (call from scene update loop)
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        const dtMs = dt * 1000; // Convert to milliseconds

        for (let i = this.activeWaves.length - 1; i >= 0; i--) {
            const wave = this.activeWaves[i];

            // Handle initial delay
            if (!wave.delayComplete) {
                wave.timer += dtMs;
                if (wave.timer >= wave.config.delay) {
                    wave.delayComplete = true;
                    wave.timer = wave.config.spawnInterval; // Trigger first spawn immediately
                }
                continue;
            }

            // Handle spawning
            wave.timer += dtMs;

            while (wave.timer >= wave.config.spawnInterval && wave.spawned < wave.config.spawnCount) {
                wave.timer -= wave.config.spawnInterval;
                this._spawn(wave);
                wave.spawned++;
            }

            // Check completion
            if (wave.spawned >= wave.config.spawnCount && !wave.complete) {
                wave.complete = true;
                console.log(`[WaveSpawner] Wave complete: ${wave.id}`);

                if (wave.config.onComplete) {
                    wave.config.onComplete(wave.id);
                }
                if (this.onWaveComplete) {
                    this.onWaveComplete(wave.id);
                }

                // Remove from active waves
                this.activeWaves.splice(i, 1);
            }
        }
    }

    /**
     * Spawn a single entity for a wave
     * @private
     */
    _spawn(wave) {
        const entity = wave.config.factory();
        if (!entity) return;

        // Determine position
        let pos;
        if (wave.config.positions === 'random') {
            pos = {
                x: Math.random() * 1080,
                y: -50 // Above screen
            };
        } else if (Array.isArray(wave.config.positions)) {
            const posIndex = wave.spawned % wave.config.positions.length;
            pos = wave.config.positions[posIndex];
        } else {
            pos = { x: 540, y: -50 };
        }

        entity.x = pos.x;
        entity.y = pos.y;

        if (wave.config.onSpawn) {
            wave.config.onSpawn(entity, wave.spawned);
        }
    }

    /**
     * Stop all active waves
     */
    stopAll() {
        this.activeWaves = [];
    }

    /**
     * Check if any waves are currently active
     * @returns {boolean}
     */
    isActive() {
        return this.activeWaves.length > 0;
    }
}
