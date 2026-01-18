/**
 * @fileoverview LogicInterpreter - Executes visual scripting node graphs at runtime
 * @context Engine/llms.txt
 * 
 * This is the runtime that makes GameDev UI visual scripting actually work.
 * It loads .logic.json files and executes nodes following wire connections.
 */

export class LogicInterpreter {
    constructor() {
        this.logicSheets = new Map(); // actorId -> { nodes, connections }
        this.nodeCache = new Map();   // Quick lookup by nodeId
        this.connectionCache = new Map(); // outputKey -> [inputKeys]
        this.dataCache = new Map();   // Runtime data values
    }

    /**
     * Load a logic sheet for an actor
     * @param {string} actorId - Actor identifier (e.g., "Ball")
     * @param {Object} logicData - Parsed .logic.json content
     */
    loadLogicSheet(actorId, logicData) {
        this.logicSheets.set(actorId, logicData);

        // Build node lookup cache
        const nodeMap = new Map();
        for (const node of logicData.nodes || []) {
            nodeMap.set(node.id, node);
        }
        this.nodeCache.set(actorId, nodeMap);

        // Build connection cache (output -> inputs)
        const connMap = new Map();
        for (const conn of logicData.connections || []) {
            const outKey = `${conn.from.nodeId}.${conn.from.outputId}`;
            if (!connMap.has(outKey)) {
                connMap.set(outKey, []);
            }
            connMap.get(outKey).push({
                nodeId: conn.to.nodeId,
                inputId: conn.to.inputId
            });
        }
        this.connectionCache.set(actorId, connMap);

        console.log(`[LogicInterpreter] Loaded logic for ${actorId}: ${logicData.nodes?.length} nodes, ${logicData.connections?.length} connections`);
    }

    /**
     * Execute OnUpdate event for an actor
     * @param {string} actorId 
     * @param {Object} actor - Actor instance with x, y, etc.
     * @param {number} deltaTime 
     * @param {Object} context - Game context (audioManager, etc.)
     */
    executeOnUpdate(actorId, actor, deltaTime, context) {
        const sheet = this.logicSheets.get(actorId);
        if (!sheet) return;

        const nodeMap = this.nodeCache.get(actorId);

        // Find all OnUpdate event nodes
        for (const node of sheet.nodes) {
            if (node.type === 'event' && node.subtype === 'OnUpdate') {
                // Provide deltaTime as output data
                this.setNodeOutput(actorId, node.id, 'deltaTime', deltaTime);

                // Follow execution wire
                this.executeFromOutput(actorId, node.id, 'exec', actor, context);
            }
        }
    }

    /**
     * Execute OnCollision event for an actor
     * @param {string} actorId 
     * @param {Object} actor - The actor that owns this logic
     * @param {Object} other - The other actor in the collision
     * @param {string} otherTag - Tag of the other actor (e.g., "paddle", "wall")
     * @param {Object} context - Game context
     */
    executeOnCollision(actorId, actor, other, otherTag, context) {
        const sheet = this.logicSheets.get(actorId);
        if (!sheet) return;

        for (const node of sheet.nodes) {
            if (node.type === 'event' && node.subtype === 'OnCollision') {
                // Check if this event targets this specific tag
                const targetTag = node.properties?.targetTag;
                if (targetTag && targetTag !== otherTag) continue;

                // Provide collider as output data
                this.setNodeOutput(actorId, node.id, 'collider', other);

                // Follow execution wire
                this.executeFromOutput(actorId, node.id, 'exec', actor, context);
            }
        }
    }

    /**
     * Execute OnOutOfBounds event
     * @param {string} actorId 
     * @param {Object} actor 
     * @param {string} edge - "top", "bottom", "left", "right"
     * @param {Object} context 
     */
    executeOnOutOfBounds(actorId, actor, edge, context) {
        const sheet = this.logicSheets.get(actorId);
        if (!sheet) return;

        for (const node of sheet.nodes) {
            if (node.type === 'event' && node.subtype === 'OnOutOfBounds') {
                const targetEdge = node.properties?.edge;
                if (targetEdge && targetEdge !== edge) continue;

                this.executeFromOutput(actorId, node.id, 'exec', actor, context);
            }
        }
    }

    /**
     * Follow execution wires from an output
     */
    executeFromOutput(actorId, nodeId, outputId, actor, context) {
        const connMap = this.connectionCache.get(actorId);
        const nodeMap = this.nodeCache.get(actorId);
        const outKey = `${nodeId}.${outputId}`;

        const targets = connMap?.get(outKey) || [];
        for (const target of targets) {
            const targetNode = nodeMap.get(target.nodeId);
            if (!targetNode) continue;

            // Execute the target node
            this.executeNode(actorId, targetNode, actor, context);
        }
    }

    /**
     * Execute a single node
     */
    executeNode(actorId, node, actor, context) {
        switch (node.type) {
            case 'action':
                this.executeAction(actorId, node, actor, context);
                break;
            case 'logic':
                this.evaluateLogic(actorId, node, actor, context);
                break;
            case 'flow':
                this.executeFlow(actorId, node, actor, context);
                break;
            case 'cast':
                this.executeCast(actorId, node, actor, context);
                break;
            case 'variable':
                // Variable nodes are evaluated on-demand when their output is read
                break;
        }
    }

    /**
     * Execute an Action node
     */
    executeAction(actorId, node, actor, context) {
        const props = node.properties || {};

        switch (node.subtype) {
            case 'Move': {
                const dx = this.getInputValue(actorId, node.id, 'dx', actor, context) || 0;
                const dy = this.getInputValue(actorId, node.id, 'dy', actor, context) || 0;
                actor.x += dx * (context.deltaTime || 0.016);
                actor.y += dy * (context.deltaTime || 0.016);
                break;
            }

            case 'SetPosition': {
                actor.x = props.x ?? actor.x;
                actor.y = props.y ?? actor.y;
                break;
            }

            case 'SetVariable': {
                const varName = props.variableName;
                const operation = props.operation || 'set';
                const value = props.value;
                const current = actor.variables?.[varName] ?? 0;

                let newValue;
                switch (operation) {
                    case 'set': newValue = value; break;
                    case 'add': newValue = current + value; break;
                    case 'multiply': newValue = current * value; break;
                    default: newValue = value;
                }

                if (props.max !== undefined) newValue = Math.min(newValue, props.max);
                if (props.min !== undefined) newValue = Math.max(newValue, props.min);

                if (!actor.variables) actor.variables = {};
                actor.variables[varName] = newValue;
                break;
            }

            case 'PlaySound': {
                if (context.audioManager) {
                    context.audioManager.playSFX(props.soundId, props.volume ?? 0.5);
                }
                break;
            }

            case 'AddScore': {
                if (context.gameState) {
                    const target = props.target || 'score';
                    context.gameState[target] = (context.gameState[target] || 0) + (props.amount || 1);
                }
                break;
            }

            case 'ResetPosition': {
                actor.x = props.x ?? actor.startX ?? 540;
                actor.y = props.y ?? actor.startY ?? 960;
                if (props.resetSpeed && actor.variables) {
                    actor.variables.speed = actor.variables.defaultSpeed || 600;
                }
                if (props.newDirectionY !== undefined && actor.variables) {
                    actor.variables.directionY = props.newDirectionY;
                }
                break;
            }

            case 'Bounce': {
                // Reverse direction based on axis
                if (actor.variables) {
                    if (props.axis === 'x' || props.axis === 'both') {
                        actor.variables.directionX = -(actor.variables.directionX || 1);
                    }
                    if (props.axis === 'y' || props.axis === 'both') {
                        actor.variables.directionY = -(actor.variables.directionY || 1);
                    }
                }
                break;
            }

            case 'AdjustAngle': {
                // Placeholder for angle adjustment logic
                break;
            }
        }

        // Continue execution chain
        this.executeFromOutput(actorId, node.id, 'exec', actor, context);
    }

    /**
     * Evaluate a Logic node (pure function)
     */
    evaluateLogic(actorId, node, actor, context) {
        const a = this.getInputValue(actorId, node.id, 'a', actor, context) ?? 0;
        const b = this.getInputValue(actorId, node.id, 'b', actor, context) ?? 0;

        let result;
        switch (node.subtype) {
            case 'Add': result = a + b; break;
            case 'Subtract': result = a - b; break;
            case 'Multiply': result = a * b; break;
            case 'Divide': result = b !== 0 ? a / b : 0; break;
            case 'Compare': result = a === b; break;
            case 'GreaterThan': result = a > b; break;
            case 'LessThan': result = a < b; break;
            case 'Clamp': {
                const value = this.getInputValue(actorId, node.id, 'value', actor, context) ?? 0;
                const min = this.getInputValue(actorId, node.id, 'min', actor, context) ?? 0;
                const max = this.getInputValue(actorId, node.id, 'max', actor, context) ?? 1;
                result = Math.max(min, Math.min(max, value));
                break;
            }
            default: result = 0;
        }

        this.setNodeOutput(actorId, node.id, 'result', result);
        return result;
    }

    /**
     * Execute a Flow node
     */
    executeFlow(actorId, node, actor, context) {
        switch (node.subtype) {
            case 'Branch': {
                const condition = this.getInputValue(actorId, node.id, 'condition', actor, context);
                const outputId = condition ? 'true' : 'false';
                this.executeFromOutput(actorId, node.id, outputId, actor, context);
                break;
            }
            case 'Sequence': {
                // Execute all outputs in order
                this.executeFromOutput(actorId, node.id, 'out1', actor, context);
                this.executeFromOutput(actorId, node.id, 'out2', actor, context);
                break;
            }
        }
    }

    /**
     * Execute a Cast node
     */
    executeCast(actorId, node, actor, context) {
        const inputActor = this.getInputValue(actorId, node.id, 'actor', actor, context);

        switch (node.subtype) {
            case 'IsPlayer':
                this.setNodeOutput(actorId, node.id, 'isValid', inputActor?.tag === 'player');
                this.setNodeOutput(actorId, node.id, 'player', inputActor?.tag === 'player' ? inputActor : null);
                break;
            case 'IsBall':
                this.setNodeOutput(actorId, node.id, 'isValid', inputActor?.tag === 'ball');
                this.setNodeOutput(actorId, node.id, 'ball', inputActor?.tag === 'ball' ? inputActor : null);
                break;
            case 'IsEnemy':
                this.setNodeOutput(actorId, node.id, 'isValid', inputActor?.tag === 'enemy');
                this.setNodeOutput(actorId, node.id, 'enemy', inputActor?.tag === 'enemy' ? inputActor : null);
                break;
            case 'ToString':
                const value = this.getInputValue(actorId, node.id, 'value', actor, context);
                this.setNodeOutput(actorId, node.id, 'text', String(value));
                break;
            case 'ToNumber':
                const text = this.getInputValue(actorId, node.id, 'value', actor, context);
                this.setNodeOutput(actorId, node.id, 'number', parseFloat(text) || 0);
                break;
        }
    }

    /**
     * Get the value of an input by following wires backwards
     */
    getInputValue(actorId, nodeId, inputId, actor, context) {
        const connMap = this.connectionCache.get(actorId);
        const nodeMap = this.nodeCache.get(actorId);

        // Find what's connected to this input (reverse lookup)
        for (const [outKey, targets] of connMap?.entries() || []) {
            for (const target of targets) {
                if (target.nodeId === nodeId && target.inputId === inputId) {
                    // Found the source - get its output value
                    const [sourceNodeId, sourceOutputId] = outKey.split('.');
                    const sourceNode = nodeMap.get(sourceNodeId);

                    if (sourceNode?.type === 'variable' && sourceNode.subtype === 'GetVariable') {
                        // Read from actor variables
                        const varName = sourceNode.properties?.variableName;
                        return actor.variables?.[varName] ?? sourceNode.properties?.defaultValue ?? 0;
                    }

                    if (sourceNode?.type === 'logic') {
                        // Evaluate the logic node first
                        return this.evaluateLogic(actorId, sourceNode, actor, context);
                    }

                    // Return cached output
                    return this.getNodeOutput(actorId, sourceNodeId, sourceOutputId);
                }
            }
        }

        return undefined;
    }

    /**
     * Store node output in cache
     */
    setNodeOutput(actorId, nodeId, outputId, value) {
        const key = `${actorId}.${nodeId}.${outputId}`;
        this.dataCache.set(key, value);
    }

    /**
     * Get node output from cache
     */
    getNodeOutput(actorId, nodeId, outputId) {
        const key = `${actorId}.${nodeId}.${outputId}`;
        return this.dataCache.get(key);
    }

    /**
     * Clear all data for a frame (optional, for debugging)
     */
    clearFrame() {
        this.dataCache.clear();
    }
}
