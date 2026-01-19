/**
 * NodeExecutor - Runtime that reads node graphs and executes game logic
 * 
 * This class takes a logic sheet (nodes + connections) and executes it
 * in the context of a running game. It handles:
 * - Event triggering (OnUpdate, OnCollision, OnClick, etc.)
 * - Node traversal following execution connections
 * - Variable get/set operations
 * - Action execution (SpawnActor, PlaySound, DestroyActor, etc.)
 */
export class NodeExecutor {
    constructor(engine) {
        this.engine = engine;
        this.actors = new Map(); // actorId -> actor data with logicSheet
        this.activeVariables = new Map(); // actorId -> variables state
        this.pendingEvents = []; // Queue of events to process
    }

    /**
     * Register an actor for logic execution
     * @param {Object} actor - Actor object with logicSheet
     */
    registerActor(actor) {
        this.actors.set(actor.id, actor);

        // Initialize variables state
        const variables = {};
        for (const [key, def] of Object.entries(actor.variables || {})) {
            variables[key] = def.value;
        }
        this.activeVariables.set(actor.id, variables);
    }

    /**
     * Unregister an actor
     * @param {string} actorId - Actor ID
     */
    unregisterActor(actorId) {
        this.actors.delete(actorId);
        this.activeVariables.delete(actorId);
    }

    /**
     * Hot-reload: Update an actor's logic sheet at runtime
     * @param {string} actorId - Actor ID
     * @param {Object} logicSheet - New logic sheet data
     */
    updateLogicSheet(actorId, logicSheet) {
        const actor = this.actors.get(actorId);
        if (actor) {
            actor.logicSheet = logicSheet;
            console.log(`[NodeExecutor] Updated logic sheet for ${actorId}:`, logicSheet.nodes?.length, 'nodes,', logicSheet.connections?.length, 'connections');
        } else {
            console.warn(`[NodeExecutor] Cannot update logic: Actor ${actorId} not registered`);
        }
    }

    /**
     * Get a variable value for an actor
     * @param {string} actorId - Actor ID
     * @param {string} variableName - Variable name
     * @returns {*} Variable value
     */
    getVariable(actorId, variableName) {
        const vars = this.activeVariables.get(actorId);
        return vars ? vars[variableName] : undefined;
    }

    /**
     * Set a variable value for an actor
     * @param {string} actorId - Actor ID
     * @param {string} variableName - Variable name
     * @param {*} value - New value
     */
    setVariable(actorId, variableName, value) {
        const vars = this.activeVariables.get(actorId);
        if (vars) {
            vars[variableName] = value;
        }
    }

    /**
     * Trigger an event for an actor (e.g., OnUpdate, OnCollision)
     * @param {string} actorId - Actor ID
     * @param {string} eventType - Event subtype (OnUpdate, OnCollision, etc.)
     * @param {Object} eventData - Additional event data
     */
    triggerEvent(actorId, eventType, eventData = {}) {
        const actor = this.actors.get(actorId);
        if (!actor || !actor.logicSheet) return;

        // Find event nodes of this type
        const eventNodes = actor.logicSheet.nodes.filter(
            node => node.type === 'event' && node.subtype === eventType
        );

        for (const eventNode of eventNodes) {
            // Check if event matches properties (e.g., targetTag for OnCollision)
            if (this.eventMatchesProperties(eventNode, eventData)) {
                // Execute the node chain starting from this event
                this.executeFromNode(actorId, eventNode, eventData);
            }
        }
    }

    /**
     * Check if an event matches node properties
     */
    eventMatchesProperties(eventNode, eventData) {
        const props = eventNode.properties || {};

        // Check targetTag for collision events
        if (eventNode.subtype === 'OnCollision' && props.targetTag) {
            const otherActorType = eventData.otherActorType || '';
            const otherActorId = eventData.otherActorId || '';

            // Match by type or ID containing the tag
            if (!otherActorType.toLowerCase().includes(props.targetTag.toLowerCase()) &&
                !otherActorId.toLowerCase().includes(props.targetTag.toLowerCase())) {
                return false;
            }
        }

        return true;
    }

    /**
     * Execute node chain starting from a given node
     * @param {string} actorId - Actor ID
     * @param {Object} startNode - Starting node
     * @param {Object} context - Execution context (event data, etc.)
     */
    executeFromNode(actorId, startNode, context = {}) {
        const actor = this.actors.get(actorId);
        if (!actor) return;

        // Build connection map for quick lookup
        const connectionMap = this.buildConnectionMap(actor.logicSheet.connections);

        // Execute recursively following execution connections
        // Pass connectionMap and nodes in context for data input resolution
        const execContext = {
            ...context,
            _connectionMap: connectionMap,
            _allNodes: actor.logicSheet.nodes
        };
        this.executeNode(actorId, startNode, execContext, connectionMap, actor.logicSheet.nodes);
    }

    /**
     * Build a map of connections for quick lookup
     */
    buildConnectionMap(connections) {
        const map = new Map();
        for (const conn of connections) {
            const key = `${conn.from.nodeId}:${conn.from.outputId}`;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(conn.to);
        }
        return map;
    }

    /**
     * Execute a single node and follow execution connections
     */
    executeNode(actorId, node, context, connectionMap, allNodes) {
        // Execute the node based on its type
        const result = this.executeNodeAction(actorId, node, context);

        // Find and execute connected nodes via execution outputs
        let execOutputs = (node.outputs || []).filter(o => o.type === 'execution');

        // Special handling for Branch nodes - only follow the matching branch
        if (node.subtype === 'Branch') {
            const branchResult = result.branchResult;
            execOutputs = execOutputs.filter(o =>
                (branchResult && o.id === 'true') || (!branchResult && o.id === 'false')
            );
        }

        for (const output of execOutputs) {
            const key = `${node.id}:${output.id}`;
            const targets = connectionMap.get(key) || [];

            for (const target of targets) {
                const nextNode = allNodes.find(n => n.id === target.nodeId);
                if (nextNode) {
                    // Pass result as additional context
                    this.executeNode(actorId, nextNode, { ...context, ...result }, connectionMap, allNodes);
                }
            }
        }
    }

    /**
     * Execute the action for a specific node type
     */
    executeNodeAction(actorId, node, context) {
        switch (node.type) {
            case 'event':
                return this.executeEventNode(actorId, node, context);

            case 'variable':
                return this.executeVariableNode(actorId, node, context);

            case 'logic':
                return this.executeLogicNode(actorId, node, context);

            case 'flow':
                return this.executeFlowNode(actorId, node, context);

            case 'action':
                return this.executeActionNode(actorId, node, context);

            default:
                console.warn(`[NodeExecutor] Unknown node type: ${node.type}`);
                return {};
        }
    }

    /**
     * Execute an event node (just passes through data)
     */
    executeEventNode(actorId, node, context) {
        // Event nodes mainly provide data to downstream nodes
        const result = { ...context };

        if (node.subtype === 'OnUpdate') {
            result.deltaTime = context.deltaTime || 0;
        } else if (node.subtype === 'OnCollision') {
            result.otherActor = context.otherActorId;
        }

        return result;
    }

    /**
     * Execute a variable node (get or set)
     */
    executeVariableNode(actorId, node, context) {
        const props = node.properties || {};

        switch (node.subtype) {
            case 'GetVariable':
                return { value: this.getVariable(actorId, props.variable) };

            case 'SetVariable':
                const newValue = context.inputValue ?? props.value;
                this.setVariable(actorId, props.variable, newValue);
                return { value: newValue };

            case 'GetInput':
                // Get input from engine
                const input = this.engine.inputHandler;
                return {
                    touchX: input.mouse.x,
                    touchY: input.mouse.y,
                    isPressed: input.mouse.down
                };

            default:
                return {};
        }
    }

    /**
     * Execute a logic/math node
     */
    executeLogicNode(actorId, node, context) {
        const props = node.properties || {};
        const a = context.inputA ?? props.a ?? 0;
        const b = context.inputB ?? props.b ?? 0;

        switch (node.subtype) {
            case 'NOT':
                return { value: !a };

            case 'AND':
                return { value: a && b };

            case 'OR':
                return { value: a || b };

            case 'GreaterThan':
                return { value: a > b };

            case 'LessThan':
                return { value: a < b };

            case 'Equal':
                return { value: a === b };

            case 'Add':
                return { value: a + b };

            case 'Subtract':
                return { value: a - b };

            case 'Multiply':
                return { value: a * b };

            case 'Divide':
                return { value: b !== 0 ? a / b : 0 };

            default:
                return {};
        }
    }

    /**
     * Execute a flow control node
     */
    executeFlowNode(actorId, node, context) {
        const props = node.properties || {};

        switch (node.subtype) {
            case 'Branch':
                // Get the condition value - check context first, then resolve from data input
                let condition = context.condition;

                // If condition not in context, try to resolve from connected data node
                if (condition === undefined && context._connectionMap && context._allNodes) {
                    // Find nodes connected to the 'condition' input
                    for (const [key, targets] of context._connectionMap) {
                        for (const target of targets) {
                            if (target.nodeId === node.id && target.inputId === 'condition') {
                                // Found a connection to our condition input
                                // Parse the key to get source node and output
                                const [sourceNodeId, sourceOutputId] = key.split(':');
                                const sourceNode = context._allNodes.find(n => n.id === sourceNodeId);
                                if (sourceNode) {
                                    // Execute the source node to get its value
                                    const sourceResult = this.executeNodeAction(actorId, sourceNode, context);
                                    condition = sourceResult.value;
                                }
                            }
                        }
                    }
                }

                console.log(`[NodeExecutor] Branch condition:`, condition);
                return { branchResult: !!condition };

            case 'Delay':
                // Queue delayed execution (simplified - would need proper timer)
                console.log(`[NodeExecutor] Delay ${props.duration}s`);
                return {};

            case 'Sequence':
                // Execute outputs in sequence (handled by connection traversal)
                return {};

            default:
                return {};
        }
    }

    /**
     * Execute an action node
     */
    executeActionNode(actorId, node, context) {
        const props = node.properties || {};

        switch (node.subtype) {
            case 'FlipVariable':
                const current = this.getVariable(actorId, props.variable);
                if (typeof current === 'boolean') {
                    this.setVariable(actorId, props.variable, !current);
                } else if (typeof current === 'number') {
                    this.setVariable(actorId, props.variable, -current);
                }
                return {};

            case 'SetVariable':
                const value = context.inputValue ?? props.value;
                this.setVariable(actorId, props.variable, value);
                return {};

            case 'PlaySound':
                if (this.engine.audioManager) {
                    const freq = props.frequency || 440;
                    const dur = props.duration || 0.1;
                    this.engine.audioManager.playBeep(freq, dur, 'square');
                }
                return {};

            case 'SwitchScene':
                if (this.engine.sceneManager && props.target) {
                    this.engine.sceneManager.switchTo(props.target);
                }
                return {};

            case 'SwitchState':
                // Would need reference to current scene
                console.log(`[NodeExecutor] Switch to state: ${props.target}`);
                return {};

            case 'SpawnActor':
                // Would need actor spawning system
                console.log(`[NodeExecutor] Spawn actor: ${props.actorType}`);
                return {};

            case 'DestroyActor':
                // Mark actor for destruction
                console.log(`[NodeExecutor] Destroy actor: ${props.target || actorId}`);
                return { destroyed: true };

            case 'Move':
                const dx = props.dx || 0;
                const dy = props.dy || 0;
                const currentX = this.getVariable(actorId, 'positionX') || 0;
                const currentY = this.getVariable(actorId, 'positionY') || 0;
                this.setVariable(actorId, 'positionX', currentX + dx * (context.deltaTime || 1));
                this.setVariable(actorId, 'positionY', currentY + dy * (context.deltaTime || 1));
                return {};

            case 'Scale':
                const factor = props.factor || 1;
                const currentWidth = this.getVariable(actorId, 'width') || 100;
                const currentHeight = this.getVariable(actorId, 'height') || 100;
                this.setVariable(actorId, 'width', currentWidth * factor);
                this.setVariable(actorId, 'height', currentHeight * factor);
                return {};

            case 'SetColor':
                // Set actor's color variable (for rendering)
                const newColor = props.color || '#ffffff';
                this.setVariable(actorId, 'color', newColor);
                console.log(`[NodeExecutor] SetColor: ${actorId} -> ${newColor}`);

                // Also update the actual entity in the scene
                const currentScene = this.engine.sceneManager?.currentScene;
                if (currentScene && currentScene.entities) {
                    // Try to find entity by actorId or entityRef
                    let entity = currentScene.entities.get(actorId);
                    if (!entity) {
                        // Check if actor has an entityRef
                        const actor = this.actors.get(actorId);
                        if (actor && actor.entityRef) {
                            entity = currentScene.entities.get(actor.entityRef);
                        }
                    }
                    if (entity) {
                        entity.color = newColor;
                        console.log(`[NodeExecutor] Updated entity color to: ${newColor}`);
                    }
                }
                return {};

            default:
                console.warn(`[NodeExecutor] Unknown action: ${node.subtype}`);
                return {};
        }
    }

    /**
     * Process all OnUpdate events for registered actors
     * Called every frame from the game loop
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        for (const [actorId, actor] of this.actors) {
            this.triggerEvent(actorId, 'OnUpdate', { deltaTime });
        }
    }

    /**
     * Process a collision between two actors
     * @param {string} actorAId - First actor ID
     * @param {string} actorBId - Second actor ID
     */
    processCollision(actorAId, actorBId) {
        const actorA = this.actors.get(actorAId);
        const actorB = this.actors.get(actorBId);

        if (actorA) {
            this.triggerEvent(actorAId, 'OnCollision', {
                otherActorId: actorBId,
                otherActorType: actorB?.type || 'unknown'
            });
        }

        if (actorB) {
            this.triggerEvent(actorBId, 'OnCollision', {
                otherActorId: actorAId,
                otherActorType: actorA?.type || 'unknown'
            });
        }
    }

    /**
     * Get all actors and their current variable states
     * (for debugging / GameDev UI sync)
     */
    getActorStates() {
        const states = {};
        for (const [actorId, variables] of this.activeVariables) {
            states[actorId] = { ...variables };
        }
        return states;
    }

    /**
     * Update a variable from external source (GameDev UI)
     * @param {string} actorId - Actor ID
     * @param {string} variableName - Variable name
     * @param {*} value - New value
     */
    updateVariableFromUI(actorId, variableName, value) {
        this.setVariable(actorId, variableName, value);
        console.log(`[NodeExecutor] Variable updated from UI: ${actorId}.${variableName} = ${value}`);
    }

    /**
     * Add a new node to an actor's logic sheet (from GameDev UI)
     */
    addNode(actorId, node) {
        const actor = this.actors.get(actorId);
        if (actor && actor.logicSheet) {
            actor.logicSheet.nodes.push(node);
            return true;
        }
        return false;
    }

    /**
     * Add a connection to an actor's logic sheet (from GameDev UI)
     */
    addConnection(actorId, connection) {
        const actor = this.actors.get(actorId);
        if (actor && actor.logicSheet) {
            actor.logicSheet.connections.push(connection);
            return true;
        }
        return false;
    }

    /**
     * Remove a node from an actor's logic sheet
     */
    removeNode(actorId, nodeId) {
        const actor = this.actors.get(actorId);
        if (actor && actor.logicSheet) {
            actor.logicSheet.nodes = actor.logicSheet.nodes.filter(n => n.id !== nodeId);
            // Also remove connections to/from this node
            actor.logicSheet.connections = actor.logicSheet.connections.filter(
                c => c.from.nodeId !== nodeId && c.to.nodeId !== nodeId
            );
            return true;
        }
        return false;
    }

    /**
     * Update a node's properties
     */
    updateNodeProperties(actorId, nodeId, properties) {
        const actor = this.actors.get(actorId);
        if (actor && actor.logicSheet) {
            const node = actor.logicSheet.nodes.find(n => n.id === nodeId);
            if (node) {
                node.properties = { ...node.properties, ...properties };
                return true;
            }
        }
        return false;
    }
}
