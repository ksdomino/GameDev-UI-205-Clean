/**
 * UpgradeModal - Reusable modal for upgrade/power-up selection
 * 
 * Classic rogue-lite pattern: pause game, show 3 choices, player picks one.
 * This is a UI overlay that renders on the UI_BUTTONS layer.
 * 
 * Usage:
 *   const modal = new UpgradeModal(engine);
 *   modal.show([
 *     { id: 'health', label: '+20 Health', icon: healthImg },
 *     { id: 'speed', label: '+10% Speed', icon: speedImg },
 *     { id: 'damage', label: '+5 Damage', icon: damageImg }
 *   ], (choice) => {
 *     console.log('Player chose:', choice.id);
 *     applyUpgrade(choice.id);
 *   });
 */
export class UpgradeModal {
    constructor(engine) {
        this.engine = engine;
        this.isVisible = false;
        this.choices = [];
        this.onChoose = null;
        this.selectedIndex = -1;

        // Layout constants
        this.cardWidth = 280;
        this.cardHeight = 350;
        this.cardGap = 40;
        this.cardY = 600;

        // Visual styling
        this.bgColor = 'rgba(0, 0, 0, 0.8)';
        this.cardColor = '#2a2a4a';
        this.cardHoverColor = '#3a3a6a';
        this.textColor = '#ffffff';
        this.titleFont = 'bold 48px Arial';
        this.labelFont = '32px Arial';
    }

    /**
     * Show the upgrade modal with choices
     * @param {Array} choices - Array of { id, label, icon?, description? }
     * @param {Function} onChoose - Callback when player selects
     */
    show(choices, onChoose) {
        this.choices = choices;
        this.onChoose = onChoose;
        this.isVisible = true;
        this.selectedIndex = -1;

        // Register click handler
        this._clickHandler = (x, y) => this._handleClick(x, y);
        this.engine.inputHandler.onTap = this._clickHandler;

        console.log('[UpgradeModal] Showing with', choices.length, 'choices');
    }

    /**
     * Hide the modal
     */
    hide() {
        this.isVisible = false;
        this.choices = [];
        this.onChoose = null;
        this.engine.inputHandler.onTap = null;
    }

    /**
     * Handle tap/click
     * @private
     */
    _handleClick(x, y) {
        if (!this.isVisible) return;

        const cardIndex = this._getCardAtPosition(x, y);
        if (cardIndex >= 0 && cardIndex < this.choices.length) {
            const choice = this.choices[cardIndex];
            console.log('[UpgradeModal] Selected:', choice.id);

            if (this.onChoose) {
                this.onChoose(choice);
            }
            this.hide();
        }
    }

    /**
     * Determine which card (if any) is at the given position
     * @private
     */
    _getCardAtPosition(x, y) {
        const totalWidth = (this.choices.length * this.cardWidth) +
            ((this.choices.length - 1) * this.cardGap);
        const startX = (1080 - totalWidth) / 2;

        for (let i = 0; i < this.choices.length; i++) {
            const cardX = startX + (i * (this.cardWidth + this.cardGap));

            if (x >= cardX && x < cardX + this.cardWidth &&
                y >= this.cardY && y < this.cardY + this.cardHeight) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Render the modal (call from scene render, after other layers)
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.isVisible) return;

        // Background overlay
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, 1080, 1920);

        // Title
        ctx.fillStyle = this.textColor;
        ctx.font = this.titleFont;
        ctx.textAlign = 'center';
        ctx.fillText('CHOOSE AN UPGRADE', 540, 400);

        // Cards
        const totalWidth = (this.choices.length * this.cardWidth) +
            ((this.choices.length - 1) * this.cardGap);
        const startX = (1080 - totalWidth) / 2;

        for (let i = 0; i < this.choices.length; i++) {
            const choice = this.choices[i];
            const cardX = startX + (i * (this.cardWidth + this.cardGap));
            const isHovered = this._getCardAtPosition(
                this.engine.inputHandler.mouse.x,
                this.engine.inputHandler.mouse.y
            ) === i;

            // Card background
            ctx.fillStyle = isHovered ? this.cardHoverColor : this.cardColor;
            ctx.fillRect(cardX, this.cardY, this.cardWidth, this.cardHeight);

            // Card border
            ctx.strokeStyle = this.textColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(cardX, this.cardY, this.cardWidth, this.cardHeight);

            // Icon (if provided)
            if (choice.icon && choice.icon.complete) {
                const iconSize = 120;
                const iconX = cardX + (this.cardWidth - iconSize) / 2;
                const iconY = this.cardY + 30;
                ctx.drawImage(choice.icon, iconX, iconY, iconSize, iconSize);
            }

            // Label
            ctx.fillStyle = this.textColor;
            ctx.font = this.labelFont;
            ctx.textAlign = 'center';
            ctx.fillText(choice.label, cardX + this.cardWidth / 2, this.cardY + 220);

            // Description (if provided)
            if (choice.description) {
                ctx.font = '24px Arial';
                ctx.fillStyle = '#aaaaaa';
                ctx.fillText(choice.description, cardX + this.cardWidth / 2, this.cardY + 280);
            }
        }
    }
}
