/**
 * PlayFabService - PlayFab SDK wrapper for game economy and backend
 * 
 * @context Engine/llms.txt
 * 
 * Part of the AI-First Platinum 10 stack. PlayFab provides:
 * - 100,000 free players (Development Mode)
 * - Economy v2, Leaderboards v2
 * - Player data, inventory, virtual currency
 * 
 * Why PlayFab over alternatives (2026):
 * - With Claude Opus 4.5 / Gemini 3, the "complexity barrier" disappears
 * - AI can digest the 500-page manual and write boilerplate
 * - 100x better free tier than alternatives
 * 
 * Setup:
 *   npm install playfab-sdk
 *   
 *   PlayFabService.init({
 *     titleId: 'YOUR_TITLE_ID',
 *     developerSecretKey: 'YOUR_SECRET_KEY' // Server-side only
 *   });
 * 
 * Usage:
 *   await PlayFabService.login();
 *   await PlayFabService.updatePlayerData({ level: 5 });
 *   await PlayFabService.submitScore('highscores', 1000);
 */

let PlayFab = null;
let PlayFabClient = null;
let sessionActive = false;

export const PlayFabService = {
    isInitialized: false,
    playerId: null,
    titleId: null,

    /**
     * Initialize PlayFab
     * @param {Object} config - { titleId, developerSecretKey? }
     */
    async init(config) {
        if (this.isInitialized) {
            console.warn('[PlayFab] Already initialized');
            return;
        }

        this.titleId = config.titleId;

        try {
            // Dynamic import to avoid bundling when not used
            const sdk = await import('playfab-sdk');
            PlayFab = sdk.PlayFab;
            PlayFabClient = sdk.PlayFabClient;

            PlayFab.settings.titleId = config.titleId;
            if (config.developerSecretKey) {
                PlayFab.settings.developerSecretKey = config.developerSecretKey;
            }

            this.isInitialized = true;
            console.log('[PlayFab] Initialized with title:', config.titleId);
        } catch (error) {
            console.error('[PlayFab] Init failed (SDK not installed?):', error.message);
            // Continue with local fallback
            this.isInitialized = true;
        }
    },

    /**
     * Login with device ID (anonymous)
     * @returns {Promise<string>} Player ID
     */
    async login() {
        if (!PlayFabClient) {
            return this._fallbackLogin();
        }

        return new Promise((resolve, reject) => {
            // Generate device ID for anonymous login
            const deviceId = this._getDeviceId();

            PlayFabClient.LoginWithCustomID({
                CustomId: deviceId,
                CreateAccount: true
            }, (result, error) => {
                if (error) {
                    console.error('[PlayFab] Login failed:', error.errorMessage);
                    reject(new Error(error.errorMessage));
                } else {
                    this.playerId = result.data.PlayFabId;
                    sessionActive = true;
                    console.log('[PlayFab] Logged in:', this.playerId);
                    resolve(this.playerId);
                }
            });
        });
    },

    /**
     * Get player data
     * @param {Array<string>} keys - Keys to retrieve
     * @returns {Promise<Object>}
     */
    async getPlayerData(keys = null) {
        if (!PlayFabClient || !sessionActive) {
            return this._getLocalData();
        }

        return new Promise((resolve, reject) => {
            PlayFabClient.GetUserData({
                Keys: keys
            }, (result, error) => {
                if (error) {
                    reject(new Error(error.errorMessage));
                } else {
                    const data = {};
                    Object.entries(result.data.Data || {}).forEach(([key, val]) => {
                        try {
                            data[key] = JSON.parse(val.Value);
                        } catch {
                            data[key] = val.Value;
                        }
                    });
                    resolve(data);
                }
            });
        });
    },

    /**
     * Update player data
     * @param {Object} data - Key-value pairs to store
     * @returns {Promise<void>}
     */
    async updatePlayerData(data) {
        // Always save locally as backup
        this._saveLocalData(data);

        if (!PlayFabClient || !sessionActive) {
            return { local: true };
        }

        return new Promise((resolve, reject) => {
            const stringData = {};
            Object.entries(data).forEach(([key, val]) => {
                stringData[key] = typeof val === 'string' ? val : JSON.stringify(val);
            });

            PlayFabClient.UpdateUserData({
                Data: stringData
            }, (result, error) => {
                if (error) {
                    reject(new Error(error.errorMessage));
                } else {
                    resolve(result);
                }
            });
        });
    },

    /**
     * Submit score to leaderboard
     * @param {string} statisticName - Leaderboard name
     * @param {number} value - Score value
     */
    async submitScore(statisticName, value) {
        this._saveLocalScore(statisticName, value);

        if (!PlayFabClient || !sessionActive) {
            console.log('[PlayFab] Score saved locally:', statisticName, value);
            return { local: true };
        }

        return new Promise((resolve, reject) => {
            PlayFabClient.UpdatePlayerStatistics({
                Statistics: [{ StatisticName: statisticName, Value: value }]
            }, (result, error) => {
                if (error) {
                    reject(new Error(error.errorMessage));
                } else {
                    console.log('[PlayFab] Score submitted:', statisticName, value);
                    resolve(result);
                }
            });
        });
    },

    /**
     * Get leaderboard
     * @param {string} statisticName
     * @param {number} maxResults
     * @returns {Promise<Array>}
     */
    async getLeaderboard(statisticName, maxResults = 10) {
        if (!PlayFabClient || !sessionActive) {
            return this._getLocalScores(statisticName);
        }

        return new Promise((resolve, reject) => {
            PlayFabClient.GetLeaderboard({
                StatisticName: statisticName,
                MaxResultsCount: maxResults
            }, (result, error) => {
                if (error) {
                    reject(new Error(error.errorMessage));
                } else {
                    resolve(result.data.Leaderboard || []);
                }
            });
        });
    },

    /**
     * Grant virtual currency
     * @param {string} currencyCode - e.g., 'GC' for gold coins
     * @param {number} amount
     */
    async grantCurrency(currencyCode, amount) {
        if (!PlayFabClient || !sessionActive) {
            return this._grantLocalCurrency(currencyCode, amount);
        }

        return new Promise((resolve, reject) => {
            PlayFabClient.AddUserVirtualCurrency({
                VirtualCurrency: currencyCode,
                Amount: amount
            }, (result, error) => {
                if (error) {
                    reject(new Error(error.errorMessage));
                } else {
                    resolve(result.data);
                }
            });
        });
    },

    /**
     * Get virtual currency balance
     * @returns {Promise<Object>}
     */
    async getCurrencyBalance() {
        if (!PlayFabClient || !sessionActive) {
            return this._getLocalCurrency();
        }

        return new Promise((resolve, reject) => {
            PlayFabClient.GetUserInventory({}, (result, error) => {
                if (error) {
                    reject(new Error(error.errorMessage));
                } else {
                    resolve(result.data.VirtualCurrency || {});
                }
            });
        });
    },

    // ==================== LOCAL FALLBACKS ====================

    _getDeviceId() {
        let id = localStorage.getItem('pf_device_id');
        if (!id) {
            id = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('pf_device_id', id);
        }
        return id;
    },

    _fallbackLogin() {
        this.playerId = localStorage.getItem('pf_player_id') || `local_${Date.now()}`;
        localStorage.setItem('pf_player_id', this.playerId);
        sessionActive = true;
        console.log('[PlayFab] Local session:', this.playerId);
        return Promise.resolve(this.playerId);
    },

    _getLocalData() {
        try {
            return JSON.parse(localStorage.getItem('pf_player_data') || '{}');
        } catch { return {}; }
    },

    _saveLocalData(data) {
        try {
            const existing = this._getLocalData();
            localStorage.setItem('pf_player_data', JSON.stringify({ ...existing, ...data }));
        } catch { }
    },

    _saveLocalScore(name, score) {
        try {
            const scores = JSON.parse(localStorage.getItem('pf_scores') || '{}');
            if (!scores[name]) scores[name] = [];
            scores[name].push({ score, date: Date.now() });
            scores[name] = scores[name].slice(-50);
            localStorage.setItem('pf_scores', JSON.stringify(scores));
        } catch { }
    },

    _getLocalScores(name) {
        try {
            const scores = JSON.parse(localStorage.getItem('pf_scores') || '{}');
            return scores[name] || [];
        } catch { return []; }
    },

    _grantLocalCurrency(code, amount) {
        const currency = this._getLocalCurrency();
        currency[code] = (currency[code] || 0) + amount;
        localStorage.setItem('pf_currency', JSON.stringify(currency));
        return Promise.resolve(currency);
    },

    _getLocalCurrency() {
        try {
            return JSON.parse(localStorage.getItem('pf_currency') || '{}');
        } catch { return {}; }
    }
};
