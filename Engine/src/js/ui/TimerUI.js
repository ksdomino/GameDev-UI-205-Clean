/**
 * TimerUI - Countdown/count-up timer display for survival games
 * 
 * Essential for rogue-lite games where survival time matters.
 * Supports countdown (survive 5 minutes) or count-up (track run time).
 * 
 * Usage:
 *   // Countdown mode (survival timer)
 *   const timer = new TimerUI(engine, { 
 *     mode: 'countdown', 
 *     duration: 300, // 5 minutes
 *     onComplete: () => showVictoryScreen()
 *   });
 *   
 *   // Count-up mode (run timer)
 *   const timer = new TimerUI(engine, { mode: 'countup' });
 *   
 *   // In game loop:
 *   timer.update(dt);
 *   timer.render(ctx);
 */
export class TimerUI {
    /**
     * @param {Object} engine - Engine instance
     * @param {Object} options - Configuration
     */
    constructor(engine, options = {}) {
        this.engine = engine;

        // Mode: 'countdown' or 'countup'
        this.mode = options.mode || 'countup';
        this.duration = options.duration || 300; // Default 5 minutes for countdown

        // State
        this.time = this.mode === 'countdown' ? this.duration : 0;
        this.isRunning = false;
        this.isPaused = false;
        this.isComplete = false;

        // Callbacks
        this.onComplete = options.onComplete || null;
        this.onTick = options.onTick || null; // Called every second

        // Visual positioning
        this.x = options.x ?? 540; // Center by default
        this.y = options.y ?? 100;

        // Visual styling
        this.font = options.font || 'bold 64px Arial';
        this.color = options.color || '#ffffff';
        this.warningColor = options.warningColor || '#ff4444';
        this.warningThreshold = options.warningThreshold || 30; // Seconds

        // Track last second for onTick
        this._lastSecond = Math.floor(this.time);
    }

    /**
     * Start the timer
     */
    start() {
        this.isRunning = true;
        this.isPaused = false;
    }

    /**
     * Pause the timer
     */
    pause() {
        this.isPaused = true;
    }

    /**
     * Resume from pause
     */
    resume() {
        this.isPaused = false;
    }

    /**
     * Stop the timer
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Reset the timer
     */
    reset() {
        this.time = this.mode === 'countdown' ? this.duration : 0;
        this.isComplete = false;
        this._lastSecond = Math.floor(this.time);
    }

    /**
     * Get current time in seconds
     * @returns {number}
     */
    getTime() {
        return this.time;
    }

    /**
     * Get formatted time string (MM:SS)
     * @returns {string}
     */
    getFormattedTime() {
        const totalSeconds = Math.max(0, Math.floor(this.time));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Update timer
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.isRunning || this.isPaused || this.isComplete) return;

        if (this.mode === 'countdown') {
            this.time -= dt;

            if (this.time <= 0) {
                this.time = 0;
                this.isComplete = true;
                this.isRunning = false;

                if (this.onComplete) {
                    this.onComplete();
                }
            }
        } else {
            this.time += dt;
        }

        // Check for second tick
        const currentSecond = Math.floor(this.time);
        if (currentSecond !== this._lastSecond) {
            this._lastSecond = currentSecond;

            if (this.onTick) {
                this.onTick(currentSecond);
            }
        }
    }

    /**
     * Render the timer
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        ctx.save();

        // Determine color (warning for countdown near end)
        let textColor = this.color;
        if (this.mode === 'countdown' && this.time <= this.warningThreshold) {
            textColor = this.warningColor;
        }

        // Add pulsing effect in warning state
        if (this.mode === 'countdown' && this.time <= 10 && this.time > 0) {
            const pulse = 0.7 + 0.3 * Math.sin(this.time * Math.PI * 2);
            ctx.globalAlpha = pulse;
        }

        ctx.fillStyle = textColor;
        ctx.font = this.font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(this.getFormattedTime(), this.x, this.y);

        ctx.restore();
    }
}
