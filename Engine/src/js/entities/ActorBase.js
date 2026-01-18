/**
 * @fileoverview ActorBase - Base class for visual-scripted actors
 * @context Engine/llms.txt
 * 
 * This is the standard interface for actors that use the GameDev UI
 * visual scripting system. It connects to LogicInterpreter for events
 * and VariableManager for state.
 */

import { Sprite } from './Sprite.js';

export class ActorBase extends Sprite {
    /**
     * @param {string} actorId - The actor type ID (e.g., "Ball")
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    constructor(actorId, x = 0, y = 0, width = 64, height = 64) {
        super(x, y, width, height);

        this.actorId = actorId;
        this.instanceId = `${actorId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        // Position (center-based for visual scripting compatibility)
        this.x = x;
        this.y = y;
        this.startX = x;  // For ResetPosition
        this.startY = y;

        // Per-instance variables (created from VariableManager)
        this.variables = {};

        // Tag for collision filtering
        this.tag = actorId.toLowerCase();

        // References set by scene
        this.logicInterpreter = null;
        this.variableManager = null;
        this.audioManager = null;
        this.gameState = null;

        // Collision state
        this.collidedWith = new Set(); // Track what we've collided with this frame
    }

    /**
     * Initialize the actor with engine components
     * @param {LogicInterpreter} logicInterpreter 
     * @param {VariableManager} variableManager 
     * @param {AudioManager} audioManager 
     * @param {Object} gameState 
     */
    init(logicInterpreter, variableManager, audioManager, gameState) {
        this.logicInterpreter = logicInterpreter;
        this.variableManager = variableManager;
        this.audioManager = audioManager;
        this.gameState = gameState;

        // Initialize variables from VariableManager
        if (variableManager) {
            this.variables = variableManager.createInstance(this.actorId, this.instanceId);
        }
    }

    /**
     * Update the actor (called every frame)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        if (!this.active) return;

        // Execute OnUpdate logic
        if (this.logicInterpreter) {
            this.logicInterpreter.executeOnUpdate(
                this.actorId,
                this,
                deltaTime,
                this.getContext(deltaTime)
            );
        }

        // Clear collision tracking for next frame
        this.collidedWith.clear();
    }

    /**
     * Handle collision with another actor
     * @param {ActorBase|Object} other - The other actor
     * @param {string} otherTag - Tag of the other actor
     */
    onCollision(other, otherTag = null) {
        if (!this.active) return;

        const tag = otherTag || other.tag || 'unknown';

        // Prevent duplicate collision events per frame
        const collisionKey = other.instanceId || `${tag}_${other.x}_${other.y}`;
        if (this.collidedWith.has(collisionKey)) return;
        this.collidedWith.add(collisionKey);

        // Execute OnCollision logic
        if (this.logicInterpreter) {
            this.logicInterpreter.executeOnCollision(
                this.actorId,
                this,
                other,
                tag,
                this.getContext()
            );
        }
    }

    /**
     * Handle out of bounds
     * @param {string} edge - "top", "bottom", "left", "right"
     */
    onOutOfBounds(edge) {
        if (!this.active) return;

        if (this.logicInterpreter) {
            this.logicInterpreter.executeOnOutOfBounds(
                this.actorId,
                this,
                edge,
                this.getContext()
            );
        }
    }

    /**
     * Check if actor is out of bounds
     * @param {number} canvasWidth 
     * @param {number} canvasHeight 
     * @returns {string|null} - Edge that was crossed, or null
     */
    checkBounds(canvasWidth = 1080, canvasHeight = 1920) {
        if (this.y < 0) return 'top';
        if (this.y > canvasHeight) return 'bottom';
        if (this.x < 0) return 'left';
        if (this.x > canvasWidth) return 'right';
        return null;
    }

    /**
     * Get execution context for logic interpreter
     * @param {number} deltaTime 
     * @returns {Object}
     */
    getContext(deltaTime = 0.016) {
        return {
            deltaTime,
            audioManager: this.audioManager,
            gameState: this.gameState,
            variableManager: this.variableManager
        };
    }

    /**
     * Get a variable value
     * @param {string} varName 
     * @returns {*}
     */
    getVariable(varName) {
        return this.variables[varName];
    }

    /**
     * Set a variable value
     * @param {string} varName 
     * @param {*} value 
     */
    setVariable(varName, value) {
        if (this.variableManager) {
            this.variableManager.set(this.actorId, varName, value, this.variables);
        } else {
            this.variables[varName] = value;
        }
    }

    /**
     * Reset to starting position
     */
    reset() {
        this.x = this.startX;
        this.y = this.startY;

        // Re-initialize variables to defaults
        if (this.variableManager) {
            this.variables = this.variableManager.createInstance(this.actorId, this.instanceId);
        }
    }

    /**
     * Render the actor
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        if (!this.visible) return;

        // Use color from variables if available
        const color = this.variables.color || this.color;
        const size = this.variables.size || this.width;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;
        ctx.scale(this.scaleX, this.scaleY);

        if (this.image) {
            ctx.drawImage(
                this.image,
                -size / 2,
                -size / 2,
                size,
                size
            );
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(-size / 2, -size / 2, size, size);
        }

        ctx.restore();
    }
}
