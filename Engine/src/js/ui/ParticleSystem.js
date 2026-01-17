/**
 * ParticleSystem - Lightweight particle effects for visual polish
 * 
 * Essential for game juice: explosions, pickups, hit effects.
 * Uses ObjectPool internally for performance.
 * 
 * Usage:
 *   const particles = new ParticleSystem(engine);
 *   
 *   // Create explosion effect
 *   particles.emit({
 *     x: enemy.x,
 *     y: enemy.y,
 *     count: 20,
 *     speed: 200,
 *     color: '#ff4444',
 *     lifetime: 0.5
 *   });
 *   
 *   // In game loop:
 *   particles.update(dt);
 *   particles.render(ctx);
 */
export class ParticleSystem {
    /**
     * @param {Object} engine - Engine instance
     * @param {number} maxParticles - Maximum particles in pool
     */
    constructor(engine, maxParticles = 500) {
        this.engine = engine;
        this.maxParticles = maxParticles;

        // Particle pool
        this.particles = [];
        this.activeCount = 0;

        // Pre-allocate particles
        for (let i = 0; i < maxParticles; i++) {
            this.particles.push(this._createParticle());
        }
    }

    /**
     * Create a new particle object
     * @private
     */
    _createParticle() {
        return {
            active: false,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            size: 5,
            color: '#ffffff',
            alpha: 1,
            lifetime: 1,
            age: 0,
            gravity: 0,
            friction: 1,
            shrink: true
        };
    }

    /**
     * Get an inactive particle from pool
     * @private
     */
    _getParticle() {
        for (let i = 0; i < this.maxParticles; i++) {
            if (!this.particles[i].active) {
                return this.particles[i];
            }
        }
        return null; // Pool exhausted
    }

    /**
     * Emit particles at a position
     * @param {Object} config - Emission configuration
     */
    emit(config) {
        const {
            x = 0,
            y = 0,
            count = 10,
            speed = 100,
            speedVariance = 0.5,
            angle = 0,
            spread = Math.PI * 2, // Full circle by default
            size = 5,
            sizeVariance = 0.5,
            color = '#ffffff',
            colors = null, // Array of colors to pick from
            lifetime = 1,
            lifetimeVariance = 0.3,
            gravity = 0,
            friction = 0.98,
            shrink = true
        } = config;

        for (let i = 0; i < count; i++) {
            const particle = this._getParticle();
            if (!particle) break;

            // Random angle within spread
            const particleAngle = angle + (Math.random() - 0.5) * spread;

            // Random speed with variance
            const particleSpeed = speed * (1 + (Math.random() - 0.5) * speedVariance * 2);

            // Initialize particle
            particle.active = true;
            particle.x = x;
            particle.y = y;
            particle.vx = Math.cos(particleAngle) * particleSpeed;
            particle.vy = Math.sin(particleAngle) * particleSpeed;
            particle.size = size * (1 + (Math.random() - 0.5) * sizeVariance * 2);
            particle.color = colors ? colors[Math.floor(Math.random() * colors.length)] : color;
            particle.alpha = 1;
            particle.lifetime = lifetime * (1 + (Math.random() - 0.5) * lifetimeVariance * 2);
            particle.age = 0;
            particle.gravity = gravity;
            particle.friction = friction;
            particle.shrink = shrink;

            this.activeCount++;
        }
    }

    /**
     * Emit a burst effect (common presets)
     * @param {string} type - 'explosion', 'sparkle', 'blood', 'coins'
     * @param {number} x
     * @param {number} y
     */
    burst(type, x, y) {
        const presets = {
            explosion: {
                count: 30,
                speed: 300,
                colors: ['#ff4444', '#ff8800', '#ffff00'],
                lifetime: 0.4,
                gravity: 200,
                size: 8
            },
            sparkle: {
                count: 15,
                speed: 150,
                color: '#ffff88',
                lifetime: 0.6,
                gravity: -50,
                size: 4
            },
            blood: {
                count: 20,
                speed: 200,
                colors: ['#ff0000', '#cc0000', '#880000'],
                lifetime: 0.5,
                gravity: 500,
                size: 6
            },
            coins: {
                count: 8,
                speed: 250,
                color: '#ffd700',
                lifetime: 0.8,
                gravity: 400,
                size: 10
            },
            levelUp: {
                count: 40,
                speed: 200,
                colors: ['#4ade80', '#22c55e', '#86efac'],
                lifetime: 0.8,
                gravity: -100,
                size: 6
            },
            hit: {
                count: 8,
                speed: 150,
                color: '#ffffff',
                lifetime: 0.2,
                size: 4
            }
        };

        const preset = presets[type];
        if (preset) {
            this.emit({ ...preset, x, y });
        }
    }

    /**
     * Update all active particles
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        this.activeCount = 0;

        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particles[i];
            if (!p.active) continue;

            // Age particle
            p.age += dt;
            if (p.age >= p.lifetime) {
                p.active = false;
                continue;
            }

            // Apply physics
            p.vy += p.gravity * dt;
            p.vx *= p.friction;
            p.vy *= p.friction;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Fade and shrink
            const lifeRatio = 1 - (p.age / p.lifetime);
            p.alpha = lifeRatio;
            if (p.shrink) {
                p.currentSize = p.size * lifeRatio;
            } else {
                p.currentSize = p.size;
            }

            this.activeCount++;
        }
    }

    /**
     * Render all active particles
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        ctx.save();

        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particles[i];
            if (!p.active) continue;

            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;

            const size = p.currentSize || p.size;
            ctx.fillRect(
                p.x - size / 2,
                p.y - size / 2,
                size,
                size
            );
        }

        ctx.restore();
    }

    /**
     * Clear all particles
     */
    clear() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles[i].active = false;
        }
        this.activeCount = 0;
    }

    /**
     * Get active particle count
     * @returns {number}
     */
    getActiveCount() {
        return this.activeCount;
    }
}
