/**
 * XPSystem - Experience points and leveling for rogue-lite games
 * 
 * Tracks XP collection, triggers level-ups, and integrates with UpgradeModal.
 * Core mechanic for Vampire Survivors-style games.
 * 
 * Usage:
 *   const xp = new XPSystem(engine, {
 *     xpPerLevel: 100,    // XP needed for first level
 *     levelScaling: 1.2,  // Each level needs 20% more XP
 *     onLevelUp: (level) => upgradeModal.show(...)
 *   });
 *   
 *   // When player collects XP gem:
 *   xp.addXP(10);
 *   
 *   // In update loop:
 *   xp.update(dt);
 */
export class XPSystem {
    /**
     * @param {Object} engine - Engine instance
     * @param {Object} options - Configuration
     */
    constructor(engine, options = {}) {
        this.engine = engine;

        // Configuration
        this.baseXPPerLevel = options.xpPerLevel || 100;
        this.levelScaling = options.levelScaling || 1.2;
        this.maxLevel = options.maxLevel || 99;

        // Callbacks
        this.onLevelUp = options.onLevelUp || null;
        this.onXPGain = options.onXPGain || null;

        // State
        this.level = 1;
        this.currentXP = 0;
        this.totalXP = 0;

        // Level-up queue (for multiple level-ups from single pickup)
        this.pendingLevelUps = 0;
        this.isProcessingLevelUp = false;

        // Visual feedback
        this.showXPBar = true;
        this.barX = 40;
        this.barY = 40;
        this.barWidth = 1000;
        this.barHeight = 20;
        this.barBgColor = 'rgba(0, 0, 0, 0.5)';
        this.barFillColor = '#4CAF50';
        this.textColor = '#ffffff';
    }

    /**
     * Get XP required to reach next level from current level
     * @returns {number}
     */
    getXPForNextLevel() {
        return Math.floor(this.baseXPPerLevel * Math.pow(this.levelScaling, this.level - 1));
    }

    /**
     * Get XP progress to next level (0-1)
     * @returns {number}
     */
    getProgress() {
        const needed = this.getXPForNextLevel();
        return Math.min(this.currentXP / needed, 1);
    }

    /**
     * Add XP (can trigger level-ups)
     * @param {number} amount - XP to add
     */
    addXP(amount) {
        if (this.level >= this.maxLevel) return;

        this.currentXP += amount;
        this.totalXP += amount;

        if (this.onXPGain) {
            this.onXPGain(amount, this.currentXP, this.totalXP);
        }

        // Check for level-ups
        let xpForNext = this.getXPForNextLevel();
        while (this.currentXP >= xpForNext && this.level < this.maxLevel) {
            this.currentXP -= xpForNext;
            this.level++;
            this.pendingLevelUps++;
            xpForNext = this.getXPForNextLevel();
        }
    }

    /**
     * Update - process pending level-ups
     * @param {number} dt - Delta time
     */
    update(dt) {
        // Process one level-up at a time (allows upgrade modal to show)
        if (this.pendingLevelUps > 0 && !this.isProcessingLevelUp) {
            this.isProcessingLevelUp = true;
            this.pendingLevelUps--;

            console.log(`[XPSystem] Level up! Now level ${this.level}`);

            if (this.onLevelUp) {
                // Callback should set isProcessingLevelUp = false when done
                this.onLevelUp(this.level, () => {
                    this.isProcessingLevelUp = false;
                });
            } else {
                this.isProcessingLevelUp = false;
            }
        }
    }

    /**
     * Call when level-up processing is complete (e.g., upgrade chosen)
     */
    finishLevelUp() {
        this.isProcessingLevelUp = false;
    }

    /**
     * Check if currently showing level-up UI
     * @returns {boolean}
     */
    isLevelingUp() {
        return this.isProcessingLevelUp;
    }

    /**
     * Reset to level 1
     */
    reset() {
        this.level = 1;
        this.currentXP = 0;
        this.totalXP = 0;
        this.pendingLevelUps = 0;
        this.isProcessingLevelUp = false;
    }

    /**
     * Render XP bar
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.showXPBar) return;

        // Background
        ctx.fillStyle = this.barBgColor;
        ctx.fillRect(this.barX, this.barY, this.barWidth, this.barHeight);

        // Fill
        const progress = this.getProgress();
        ctx.fillStyle = this.barFillColor;
        ctx.fillRect(this.barX, this.barY, this.barWidth * progress, this.barHeight);

        // Border
        ctx.strokeStyle = this.textColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.barX, this.barY, this.barWidth, this.barHeight);

        // Level text
        ctx.fillStyle = this.textColor;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Lv.${this.level}`, this.barX, this.barY + this.barHeight + 5);

        // XP numbers
        ctx.textAlign = 'right';
        ctx.font = '20px Arial';
        ctx.fillText(
            `${Math.floor(this.currentXP)} / ${this.getXPForNextLevel()}`,
            this.barX + this.barWidth,
            this.barY + this.barHeight + 5
        );
    }
}
