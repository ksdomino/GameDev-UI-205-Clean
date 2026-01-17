/**
 * SaveManager - Handles persistent player data via localStorage
 * 
 * Essential for meta-progression, daily rewards, and high scores.
 * All data is JSON-serialized and stored under a game-specific key.
 * 
 * Usage:
 *   const save = new SaveManager('myGame');
 *   save.set('highScore', 1000);
 *   save.set('unlockedSkins', ['default', 'gold']);
 *   save.save(); // Persist to localStorage
 *   
 *   // On game load:
 *   save.load();
 *   const highScore = save.get('highScore', 0); // 0 is default
 */
export class SaveManager {
    /**
     * @param {string} gameId - Unique identifier for this game's save data
     */
    constructor(gameId) {
        this.gameId = gameId;
        this.storageKey = `gamedev_save_${gameId}`;
        this.data = {};
        this.isDirty = false;
    }

    /**
     * Load saved data from localStorage
     * @returns {boolean} True if data was found
     */
    load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (raw) {
                this.data = JSON.parse(raw);
                console.log(`[SaveManager] Loaded save data for: ${this.gameId}`);
                return true;
            }
        } catch (e) {
            console.warn(`[SaveManager] Failed to load save data:`, e);
        }
        this.data = {};
        return false;
    }

    /**
     * Save current data to localStorage
     */
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            this.isDirty = false;
            console.log(`[SaveManager] Saved data for: ${this.gameId}`);
        } catch (e) {
            console.warn(`[SaveManager] Failed to save:`, e);
        }
    }

    /**
     * Get a value from save data
     * @param {string} key
     * @param {*} defaultValue - Returned if key doesn't exist
     * @returns {*}
     */
    get(key, defaultValue = null) {
        return this.data.hasOwnProperty(key) ? this.data[key] : defaultValue;
    }

    /**
     * Set a value in save data (does not auto-save)
     * @param {string} key
     * @param {*} value
     */
    set(key, value) {
        this.data[key] = value;
        this.isDirty = true;
    }

    /**
     * Increment a numeric value
     * @param {string} key
     * @param {number} amount
     */
    increment(key, amount = 1) {
        const current = this.get(key, 0);
        this.set(key, current + amount);
    }

    /**
     * Check if a key exists
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
        return this.data.hasOwnProperty(key);
    }

    /**
     * Delete a key
     * @param {string} key
     */
    delete(key) {
        delete this.data[key];
        this.isDirty = true;
    }

    /**
     * Clear all save data
     */
    clear() {
        this.data = {};
        this.isDirty = true;
    }

    /**
     * Delete all save data from localStorage
     */
    wipe() {
        localStorage.removeItem(this.storageKey);
        this.data = {};
        this.isDirty = false;
        console.log(`[SaveManager] Wiped save data for: ${this.gameId}`);
    }

    /**
     * Auto-save if data has changed
     */
    autoSave() {
        if (this.isDirty) {
            this.save();
        }
    }
}
