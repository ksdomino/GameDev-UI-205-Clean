/**
 * ActorStateMachine - State management for actor behaviors
 * 
 * Enables complex actor behaviors through finite state machines.
 * Essential for beat-em-up enemies, bosses with phases, and AI patterns.
 * 
 * Usage:
 *   const fsm = new ActorStateMachine(actorId, {
 *     initial: 'idle',
 *     states: {
 *       idle: {
 *         onEnter: () => actor.playAnimation('idle'),
 *         onUpdate: (dt) => { if (seePlayer) this.transition('chase'); },
 *         transitions: ['chase', 'attack']
 *       },
 *       chase: {
 *         onEnter: () => actor.playAnimation('run'),
 *         onUpdate: (dt) => { moveTowardsPlayer(dt); }
 *       }
 *     }
 *   });
 *   
 *   // In game loop:
 *   fsm.update(dt);
 */
export class ActorStateMachine {
    /**
     * @param {string} actorId - ID of the actor this FSM belongs to
     * @param {Object} config - State machine configuration
     */
    constructor(actorId, config = {}) {
        this.actorId = actorId;
        this.states = config.states || {};
        this.initialState = config.initial || 'idle';

        // Runtime state
        this.currentState = null;
        this.previousState = null;
        this.stateTime = 0;
        this.isActive = true;

        // Context for state functions
        this.context = config.context || {};

        // History for debugging
        this.history = [];
        this.maxHistory = 10;

        // Start in initial state
        this._enterState(this.initialState);
    }

    /**
     * Define a state
     * @param {string} name - State name
     * @param {Object} definition - State definition { onEnter, onUpdate, onExit, transitions }
     */
    defineState(name, definition) {
        this.states[name] = {
            onEnter: definition.onEnter || null,
            onUpdate: definition.onUpdate || null,
            onExit: definition.onExit || null,
            transitions: definition.transitions || [] // Allowed transition targets
        };
    }

    /**
     * Get current state name
     * @returns {string}
     */
    getState() {
        return this.currentState;
    }

    /**
     * Get time spent in current state (seconds)
     * @returns {number}
     */
    getStateTime() {
        return this.stateTime;
    }

    /**
     * Transition to a new state
     * @param {string} newState - Target state name
     * @param {Object} data - Optional data to pass to new state
     * @returns {boolean} True if transition successful
     */
    transition(newState, data = {}) {
        // Check if state exists
        if (!this.states.hasOwnProperty(newState)) {
            console.warn(`[FSM:${this.actorId}] Unknown state: ${newState}`);
            return false;
        }

        // Check if transition is allowed (if transitions are defined)
        const currentDef = this.states[this.currentState];
        if (currentDef && currentDef.transitions && currentDef.transitions.length > 0) {
            if (!currentDef.transitions.includes(newState)) {
                console.warn(`[FSM:${this.actorId}] Transition from ${this.currentState} to ${newState} not allowed`);
                return false;
            }
        }

        // Exit current state
        this._exitState();

        // Enter new state
        this.previousState = this.currentState;
        this._enterState(newState, data);

        return true;
    }

    /**
     * Force transition (ignores allowed transitions list)
     * @param {string} newState
     * @param {Object} data
     */
    forceTransition(newState, data = {}) {
        if (!this.states.hasOwnProperty(newState)) {
            console.warn(`[FSM:${this.actorId}] Unknown state: ${newState}`);
            return;
        }

        this._exitState();
        this.previousState = this.currentState;
        this._enterState(newState, data);
    }

    /**
     * Enter a state
     * @private
     */
    _enterState(stateName, data = {}) {
        this.currentState = stateName;
        this.stateTime = 0;

        // Add to history
        this.history.push({
            state: stateName,
            time: Date.now(),
            from: this.previousState
        });
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        // Call onEnter
        const stateDef = this.states[stateName];
        if (stateDef && stateDef.onEnter) {
            stateDef.onEnter.call(this, data);
        }

        console.log(`[FSM:${this.actorId}] Entered state: ${stateName}`);
    }

    /**
     * Exit current state
     * @private
     */
    _exitState() {
        const stateDef = this.states[this.currentState];
        if (stateDef && stateDef.onExit) {
            stateDef.onExit.call(this);
        }
    }

    /**
     * Update the state machine
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.isActive || !this.currentState) return;

        this.stateTime += dt;

        const stateDef = this.states[this.currentState];
        if (stateDef && stateDef.onUpdate) {
            stateDef.onUpdate.call(this, dt);
        }
    }

    /**
     * Pause the state machine
     */
    pause() {
        this.isActive = false;
    }

    /**
     * Resume the state machine
     */
    resume() {
        this.isActive = true;
    }

    /**
     * Reset to initial state
     */
    reset() {
        this._exitState();
        this.previousState = null;
        this.history = [];
        this._enterState(this.initialState);
    }

    /**
     * Get state history (for debugging)
     * @returns {Array}
     */
    getHistory() {
        return [...this.history];
    }

    /**
     * Serialize state machine configuration
     * @returns {Object}
     */
    serialize() {
        const serialized = {
            actorId: this.actorId,
            initial: this.initialState,
            current: this.currentState,
            states: {}
        };

        // Serialize states (without functions)
        Object.keys(this.states).forEach(name => {
            const state = this.states[name];
            serialized.states[name] = {
                transitions: state.transitions || []
            };
        });

        return serialized;
    }
}

/**
 * Create a state machine from JSON configuration
 * Used by GameDev UI to define state machines visually
 */
export function createStateMachineFromConfig(actorId, config, handlers = {}) {
    const states = {};

    Object.entries(config.states || {}).forEach(([name, stateConfig]) => {
        states[name] = {
            transitions: stateConfig.transitions || [],
            onEnter: handlers[`${name}_enter`] || null,
            onUpdate: handlers[`${name}_update`] || null,
            onExit: handlers[`${name}_exit`] || null
        };
    });

    return new ActorStateMachine(actorId, {
        initial: config.initial || 'idle',
        states
    });
}
