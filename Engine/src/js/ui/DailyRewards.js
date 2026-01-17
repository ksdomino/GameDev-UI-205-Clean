/**
 * DailyRewards - Calendar-based daily login rewards for retention
 * 
 * Essential for mobile game retention. Tracks consecutive login days
 * and awards escalating rewards. Uses SaveManager for persistence.
 * 
 * Usage:
 *   const daily = new DailyRewards(saveManager, {
 *     rewards: [
 *       { day: 1, type: 'coins', amount: 100 },
 *       { day: 2, type: 'coins', amount: 150 },
 *       { day: 7, type: 'skin', id: 'gold_paddle' }
 *     ],
 *     onClaim: (reward) => givePlayerReward(reward)
 *   });
 *   
 *   if (daily.canClaim()) {
 *     daily.claim();
 *   }
 */
export class DailyRewards {
    /**
     * @param {Object} saveManager - SaveManager instance for persistence
     * @param {Object} options - Configuration
     */
    constructor(saveManager, options = {}) {
        this.saveManager = saveManager;

        // Default 7-day reward cycle
        this.rewards = options.rewards || [
            { day: 1, type: 'coins', amount: 100, label: '100 Coins' },
            { day: 2, type: 'coins', amount: 200, label: '200 Coins' },
            { day: 3, type: 'coins', amount: 300, label: '300 Coins' },
            { day: 4, type: 'gems', amount: 5, label: '5 Gems' },
            { day: 5, type: 'coins', amount: 500, label: '500 Coins' },
            { day: 6, type: 'gems', amount: 10, label: '10 Gems' },
            { day: 7, type: 'chest', id: 'epic', label: 'Epic Chest!' }
        ];

        // Callbacks
        this.onClaim = options.onClaim || null;
        this.onStreakReset = options.onStreakReset || null;

        // Load state from save
        this._loadState();
    }

    /**
     * Load state from SaveManager
     * @private
     */
    _loadState() {
        this.lastClaimDate = this.saveManager.get('daily_lastClaim', null);
        this.currentStreak = this.saveManager.get('daily_streak', 0);
        this.totalLogins = this.saveManager.get('daily_totalLogins', 0);

        // Check for streak break
        this._checkStreakValidity();
    }

    /**
     * Save state to SaveManager
     * @private
     */
    _saveState() {
        this.saveManager.set('daily_lastClaim', this.lastClaimDate);
        this.saveManager.set('daily_streak', this.currentStreak);
        this.saveManager.set('daily_totalLogins', this.totalLogins);
        this.saveManager.save();
    }

    /**
     * Check if streak is still valid (didn't miss a day)
     * @private
     */
    _checkStreakValidity() {
        if (!this.lastClaimDate) return;

        const lastClaim = new Date(this.lastClaimDate);
        const now = new Date();
        const daysSinceClaim = this._getDaysBetween(lastClaim, now);

        // If more than 1 day has passed, reset streak
        if (daysSinceClaim > 1) {
            console.log(`[DailyRewards] Streak broken! ${daysSinceClaim} days since last claim.`);
            this.currentStreak = 0;
            this._saveState();

            if (this.onStreakReset) {
                this.onStreakReset(daysSinceClaim);
            }
        }
    }

    /**
     * Get number of calendar days between two dates
     * @private
     */
    _getDaysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        const start = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
        const end = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
        return Math.round((end - start) / oneDay);
    }

    /**
     * Check if player can claim today's reward
     * @returns {boolean}
     */
    canClaim() {
        if (!this.lastClaimDate) return true;

        const lastClaim = new Date(this.lastClaimDate);
        const now = new Date();
        const daysSinceClaim = this._getDaysBetween(lastClaim, now);

        return daysSinceClaim >= 1;
    }

    /**
     * Get today's reward (based on streak)
     * @returns {Object}
     */
    getTodayReward() {
        const dayIndex = this.currentStreak % this.rewards.length;
        return { ...this.rewards[dayIndex], streakDay: this.currentStreak + 1 };
    }

    /**
     * Claim today's reward
     * @returns {Object|null} The claimed reward, or null if already claimed
     */
    claim() {
        if (!this.canClaim()) {
            console.log('[DailyRewards] Already claimed today!');
            return null;
        }

        this.currentStreak++;
        this.totalLogins++;
        this.lastClaimDate = new Date().toISOString();

        const reward = this.getTodayReward();
        reward.streakDay = this.currentStreak;

        console.log(`[DailyRewards] Claimed day ${this.currentStreak}:`, reward);

        this._saveState();

        if (this.onClaim) {
            this.onClaim(reward);
        }

        return reward;
    }

    /**
     * Get current streak
     * @returns {number}
     */
    getStreak() {
        return this.currentStreak;
    }

    /**
     * Get time until next claim is available
     * @returns {Object} { hours, minutes, seconds } or null if can claim now
     */
    getTimeUntilNextClaim() {
        if (this.canClaim()) return null;

        const lastClaim = new Date(this.lastClaimDate);
        const nextClaim = new Date(lastClaim);
        nextClaim.setDate(nextClaim.getDate() + 1);
        nextClaim.setHours(0, 0, 0, 0);

        const now = new Date();
        const diff = nextClaim - now;

        if (diff <= 0) return null;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return { hours, minutes, seconds };
    }

    /**
     * Get all rewards with claimed status
     * @returns {Array}
     */
    getRewardCalendar() {
        return this.rewards.map((reward, index) => ({
            ...reward,
            claimed: index < this.currentStreak % this.rewards.length ||
                (this.currentStreak > 0 && Math.floor(this.currentStreak / this.rewards.length) > 0),
            isToday: index === this.currentStreak % this.rewards.length,
            canClaim: index === this.currentStreak % this.rewards.length && this.canClaim()
        }));
    }

    /**
     * Reset all daily rewards data (for testing)
     */
    reset() {
        this.lastClaimDate = null;
        this.currentStreak = 0;
        this.totalLogins = 0;
        this._saveState();
    }
}
