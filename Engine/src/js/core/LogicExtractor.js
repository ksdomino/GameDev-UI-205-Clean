/**
 * LogicExtractor - Introspects game scenes and extracts actors/variables/logic
 * 
 * This class analyzes ConfigurableScene data and generates:
 * - Actor list (entities that can have logic)
 * - Variable definitions per actor
 * - Default logic node graphs based on entity type
 */
export class LogicExtractor {
    constructor() {
        // Node ID counter for generating unique IDs
        this.nodeIdCounter = 0;
    }

    /**
     * Reset the ID counter (call before extracting a new scene)
     */
    reset() {
        this.nodeIdCounter = 0;
    }

    /**
     * Generate a unique node ID
     */
    generateNodeId() {
        return `node_${++this.nodeIdCounter}`;
    }

    /**
     * Extract all actors from a scene configuration
     * @param {Object} sceneConfig - The scene JSON configuration
     * @returns {Array} Array of actor objects
     */
    extractActors(sceneConfig) {
        const actors = [];
        const seenIds = new Set();

        // Iterate through all states and layers
        for (const state of sceneConfig.states || []) {
            for (const layerName in state.layers || {}) {
                const entities = state.layers[layerName] || [];

                for (const entity of entities) {
                    // Skip if we've already processed this ID
                    if (seenIds.has(entity.id)) continue;
                    seenIds.add(entity.id);

                    // Convert entity to actor
                    const actor = this.entityToActor(entity, layerName);
                    if (actor) {
                        actors.push(actor);
                    }
                }
            }
        }

        return actors;
    }

    /**
     * Convert an entity to an actor with variables and logic sheet
     * @param {Object} entity - The entity from scene config
     * @param {string} layerName - The layer the entity is on
     * @returns {Object} Actor object
     */
    entityToActor(entity, layerName) {
        const actorType = this.inferActorType(entity, layerName);

        const actor = {
            id: entity.id,
            type: actorType,
            entityType: entity.type, // sprite, button, text, shape
            layer: layerName,
            sprite: entity.type === 'sprite' ? {
                assetId: entity.assetId,
                width: entity.width,
                height: entity.height
            } : null,
            variables: this.extractVariables(entity),
            logicSheet: {
                nodes: [],
                connections: []
            }
        };

        // Generate default logic based on actor type
        actor.logicSheet = this.generateDefaultLogic(actor, entity);

        return actor;
    }

    /**
     * Infer the actor type based on entity properties
     * @param {Object} entity - The entity
     * @param {string} layerName - The layer name
     * @returns {string} Actor type (ball, paddle, background, button, text, etc.)
     */
    inferActorType(entity, layerName) {
        const id = (entity.id || '').toLowerCase();
        const type = entity.type;

        // Check for common game object patterns
        if (id.includes('ball') || id.includes('projectile')) return 'ball';
        if (id.includes('paddle') || id.includes('player')) return 'paddle';
        if (id.includes('enemy') || id.includes('ai')) return 'enemy';
        if (id.includes('powerup') || id.includes('power')) return 'powerup';
        if (id.includes('score') || id.includes('counter')) return 'ui_score';

        // Check by layer
        if (layerName === 'BG_FAR' || layerName === 'BG_NEAR') return 'background';
        if (layerName === 'UI_BUTTONS') return 'ui_button';

        // Check by entity type
        if (type === 'button') return 'ui_button';
        if (type === 'text') return 'ui_text';
        if (type === 'shape') return 'shape';

        // Default
        return 'sprite';
    }

    /**
     * Extract variables from an entity
     * @param {Object} entity - The entity
     * @returns {Object} Variables dictionary
     */
    extractVariables(entity) {
        const variables = {};

        // Position variables
        variables.positionX = { type: 'number', value: entity.x || 0, editable: true };
        variables.positionY = { type: 'number', value: entity.y || 0, editable: true };

        // Size variables
        if (entity.width) {
            variables.width = { type: 'number', value: entity.width, editable: true };
        }
        if (entity.height) {
            variables.height = { type: 'number', value: entity.height, editable: true };
        }

        // Transform variables
        variables.alpha = { type: 'number', value: entity.alpha ?? 1, editable: true };
        variables.rotation = { type: 'number', value: entity.rotation ?? 0, editable: true };
        variables.visible = { type: 'boolean', value: entity.visible ?? true, editable: true };

        // Entity-specific variables
        if (entity.type === 'text') {
            variables.content = { type: 'string', value: entity.content || '', editable: true };
            variables.fontSize = { type: 'number', value: entity.fontSize || 48, editable: true };
        }

        if (entity.type === 'button') {
            variables.text = { type: 'string', value: entity.text || '', editable: true };
        }

        // Custom variables from entity
        if (entity.variables) {
            for (const [key, value] of Object.entries(entity.variables)) {
                variables[key] = {
                    type: typeof value,
                    value: value,
                    editable: true,
                    custom: true
                };
            }
        }

        return variables;
    }

    /**
     * Generate default logic nodes based on actor type
     * @param {Object} actor - The actor object
     * @param {Object} entity - The original entity
     * @returns {Object} Logic sheet with nodes and connections
     */
    generateDefaultLogic(actor, entity) {
        const nodes = [];
        const connections = [];

        switch (actor.type) {
            case 'ball':
                this.generateBallLogic(nodes, connections, actor);
                break;
            case 'paddle':
                this.generatePaddleLogic(nodes, connections, actor);
                break;
            case 'powerup':
                this.generatePowerupLogic(nodes, connections, actor);
                break;
            case 'ui_button':
                this.generateButtonLogic(nodes, connections, actor, entity);
                break;
            default:
                // Basic update event for all actors
                this.generateBasicLogic(nodes, connections, actor);
        }

        return { nodes, connections };
    }

    /**
     * Generate ball-specific logic (bounce on collision)
     */
    generateBallLogic(nodes, connections, actor) {
        // OnUpdate event
        const updateNode = {
            id: this.generateNodeId(),
            type: 'event',
            subtype: 'OnUpdate',
            position: { x: 50, y: 100 },
            inputs: [],
            outputs: [
                { id: 'out_exec', type: 'execution', label: '→' },
                { id: 'out_delta', type: 'number', label: 'deltaTime' }
            ],
            properties: {}
        };
        nodes.push(updateNode);

        // OnCollision event with Wall
        const collisionWallNode = {
            id: this.generateNodeId(),
            type: 'event',
            subtype: 'OnCollision',
            position: { x: 50, y: 250 },
            inputs: [],
            outputs: [
                { id: 'out_exec', type: 'execution', label: '→' },
                { id: 'out_other', type: 'actor', label: 'Other' }
            ],
            properties: { targetTag: 'Wall' }
        };
        nodes.push(collisionWallNode);

        // Flip direction action
        const flipNode = {
            id: this.generateNodeId(),
            type: 'action',
            subtype: 'FlipVariable',
            position: { x: 300, y: 250 },
            inputs: [
                { id: 'in_exec', type: 'execution', label: '→' }
            ],
            outputs: [
                { id: 'out_exec', type: 'execution', label: '→' }
            ],
            properties: { variable: 'directionY' }
        };
        nodes.push(flipNode);

        // Connect collision to flip
        connections.push({
            id: `conn_${connections.length + 1}`,
            from: { nodeId: collisionWallNode.id, outputId: 'out_exec' },
            to: { nodeId: flipNode.id, inputId: 'in_exec' }
        });

        // OnCollision with Paddle
        const collisionPaddleNode = {
            id: this.generateNodeId(),
            type: 'event',
            subtype: 'OnCollision',
            position: { x: 50, y: 400 },
            inputs: [],
            outputs: [
                { id: 'out_exec', type: 'execution', label: '→' },
                { id: 'out_other', type: 'actor', label: 'Other' }
            ],
            properties: { targetTag: 'Paddle' }
        };
        nodes.push(collisionPaddleNode);

        // Play sound action
        const soundNode = {
            id: this.generateNodeId(),
            type: 'action',
            subtype: 'PlaySound',
            position: { x: 300, y: 400 },
            inputs: [
                { id: 'in_exec', type: 'execution', label: '→' }
            ],
            outputs: [
                { id: 'out_exec', type: 'execution', label: '→' }
            ],
            properties: { sound: 'hit', frequency: 400, duration: 0.05 }
        };
        nodes.push(soundNode);

        // Connect paddle collision to sound
        connections.push({
            id: `conn_${connections.length + 1}`,
            from: { nodeId: collisionPaddleNode.id, outputId: 'out_exec' },
            to: { nodeId: soundNode.id, inputId: 'in_exec' }
        });

        // Add ball-specific variables
        actor.variables.directionX = { type: 'number', value: 1, editable: true };
        actor.variables.directionY = { type: 'number', value: 1, editable: true };
        actor.variables.speed = { type: 'number', value: 800, editable: true };
    }

    /**
     * Generate paddle-specific logic (input movement)
     */
    generatePaddleLogic(nodes, connections, actor) {
        // OnUpdate event
        const updateNode = {
            id: this.generateNodeId(),
            type: 'event',
            subtype: 'OnUpdate',
            position: { x: 50, y: 100 },
            inputs: [],
            outputs: [
                { id: 'out_exec', type: 'execution', label: '→' },
                { id: 'out_delta', type: 'number', label: 'deltaTime' }
            ],
            properties: {}
        };
        nodes.push(updateNode);

        // Get touch input
        const inputNode = {
            id: this.generateNodeId(),
            type: 'variable',
            subtype: 'GetInput',
            position: { x: 300, y: 100 },
            inputs: [
                { id: 'in_exec', type: 'execution', label: '→' }
            ],
            outputs: [
                { id: 'out_exec', type: 'execution', label: '→' },
                { id: 'out_x', type: 'number', label: 'Touch X' },
                { id: 'out_y', type: 'number', label: 'Touch Y' }
            ],
            properties: { inputType: 'touch' }
        };
        nodes.push(inputNode);

        // Set position
        const setPositionNode = {
            id: this.generateNodeId(),
            type: 'action',
            subtype: 'SetVariable',
            position: { x: 550, y: 100 },
            inputs: [
                { id: 'in_exec', type: 'execution', label: '→' },
                { id: 'in_value', type: 'number', label: 'Value' }
            ],
            outputs: [
                { id: 'out_exec', type: 'execution', label: '→' }
            ],
            properties: { variable: 'positionX' }
        };
        nodes.push(setPositionNode);

        // Connect update → input → setPosition
        connections.push({
            id: `conn_${connections.length + 1}`,
            from: { nodeId: updateNode.id, outputId: 'out_exec' },
            to: { nodeId: inputNode.id, inputId: 'in_exec' }
        });
        connections.push({
            id: `conn_${connections.length + 1}`,
            from: { nodeId: inputNode.id, outputId: 'out_exec' },
            to: { nodeId: setPositionNode.id, inputId: 'in_exec' }
        });
        connections.push({
            id: `conn_${connections.length + 1}`,
            from: { nodeId: inputNode.id, outputId: 'out_x' },
            to: { nodeId: setPositionNode.id, inputId: 'in_value' }
        });

        // Add paddle-specific variables
        actor.variables.moveSpeed = { type: 'number', value: 1000, editable: true };
        actor.variables.isPlayer = { type: 'boolean', value: true, editable: true };
    }

    /**
     * Generate powerup-specific logic (collect on collision)
     */
    generatePowerupLogic(nodes, connections, actor) {
        // OnCollision with Player
        const collisionNode = {
            id: this.generateNodeId(),
            type: 'event',
            subtype: 'OnCollision',
            position: { x: 50, y: 100 },
            inputs: [],
            outputs: [
                { id: 'out_exec', type: 'execution', label: '→' },
                { id: 'out_other', type: 'actor', label: 'Collector' }
            ],
            properties: { targetTag: 'Player' }
        };
        nodes.push(collisionNode);

        // Play collect sound
        const soundNode = {
            id: this.generateNodeId(),
            type: 'action',
            subtype: 'PlaySound',
            position: { x: 300, y: 100 },
            inputs: [
                { id: 'in_exec', type: 'execution', label: '→' }
            ],
            outputs: [
                { id: 'out_exec', type: 'execution', label: '→' }
            ],
            properties: { sound: 'powerup', frequency: 600, duration: 0.1 }
        };
        nodes.push(soundNode);

        // Destroy self
        const destroyNode = {
            id: this.generateNodeId(),
            type: 'action',
            subtype: 'DestroyActor',
            position: { x: 550, y: 100 },
            inputs: [
                { id: 'in_exec', type: 'execution', label: '→' }
            ],
            outputs: [],
            properties: { target: 'self' }
        };
        nodes.push(destroyNode);

        // Connect collision → sound → destroy
        connections.push({
            id: `conn_${connections.length + 1}`,
            from: { nodeId: collisionNode.id, outputId: 'out_exec' },
            to: { nodeId: soundNode.id, inputId: 'in_exec' }
        });
        connections.push({
            id: `conn_${connections.length + 1}`,
            from: { nodeId: soundNode.id, outputId: 'out_exec' },
            to: { nodeId: destroyNode.id, inputId: 'in_exec' }
        });

        // Add powerup-specific variables
        actor.variables.effectType = { type: 'string', value: 'grow', editable: true };
        actor.variables.effectDuration = { type: 'number', value: 10, editable: true };
    }

    /**
     * Generate button-specific logic (onClick action)
     */
    generateButtonLogic(nodes, connections, actor, entity) {
        // OnClick event
        const clickNode = {
            id: this.generateNodeId(),
            type: 'event',
            subtype: 'OnClick',
            position: { x: 50, y: 100 },
            inputs: [],
            outputs: [
                { id: 'out_exec', type: 'execution', label: '→' }
            ],
            properties: {}
        };
        nodes.push(clickNode);

        // Determine action from entity
        if (entity.onClick) {
            const actionNode = {
                id: this.generateNodeId(),
                type: 'action',
                subtype: entity.onClick.action === 'switchScene' ? 'SwitchScene' :
                    entity.onClick.action === 'switchState' ? 'SwitchState' :
                        entity.onClick.action === 'playSound' ? 'PlaySound' : 'Custom',
                position: { x: 300, y: 100 },
                inputs: [
                    { id: 'in_exec', type: 'execution', label: '→' }
                ],
                outputs: [
                    { id: 'out_exec', type: 'execution', label: '→' }
                ],
                properties: { target: entity.onClick.target }
            };
            nodes.push(actionNode);

            connections.push({
                id: `conn_${connections.length + 1}`,
                from: { nodeId: clickNode.id, outputId: 'out_exec' },
                to: { nodeId: actionNode.id, inputId: 'in_exec' }
            });
        }
    }

    /**
     * Generate basic logic for generic actors
     */
    generateBasicLogic(nodes, connections, actor) {
        // Just an OnUpdate event as a starting point
        const updateNode = {
            id: this.generateNodeId(),
            type: 'event',
            subtype: 'OnUpdate',
            position: { x: 50, y: 100 },
            inputs: [],
            outputs: [
                { id: 'out_exec', type: 'execution', label: '→' },
                { id: 'out_delta', type: 'number', label: 'deltaTime' }
            ],
            properties: {}
        };
        nodes.push(updateNode);
    }

    /**
     * Export actors to JSON format for communication with GameDev UI
     * @param {Array} actors - Array of actor objects
     * @returns {Object} JSON-serializable actor data
     */
    exportActorsToJSON(actors) {
        return {
            actors: actors.map(actor => ({
                id: actor.id,
                type: actor.type,
                entityType: actor.entityType,
                layer: actor.layer,
                sprite: actor.sprite,
                variableCount: Object.keys(actor.variables).length,
                nodeCount: actor.logicSheet.nodes.length,
                connectionCount: actor.logicSheet.connections.length
            })),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Export a single actor's full logic sheet
     * @param {Object} actor - The actor object
     * @returns {Object} Full logic sheet data
     */
    exportLogicSheet(actor) {
        return {
            actorId: actor.id,
            actorType: actor.type,
            variables: actor.variables,
            nodes: actor.logicSheet.nodes,
            connections: actor.logicSheet.connections,
            timestamp: new Date().toISOString()
        };
    }
}
