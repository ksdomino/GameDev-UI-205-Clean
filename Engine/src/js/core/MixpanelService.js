/**
 * MixpanelService - Behavioral analytics for player retention
 * 
 * Part of the Platinum 10 stack. Tracks:
 * - Player behavior funnel
 * - Churn points
 * - Session data
 * - Feature engagement
 * 
 * Setup:
 *   npm install mixpanel-browser
 *   
 *   MixpanelService.init('YOUR_TOKEN');
 * 
 * Usage:
 *   MixpanelService.track('level_complete', { level: 5, time: 120 });
 *   MixpanelService.identify('user_123');
 * 
 * Key Events to Track:
 *   - session_start: When app opens
 *   - tutorial_step: Each tutorial checkpoint
 *   - level_start / level_complete / level_fail
 *   - upgrade_chosen: Which upgrades players prefer
 *   - ad_watched / purchase_attempt / purchase_complete
 *   - churn_point: When player quits (use beforeunload)
 */

let mixpanel = null;

export const MixpanelService = {
    isInitialized: false,
    userId: null,
    sessionStartTime: null,
    eventQueue: [],

    /**
     * Initialize Mixpanel
     * @param {string} token - Mixpanel project token
     * @param {Object} options - Additional config
     */
    async init(token, options = {}) {
        if (this.isInitialized) {
            console.warn('[Mixpanel] Already initialized');
            return;
        }

        if (!token) {
            console.log('[Mixpanel] No token provided, using local mode');
            this.isInitialized = true;
            this._flushQueue();
            return;
        }

        try {
            // Dynamic import to avoid bundling when not used
            const mp = await import('mixpanel-browser');
            mixpanel = mp.default || mp;

            mixpanel.init(token, {
                debug: options.debug || false,
                track_pageview: false, // We handle this manually
                persistence: 'localStorage',
                ...options
            });

            this.isInitialized = true;
            console.log('[Mixpanel] Initialized successfully');

            // Flush any queued events
            this._flushQueue();

            // Auto-track session start
            this.trackSessionStart();

        } catch (error) {
            console.error('[Mixpanel] Init failed (SDK not installed?):', error.message);
            this.isInitialized = true; // Allow local tracking
        }
    },

    /**
     * Identify user
     * @param {string} userId - Unique user identifier
     */
    identify(userId) {
        this.userId = userId;

        if (mixpanel) {
            mixpanel.identify(userId);
        }

        console.log('[Mixpanel] User identified:', userId);
    },

    /**
     * Set user properties (super properties)
     * @param {Object} properties
     */
    setUserProperties(properties) {
        if (mixpanel) {
            mixpanel.people.set(properties);
            mixpanel.register(properties); // Also set as super properties
        }

        // Store locally for reference
        try {
            const stored = JSON.parse(localStorage.getItem('mp_user_props') || '{}');
            localStorage.setItem('mp_user_props', JSON.stringify({ ...stored, ...properties }));
        } catch { }
    },

    /**
     * Track an event
     * @param {string} eventName - Event name
     * @param {Object} properties - Event properties
     */
    track(eventName, properties = {}) {
        const event = {
            name: eventName,
            properties: {
                ...properties,
                timestamp: Date.now(),
                session_id: this.sessionStartTime
            }
        };

        // If not initialized yet, queue the event
        if (!this.isInitialized) {
            this.eventQueue.push(event);
            return;
        }

        if (mixpanel) {
            mixpanel.track(eventName, event.properties);
        }

        // Always log locally for debugging
        this._logLocally(event);
        console.log('[Mixpanel] Track:', eventName, properties);
    },

    /**
     * Track session start
     */
    trackSessionStart() {
        this.sessionStartTime = Date.now();
        this.track('session_start', {
            platform: this._getPlatform(),
            screen_width: window.innerWidth,
            screen_height: window.innerHeight
        });
    },

    /**
     * Track session end (call on app close)
     */
    trackSessionEnd() {
        if (this.sessionStartTime) {
            const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            this.track('session_end', { duration_seconds: duration });
        }
    },

    // ==================== COMMON GAME EVENTS ====================

    /**
     * Track level completion
     */
    trackLevelComplete(level, score, time) {
        this.track('level_complete', { level, score, time_seconds: time });
    },

    /**
     * Track level failure
     */
    trackLevelFail(level, wave, reason) {
        this.track('level_fail', { level, wave, reason });
    },

    /**
     * Track upgrade selection
     */
    trackUpgradeChosen(upgradeName, level, alternatives) {
        this.track('upgrade_chosen', {
            upgrade: upgradeName,
            at_level: level,
            alternatives: alternatives.join(',')
        });
    },

    /**
     * Track ad watched
     */
    trackAdWatched(placement, completed) {
        this.track('ad_watched', { placement, completed });
    },

    /**
     * Track purchase attempt
     */
    trackPurchaseAttempt(productId, price) {
        this.track('purchase_attempt', { product_id: productId, price });
    },

    /**
     * Track purchase complete
     */
    trackPurchaseComplete(productId, price, currency) {
        this.track('purchase_complete', { product_id: productId, price, currency });

        // Mixpanel revenue tracking
        if (mixpanel) {
            mixpanel.people.track_charge(price, { product_id: productId });
        }
    },

    // ==================== HELPERS ====================

    _getPlatform() {
        if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) {
            return window.Capacitor.getPlatform();
        }
        return 'web';
    },

    _logLocally(event) {
        try {
            const logs = JSON.parse(localStorage.getItem('mp_events') || '[]');
            logs.push(event);
            // Keep last 200 events
            if (logs.length > 200) logs.splice(0, logs.length - 200);
            localStorage.setItem('mp_events', JSON.stringify(logs));
        } catch { }
    },

    _flushQueue() {
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            this.track(event.name, event.properties);
        }
    },

    /**
     * Get locally stored events (for debugging)
     * @returns {Array}
     */
    getLocalEvents() {
        try {
            return JSON.parse(localStorage.getItem('mp_events') || '[]');
        } catch { return []; }
    },

    /**
     * Clear local event log
     */
    clearLocalEvents() {
        localStorage.removeItem('mp_events');
    }
};

// Auto-track session end on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        MixpanelService.trackSessionEnd();
    });
}
