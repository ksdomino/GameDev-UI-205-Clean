/**
 * @fileoverview VariableManager - Manages actor variables from .variables.json
 * @context Engine/llms.txt
 * 
 * Loads variable definitions from .variables.json and provides a runtime API
 * for reading and writing variable values. Respects min/max constraints.
 */

export class VariableManager {
    constructor() {
        this.definitions = new Map(); // actorId -> { variableName -> { type, default, min, max, ... } }
        this.runtimeValues = new Map(); // "actorId.varName" -> current value
    }

    /**
     * Load variable definitions from a .variables.json structure
     * @param {string} actorId 
     * @param {Object} variablesData - Parsed .variables.json content
     */
    loadDefinitions(actorId, variablesData) {
        this.definitions.set(actorId, variablesData.variables || {});

        // Initialize runtime values with defaults
        for (const [varName, def] of Object.entries(variablesData.variables || {})) {
            const key = `${actorId}.${varName}`;
            this.runtimeValues.set(key, def.default);
        }

        console.log(`[VariableManager] Loaded ${Object.keys(variablesData.variables || {}).length} variables for ${actorId}`);
    }

    /**
     * Create an instance of variables for an actor (for per-instance state)
     * @param {string} actorId 
     * @param {string} instanceId - Unique instance identifier
     * @returns {Object} - Variables object with all defaults
     */
    createInstance(actorId, instanceId) {
        const defs = this.definitions.get(actorId);
        if (!defs) {
            console.warn(`[VariableManager] No definitions found for ${actorId}`);
            return {};
        }

        const instance = {};
        for (const [varName, def] of Object.entries(defs)) {
            instance[varName] = def.default;
        }

        return instance;
    }

    /**
     * Get a variable value
     * @param {string} actorId 
     * @param {string} varName 
     * @param {Object} instanceVars - Optional per-instance variables
     * @returns {*}
     */
    get(actorId, varName, instanceVars = null) {
        // Prefer instance variables if provided
        if (instanceVars && varName in instanceVars) {
            return instanceVars[varName];
        }

        // Fall back to global/default
        const key = `${actorId}.${varName}`;
        if (this.runtimeValues.has(key)) {
            return this.runtimeValues.get(key);
        }

        // Return default from definition
        const defs = this.definitions.get(actorId);
        return defs?.[varName]?.default;
    }

    /**
     * Set a variable value (respects min/max constraints)
     * @param {string} actorId 
     * @param {string} varName 
     * @param {*} value 
     * @param {Object} instanceVars - Optional per-instance variables to modify
     */
    set(actorId, varName, value, instanceVars = null) {
        const defs = this.definitions.get(actorId);
        const def = defs?.[varName];

        // Apply constraints for numbers
        if (def?.type === 'number') {
            if (def.min !== undefined) value = Math.max(def.min, value);
            if (def.max !== undefined) value = Math.min(def.max, value);
        }

        // Store in instance if provided
        if (instanceVars) {
            instanceVars[varName] = value;
            return;
        }

        // Store globally
        const key = `${actorId}.${varName}`;
        this.runtimeValues.set(key, value);
    }

    /**
     * Get variable definition (for UI introspection)
     * @param {string} actorId 
     * @param {string} varName 
     * @returns {Object|null}
     */
    getDefinition(actorId, varName) {
        const defs = this.definitions.get(actorId);
        return defs?.[varName] || null;
    }

    /**
     * Get all variable definitions for an actor
     * @param {string} actorId 
     * @returns {Object}
     */
    getAllDefinitions(actorId) {
        return this.definitions.get(actorId) || {};
    }

    /**
     * Get all variable values for an actor (for saving/serialization)
     * @param {string} actorId 
     * @param {Object} instanceVars 
     * @returns {Object}
     */
    serialize(actorId, instanceVars = null) {
        if (instanceVars) {
            return { ...instanceVars };
        }

        const defs = this.definitions.get(actorId);
        const serialized = {};
        for (const varName of Object.keys(defs || {})) {
            const key = `${actorId}.${varName}`;
            serialized[varName] = this.runtimeValues.get(key);
        }
        return serialized;
    }

    /**
     * Restore variable values from serialized data
     * @param {string} actorId 
     * @param {Object} data 
     * @param {Object} instanceVars 
     */
    deserialize(actorId, data, instanceVars = null) {
        for (const [varName, value] of Object.entries(data)) {
            this.set(actorId, varName, value, instanceVars);
        }
    }
}
