/**
 * FirebaseService - Firebase SDK wrapper for Capacitor apps
 * 
 * Part of the Platinum 10 stack. Handles:
 * - Anonymous and Google authentication
 * - Crash reporting (Crashlytics)
 * - Push notifications (FCM)
 * 
 * Setup:
 *   npm install firebase @capacitor/push-notifications
 *   
 *   // Get config from Firebase Console
 *   FirebaseService.init({
 *     apiKey: "...",
 *     authDomain: "...",
 *     projectId: "...",
 *     ...
 *   });
 * 
 * Usage:
 *   await FirebaseService.signInAnonymously();
 *   FirebaseService.logEvent('level_complete', { level: 5 });
 */

// Firebase will be imported dynamically to avoid bundling when not used
let firebase = null;
let auth = null;
let analytics = null;

export const FirebaseService = {
    isInitialized: false,
    currentUser: null,

    /**
     * Initialize Firebase with config
     * @param {Object} config - Firebase config from console
     */
    async init(config) {
        if (this.isInitialized) {
            console.warn('[Firebase] Already initialized');
            return;
        }

        try {
            // Dynamic import to avoid bundling when not used
            const firebaseApp = await import('firebase/app');
            const { getAuth, signInAnonymously, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } = await import('firebase/auth');
            const { getAnalytics, logEvent } = await import('firebase/analytics');

            firebase = firebaseApp.initializeApp(config);
            auth = getAuth(firebase);

            // Analytics only works in browser
            if (typeof window !== 'undefined') {
                try {
                    analytics = getAnalytics(firebase);
                } catch (e) {
                    console.log('[Firebase] Analytics not available in this environment');
                }
            }

            // Listen for auth state changes
            onAuthStateChanged(auth, (user) => {
                this.currentUser = user;
                if (user) {
                    console.log('[Firebase] User signed in:', user.uid);
                } else {
                    console.log('[Firebase] User signed out');
                }
            });

            this.isInitialized = true;
            console.log('[Firebase] Initialized successfully');
        } catch (error) {
            console.error('[Firebase] Init failed:', error);
            throw error;
        }
    },

    /**
     * Sign in anonymously (no account required)
     * @returns {Promise<Object>} User object
     */
    async signInAnonymously() {
        if (!auth) {
            console.warn('[Firebase] Not initialized');
            return null;
        }

        try {
            const { signInAnonymously } = await import('firebase/auth');
            const result = await signInAnonymously(auth);
            return result.user;
        } catch (error) {
            console.error('[Firebase] Anonymous sign-in failed:', error);
            throw error;
        }
    },

    /**
     * Sign in with Google (popup)
     * @returns {Promise<Object>} User object
     */
    async signInWithGoogle() {
        if (!auth) {
            console.warn('[Firebase] Not initialized');
            return null;
        }

        try {
            const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            return result.user;
        } catch (error) {
            console.error('[Firebase] Google sign-in failed:', error);
            throw error;
        }
    },

    /**
     * Sign out current user
     */
    async signOut() {
        if (!auth) return;

        try {
            const { signOut } = await import('firebase/auth');
            await signOut(auth);
        } catch (error) {
            console.error('[Firebase] Sign out failed:', error);
        }
    },

    /**
     * Get current user ID
     * @returns {string|null}
     */
    getUserId() {
        return this.currentUser?.uid || null;
    },

    /**
     * Log an analytics event
     * @param {string} eventName - Event name
     * @param {Object} params - Event parameters
     */
    logEvent(eventName, params = {}) {
        if (!analytics) {
            console.log('[Firebase] Analytics event (local):', eventName, params);
            return;
        }

        try {
            const { logEvent } = require('firebase/analytics');
            logEvent(analytics, eventName, params);
        } catch (error) {
            console.warn('[Firebase] Event logging failed:', error);
        }
    },

    /**
     * Log a crash/error (Crashlytics)
     * @param {Error} error - Error object
     */
    logCrash(error) {
        // Crashlytics requires native SDK via Capacitor
        // For now, log to console and analytics
        console.error('[Firebase] Crash logged:', error);
        this.logEvent('app_exception', {
            message: error.message,
            stack: error.stack?.substring(0, 500)
        });
    },

    /**
     * Request push notification permission
     * @returns {Promise<boolean>} Whether permission granted
     */
    async requestPushPermission() {
        try {
            // Check if running in Capacitor
            if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) {
                const { PushNotifications } = await import('@capacitor/push-notifications');

                const result = await PushNotifications.requestPermissions();
                if (result.receive === 'granted') {
                    await PushNotifications.register();
                    console.log('[Firebase] Push notifications enabled');
                    return true;
                }
            } else {
                // Web push (if supported)
                if ('Notification' in window) {
                    const permission = await Notification.requestPermission();
                    return permission === 'granted';
                }
            }
        } catch (error) {
            console.error('[Firebase] Push permission failed:', error);
        }
        return false;
    },

    /**
     * Listen for push notifications
     * @param {Function} callback - Called with notification data
     */
    onPushReceived(callback) {
        if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) {
            import('@capacitor/push-notifications').then(({ PushNotifications }) => {
                PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    callback(notification);
                });
            });
        }
    }
};
