/**
 * CameraEffects - Screen shake and camera manipulation for game juice
 * 
 * Provides impact feedback through screen shake and other camera effects.
 * Uses ctx.translate() to offset rendering.
 * 
 * Usage:
 *   const camera = new CameraEffects(engine);
 *   
 *   // When player takes damage:
 *   camera.shake(10, 0.3); // intensity 10, duration 0.3s
 *   
 *   // Before rendering:
 *   camera.applyTransform(ctx);
 *   // ... render game ...
 *   camera.resetTransform(ctx);
 */
export class CameraEffects {
    /**
     * @param {Object} engine - Engine instance
     */
    constructor(engine) {
        this.engine = engine;

        // Screen shake state
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTime = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.shakeDecay = true;

        // Permanent offset (for tracking/following)
        this.offsetX = 0;
        this.offsetY = 0;

        // Zoom (1.0 = normal)
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.zoomSpeed = 5;

        // Trauma-based shake (alternative to duration-based)
        this.trauma = 0;
        this.traumaDecay = 2; // Trauma per second to remove

        // Saved transform for nesting
        this._transformApplied = false;
    }

    /**
     * Start a screen shake effect
     * @param {number} intensity - Shake intensity in pixels
     * @param {number} duration - Duration in seconds
     * @param {boolean} decay - Whether intensity decays over time
     */
    shake(intensity, duration, decay = true) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTime = 0;
        this.shakeDecay = decay;
    }

    /**
     * Add trauma (accumulative shake system)
     * Trauma^2 is used as shake intensity for natural feel
     * @param {number} amount - Trauma to add (0-1)
     */
    addTrauma(amount) {
        this.trauma = Math.min(1, this.trauma + amount);
    }

    /**
     * Instantly stop all shake effects
     */
    stopShake() {
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.trauma = 0;
    }

    /**
     * Set camera offset (for following targets)
     * @param {number} x
     * @param {number} y
     */
    setOffset(x, y) {
        this.offsetX = x;
        this.offsetY = y;
    }

    /**
     * Smoothly follow a target position
     * @param {number} targetX
     * @param {number} targetY
     * @param {number} speed - Follow speed (0-1, lower = smoother)
     * @param {number} dt - Delta time
     */
    followTarget(targetX, targetY, speed = 0.1, dt) {
        const dx = targetX - this.offsetX;
        const dy = targetY - this.offsetY;
        this.offsetX += dx * speed;
        this.offsetY += dy * speed;
    }

    /**
     * Set target zoom level
     * @param {number} zoom - Target zoom (1.0 = normal)
     */
    setZoom(zoom) {
        this.targetZoom = zoom;
    }

    /**
     * Update camera effects
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Update duration-based shake
        if (this.shakeDuration > 0) {
            this.shakeTime += dt;

            if (this.shakeTime >= this.shakeDuration) {
                this.shakeIntensity = 0;
                this.shakeDuration = 0;
                this.shakeOffsetX = 0;
                this.shakeOffsetY = 0;
            } else {
                // Calculate current intensity
                let intensity = this.shakeIntensity;
                if (this.shakeDecay) {
                    const progress = this.shakeTime / this.shakeDuration;
                    intensity *= (1 - progress);
                }

                // Random offset
                this.shakeOffsetX = (Math.random() - 0.5) * 2 * intensity;
                this.shakeOffsetY = (Math.random() - 0.5) * 2 * intensity;
            }
        }

        // Update trauma-based shake
        if (this.trauma > 0) {
            // Decay trauma
            this.trauma = Math.max(0, this.trauma - this.traumaDecay * dt);

            // Trauma squared for natural falloff
            const traumaIntensity = this.trauma * this.trauma * 20;
            this.shakeOffsetX = (Math.random() - 0.5) * 2 * traumaIntensity;
            this.shakeOffsetY = (Math.random() - 0.5) * 2 * traumaIntensity;
        }

        // Smooth zoom towards target
        if (this.zoom !== this.targetZoom) {
            const diff = this.targetZoom - this.zoom;
            this.zoom += diff * this.zoomSpeed * dt;

            // Snap if close enough
            if (Math.abs(diff) < 0.01) {
                this.zoom = this.targetZoom;
            }
        }
    }

    /**
     * Apply camera transform before rendering
     * @param {CanvasRenderingContext2D} ctx
     */
    applyTransform(ctx) {
        if (this._transformApplied) return;

        ctx.save();

        // Apply shake offset
        const totalOffsetX = this.shakeOffsetX - this.offsetX;
        const totalOffsetY = this.shakeOffsetY - this.offsetY;

        if (this.zoom !== 1.0) {
            // Zoom from center
            ctx.translate(540, 960); // Center of 1080x1920
            ctx.scale(this.zoom, this.zoom);
            ctx.translate(-540, -960);
        }

        ctx.translate(totalOffsetX, totalOffsetY);

        this._transformApplied = true;
    }

    /**
     * Reset camera transform after rendering
     * @param {CanvasRenderingContext2D} ctx
     */
    resetTransform(ctx) {
        if (!this._transformApplied) return;

        ctx.restore();
        this._transformApplied = false;
    }

    /**
     * Get current shake offset (for UI elements that shouldn't shake)
     * @returns {Object} { x, y }
     */
    getShakeOffset() {
        return {
            x: this.shakeOffsetX,
            y: this.shakeOffsetY
        };
    }

    /**
     * Check if camera is currently shaking
     * @returns {boolean}
     */
    isShaking() {
        return this.shakeDuration > 0 || this.trauma > 0;
    }
}
