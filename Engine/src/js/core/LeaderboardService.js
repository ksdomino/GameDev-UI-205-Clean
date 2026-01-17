/**
 * LeaderboardService - Integration with Play Games Services / Game Center
 * 
 * Provides leaderboard functionality for mobile games via Capacitor plugins.
 * Falls back to localStorage for web/testing.
 * 
 * Setup:
 *   npm install @nicognaomern/capacitor-play-games-services
 *   (For iOS, use @nicognaomern/capacitor-game-center)
 * 
 * Usage:
 *   const leaderboard = new LeaderboardService();
 *   await leaderboard.init();
 *   
 *   // Submit score
 *   await leaderboard.submitScore('high_scores', 1000);
 *   
 *   // Show leaderboard UI
 *   await leaderboard.showLeaderboard('high_scores');
 */
export class LeaderboardService {
    constructor() {
        this.isAvailable = false;
        this.isSignedIn = false;
        this.playGames = null;
        this.platform = 'web';

        // Local fallback scores
        this.localScores = {};
    }

    /**
     * Initialize leaderboard service
     * @returns {Promise<boolean>} True if platform services available
     */
    async init() {
        // Detect platform
        if (typeof window !== 'undefined') {
            if (window.Capacitor?.isNativePlatform()) {
                this.platform = window.Capacitor.getPlatform();
            }
        }

        // Try to load Play Games (Android)
        if (this.platform === 'android') {
            try {
                const { PlayGamesServices } = await import('@nicognaomern/capacitor-play-games-services');
                this.playGames = PlayGamesServices;
                this.isAvailable = true;
                console.log('[Leaderboard] Play Games Services loaded');
            } catch (e) {
                console.log('[Leaderboard] Play Games not available:', e.message);
            }
        }

        // Try to load Game Center (iOS)
        if (this.platform === 'ios') {
            try {
                // iOS Game Center would use a different plugin
                console.log('[Leaderboard] Game Center not implemented yet');
            } catch (e) {
                console.log('[Leaderboard] Game Center not available');
            }
        }

        // Load local scores
        this._loadLocalScores();

        return this.isAvailable;
    }

    /**
     * Sign in to platform services
     * @returns {Promise<boolean>}
     */
    async signIn() {
        if (!this.isAvailable) {
            console.log('[Leaderboard] Platform services not available');
            return false;
        }

        try {
            if (this.platform === 'android' && this.playGames) {
                await this.playGames.signIn();
                this.isSignedIn = true;
                console.log('[Leaderboard] Signed in to Play Games');
                return true;
            }
        } catch (e) {
            console.error('[Leaderboard] Sign in failed:', e);
        }

        return false;
    }

    /**
     * Submit a score to a leaderboard
     * @param {string} leaderboardId - Leaderboard ID from Play Console
     * @param {number} score - Score to submit
     * @returns {Promise<boolean>}
     */
    async submitScore(leaderboardId, score) {
        // Always store locally for fallback
        this._saveLocalScore(leaderboardId, score);

        if (!this.isAvailable || !this.isSignedIn) {
            console.log('[Leaderboard] Submitted locally:', leaderboardId, score);
            return true;
        }

        try {
            if (this.platform === 'android' && this.playGames) {
                await this.playGames.submitScore({
                    leaderboardId,
                    score
                });
                console.log('[Leaderboard] Submitted to Play Games:', leaderboardId, score);
                return true;
            }
        } catch (e) {
            console.error('[Leaderboard] Submit failed:', e);
        }

        return false;
    }

    /**
     * Show the platform leaderboard UI
     * @param {string} leaderboardId - Leaderboard ID (optional, shows all if omitted)
     */
    async showLeaderboard(leaderboardId = null) {
        if (!this.isAvailable) {
            console.log('[Leaderboard] Showing local scores');
            return this.getLocalScores(leaderboardId);
        }

        try {
            if (this.platform === 'android' && this.playGames) {
                if (leaderboardId) {
                    await this.playGames.showLeaderboard({ leaderboardId });
                } else {
                    await this.playGames.showAllLeaderboards();
                }
            }
        } catch (e) {
            console.error('[Leaderboard] Show failed:', e);
        }
    }

    /**
     * Get player's best score for a leaderboard
     * @param {string} leaderboardId
     * @returns {number}
     */
    getLocalBestScore(leaderboardId) {
        return this.localScores[leaderboardId]?.best || 0;
    }

    /**
     * Get all local scores for a leaderboard
     * @param {string} leaderboardId
     * @returns {Array}
     */
    getLocalScores(leaderboardId) {
        return this.localScores[leaderboardId]?.history || [];
    }

    /**
     * Load local scores from storage
     * @private
     */
    _loadLocalScores() {
        try {
            const data = localStorage.getItem('leaderboard_scores');
            if (data) {
                this.localScores = JSON.parse(data);
            }
        } catch (e) {
            this.localScores = {};
        }
    }

    /**
     * Save a score locally
     * @private
     */
    _saveLocalScore(leaderboardId, score) {
        if (!this.localScores[leaderboardId]) {
            this.localScores[leaderboardId] = { best: 0, history: [] };
        }

        const entry = this.localScores[leaderboardId];
        entry.history.push({ score, date: Date.now() });
        entry.history = entry.history.slice(-100); // Keep last 100

        if (score > entry.best) {
            entry.best = score;
        }

        try {
            localStorage.setItem('leaderboard_scores', JSON.stringify(this.localScores));
        } catch (e) {
            console.warn('[Leaderboard] Failed to save locally');
        }
    }

    /**
     * Check if signed in to platform services
     * @returns {boolean}
     */
    isConnected() {
        return this.isSignedIn;
    }

    /**
     * Get current platform
     * @returns {string} 'android', 'ios', or 'web'
     */
    getPlatform() {
        return this.platform;
    }
}
