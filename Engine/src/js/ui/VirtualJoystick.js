/**
 * VirtualJoystick - Touch-based joystick for twin-stick controls
 * 
 * Essential for action games (rogue-lites, shooters, beat-em-ups).
 * Renders a circular joystick UI and provides normalized direction output.
 * 
 * Usage:
 *   const joystick = new VirtualJoystick(engine, { side: 'left', size: 200 });
 *   
 *   // In update loop:
 *   const dir = joystick.getDirection(); // { x: -1 to 1, y: -1 to 1 }
 *   player.x += dir.x * speed * dt;
 *   player.y += dir.y * speed * dt;
 */
export class VirtualJoystick {
    /**
     * @param {Object} engine - Engine instance
     * @param {Object} options - Configuration options
     * @param {string} options.side - 'left' or 'right' (default: 'left')
     * @param {number} options.size - Diameter of joystick base (default: 200)
     * @param {number} options.deadzone - Center deadzone radius 0-1 (default: 0.1)
     */
    constructor(engine, options = {}) {
        this.engine = engine;
        this.side = options.side || 'left';
        this.size = options.size || 200;
        this.deadzone = options.deadzone || 0.1;

        // Visual styling
        this.baseColor = 'rgba(255, 255, 255, 0.3)';
        this.stickColor = 'rgba(255, 255, 255, 0.7)';
        this.stickRadius = this.size * 0.2;

        // State
        this.isActive = false;
        this.touchId = null;
        this.baseX = 0;
        this.baseY = 0;
        this.stickX = 0;
        this.stickY = 0;

        // Calculate default position based on side
        this._updatePosition();

        // Bind touch handlers
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);

        this._setupListeners();
    }

    /**
     * Update joystick position based on screen size
     * @private
     */
    _updatePosition() {
        const margin = this.size * 0.7;
        this.baseY = 1920 - margin - this.size / 2;

        if (this.side === 'left') {
            this.baseX = margin + this.size / 2;
        } else {
            this.baseX = 1080 - margin - this.size / 2;
        }

        this.stickX = this.baseX;
        this.stickY = this.baseY;
    }

    /**
     * Set up touch event listeners
     * @private
     */
    _setupListeners() {
        const canvas = this.engine.canvas;
        canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
        canvas.addEventListener('touchend', this._onTouchEnd);
        canvas.addEventListener('touchcancel', this._onTouchEnd);
    }

    /**
     * Handle touch start
     * @private
     */
    _onTouchStart(e) {
        if (this.isActive) return;

        for (const touch of e.changedTouches) {
            const pos = this.engine.inputHandler.screenToCanvas(touch.clientX, touch.clientY);

            // Check if touch is in joystick zone
            const dx = pos.x - this.baseX;
            const dy = pos.y - this.baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= this.size) {
                e.preventDefault();
                this.isActive = true;
                this.touchId = touch.identifier;
                this.stickX = pos.x;
                this.stickY = pos.y;
                this._clampStick();
                break;
            }
        }
    }

    /**
     * Handle touch move
     * @private
     */
    _onTouchMove(e) {
        if (!this.isActive) return;

        for (const touch of e.changedTouches) {
            if (touch.identifier === this.touchId) {
                e.preventDefault();
                const pos = this.engine.inputHandler.screenToCanvas(touch.clientX, touch.clientY);
                this.stickX = pos.x;
                this.stickY = pos.y;
                this._clampStick();
                break;
            }
        }
    }

    /**
     * Handle touch end
     * @private
     */
    _onTouchEnd(e) {
        for (const touch of e.changedTouches) {
            if (touch.identifier === this.touchId) {
                this.isActive = false;
                this.touchId = null;
                this.stickX = this.baseX;
                this.stickY = this.baseY;
                break;
            }
        }
    }

    /**
     * Clamp stick position to joystick radius
     * @private
     */
    _clampStick() {
        const dx = this.stickX - this.baseX;
        const dy = this.stickY - this.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.size / 2;

        if (dist > maxDist) {
            const angle = Math.atan2(dy, dx);
            this.stickX = this.baseX + Math.cos(angle) * maxDist;
            this.stickY = this.baseY + Math.sin(angle) * maxDist;
        }
    }

    /**
     * Get normalized direction (-1 to 1 on each axis)
     * @returns {Object} { x, y, magnitude }
     */
    getDirection() {
        const dx = this.stickX - this.baseX;
        const dy = this.stickY - this.baseY;
        const maxDist = this.size / 2;

        let magnitude = Math.sqrt(dx * dx + dy * dy) / maxDist;

        // Apply deadzone
        if (magnitude < this.deadzone) {
            return { x: 0, y: 0, magnitude: 0 };
        }

        // Normalize deadzone to 0-1 range
        magnitude = (magnitude - this.deadzone) / (1 - this.deadzone);
        magnitude = Math.min(magnitude, 1);

        const angle = Math.atan2(dy, dx);

        return {
            x: Math.cos(angle) * magnitude,
            y: Math.sin(angle) * magnitude,
            magnitude
        };
    }

    /**
     * Check if joystick is currently being used
     * @returns {boolean}
     */
    isPressed() {
        return this.isActive;
    }

    /**
     * Render the joystick
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        // Base circle
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = this.baseColor;
        ctx.fill();

        // Stick circle
        ctx.beginPath();
        ctx.arc(this.stickX, this.stickY, this.stickRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.stickColor;
        ctx.fill();
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        const canvas = this.engine.canvas;
        canvas.removeEventListener('touchstart', this._onTouchStart);
        canvas.removeEventListener('touchmove', this._onTouchMove);
        canvas.removeEventListener('touchend', this._onTouchEnd);
        canvas.removeEventListener('touchcancel', this._onTouchEnd);
    }
}
