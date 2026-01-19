/**
 * NodeEditor Component
 * 
 * Visual node-based editor for game logic
 * Displays nodes from logic/*.json files with connections
 */
import React, { useState, useEffect, useRef } from 'react';
import { getLogicSheet, saveLogicSheet } from '../services/api';
import LogicStack from './LogicStack';
import AIGenerateModal from './AIGenerateModal';

// Node type colors (matching the 6 node types)
const NODE_COLORS = {
    event: '#ef4444',     // Red
    variable: '#22c55e',  // Green
    logic: '#eab308',     // Yellow
    flow: '#f97316',      // Orange
    action: '#3b82f6',    // Blue
    cast: '#a855f7'       // Purple - type-check nodes
};

// Wire/Pin colors by DATA TYPE (industry standard)
const DATA_TYPE_COLORS = {
    execution: '#FFFFFF',  // White - sequence flow
    boolean: '#EF4444',    // Red - true/false
    number: '#22C55E',     // Green - floats/integers
    actor: '#3B82F6',      // Blue - object references
    string: '#EC4899',     // Pink - text
    any: '#94A3B8'         // Gray - unknown/any
};

const NODE_ICONS = {
    event: '🔴',
    variable: '🟢',
    logic: '🟡',
    flow: '🟠',
    action: '🔵',
    cast: '🟣'
};

export function NodeEditor({ actorId, onClose }) {
    const [logicSheet, setLogicSheet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedNodes, setSelectedNodes] = useState(new Set()); // Multi-select for Actions (Diamond tier)
    const [offset, setOffset] = useState({ x: 50, y: 50 }); // Canvas pan offset
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error
    const [showPrompt, setShowPrompt] = useState(false);
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [viewMode, setViewMode] = useState('stack'); // 'stack' or 'nodes'
    const [createActionModal, setCreateActionModal] = useState(false); // Diamond tier - action creation
    const [actionName, setActionName] = useState(''); // Name input for new action
    const [showAIModal, setShowAIModal] = useState(false);
    const canvasRef = useRef(null);

    // Dragging state
    const [draggingNode, setDraggingNode] = useState(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    // Pin dragging state for context-sensitive connections
    const [draggingPin, setDraggingPin] = useState(null); // { nodeId, pinId, pinType, isOutput, x, y }
    const [contextMenu, setContextMenu] = useState(null); // { x, y, filterType }

    // Wire dragging state for live connection preview (Platinum tier)
    const [draggingWire, setDraggingWire] = useState(null); // { sourceNodeId, sourcePin, isOutput, mouseX, mouseY }
    const [wireDropTarget, setWireDropTarget] = useState(null); // { nodeId, pin, isCompatible }

    // Implicit type conversions (Platinum tier)
    const IMPLICIT_CONVERSIONS = {
        'number→string': 'ToString',
        'boolean→string': 'ToString',
        'actor→string': 'ToString',
        'string→number': 'ToNumber',
        'any→string': 'ToString',
        'any→number': 'ToNumber'
    };

    // Check if two types are directly compatible
    function isTypeCompatible(sourceType, targetType) {
        if (sourceType === targetType) return true;
        if (sourceType === 'any' || targetType === 'any') return true;
        return false;
    }

    // Check if types can be implicitly converted
    function canImplicitConvert(sourceType, targetType) {
        const key = `${sourceType}→${targetType}`;
        return IMPLICIT_CONVERSIONS[key] !== undefined;
    }

    // Get the conversion node needed
    function getConversionNode(sourceType, targetType) {
        const key = `${sourceType}→${targetType}`;
        return IMPLICIT_CONVERSIONS[key];
    }

    // Add Node state
    const [showNodePalette, setShowNodePalette] = useState(false);

    // Available node templates for creating new nodes
    const NODE_TEMPLATES = {
        event: [
            { subtype: 'OnUpdate', description: 'Called every frame', outputs: [{ id: 'exec', type: 'execution' }] },
            { subtype: 'OnStart', description: 'Called when scene starts', outputs: [{ id: 'exec', type: 'execution' }] },
            { subtype: 'OnCollision', description: 'Triggered on collision', outputs: [{ id: 'exec', type: 'execution' }, { id: 'other', type: 'actor' }] },
            { subtype: 'OnTouch', description: 'Touch/click detected', outputs: [{ id: 'exec', type: 'execution' }, { id: 'touchX', type: 'number' }] },
            { subtype: 'OnOutOfBounds', description: 'Actor left screen', outputs: [{ id: 'exec', type: 'execution' }] }
        ],
        action: [
            { subtype: 'Move', description: 'Move actor', inputs: [{ id: 'exec', type: 'execution' }] },
            { subtype: 'SetPosition', description: 'Set position', inputs: [{ id: 'exec', type: 'execution' }, { id: 'x', type: 'number' }] },
            { subtype: 'Bounce', description: 'Reverse direction', inputs: [{ id: 'exec', type: 'execution' }] },
            { subtype: 'PlaySound', description: 'Play sound effect', inputs: [{ id: 'exec', type: 'execution' }] },
            { subtype: 'AddScore', description: 'Add to score', inputs: [{ id: 'exec', type: 'execution' }] },
            { subtype: 'ResetPosition', description: 'Reset to start position', inputs: [{ id: 'exec', type: 'execution' }] },
            { subtype: 'GetActorPosition', description: 'Get another actor position', inputs: [{ id: 'exec', type: 'execution' }], outputs: [{ id: 'x', type: 'number' }, { id: 'y', type: 'number' }] }
        ],
        variable: [
            { subtype: 'GetVariable', description: 'Read a variable', outputs: [{ id: 'value', type: 'number' }] },
            { subtype: 'SetVariable', description: 'Write a variable', inputs: [{ id: 'exec', type: 'execution' }, { id: 'value', type: 'number' }] }
        ],
        logic: [
            { subtype: 'Add', description: 'Add two numbers', inputs: [{ id: 'a', type: 'number' }, { id: 'b', type: 'number' }], outputs: [{ id: 'result', type: 'number' }] },
            { subtype: 'Multiply', description: 'Multiply numbers', inputs: [{ id: 'a', type: 'number' }, { id: 'b', type: 'number' }], outputs: [{ id: 'result', type: 'number' }] },
            { subtype: 'Clamp', description: 'Clamp value to range', inputs: [{ id: 'value', type: 'number' }, { id: 'min', type: 'number' }, { id: 'max', type: 'number' }], outputs: [{ id: 'result', type: 'number' }] },
            { subtype: 'Lerp', description: 'Linear interpolate', inputs: [{ id: 'a', type: 'number' }, { id: 'b', type: 'number' }, { id: 't', type: 'number' }], outputs: [{ id: 'result', type: 'number' }] },
            { subtype: 'Compare', description: 'Compare values', inputs: [{ id: 'a', type: 'number' }, { id: 'b', type: 'number' }], outputs: [{ id: 'result', type: 'boolean' }] }
        ],
        flow: [
            { subtype: 'Branch', description: 'If/else branch', inputs: [{ id: 'exec', type: 'execution' }, { id: 'condition', type: 'boolean' }], outputs: [{ id: 'true', type: 'execution' }, { id: 'false', type: 'execution' }] },
            { subtype: 'Sequence', description: 'Run in sequence', inputs: [{ id: 'exec', type: 'execution' }], outputs: [{ id: 'out1', type: 'execution' }, { id: 'out2', type: 'execution' }] }
        ],
        cast: [
            { subtype: 'IsPlayer', description: 'Check if actor is Player', inputs: [{ id: 'actor', type: 'actor' }], outputs: [{ id: 'isValid', type: 'boolean' }, { id: 'player', type: 'actor' }], autoCast: true },
            { subtype: 'IsBall', description: 'Check if actor is Ball', inputs: [{ id: 'actor', type: 'actor' }], outputs: [{ id: 'isValid', type: 'boolean' }, { id: 'ball', type: 'actor' }], autoCast: true },
            { subtype: 'IsEnemy', description: 'Check if actor is Enemy', inputs: [{ id: 'actor', type: 'actor' }], outputs: [{ id: 'isValid', type: 'boolean' }, { id: 'enemy', type: 'actor' }], autoCast: true },
            { subtype: 'ToString', description: 'Convert to string', inputs: [{ id: 'value', type: 'any' }], outputs: [{ id: 'text', type: 'string' }], autoCast: true },
            { subtype: 'ToNumber', description: 'Convert to number', inputs: [{ id: 'value', type: 'any' }], outputs: [{ id: 'number', type: 'number' }], autoCast: true }
        ]
    };

    // Cast color (purple for cast nodes)
    const CAST_NODE_COLOR = '#a855f7';

    useEffect(() => {
        if (actorId) {
            loadLogicSheet();
        }
    }, [actorId]);

    async function loadLogicSheet() {
        setLoading(true);
        setError(null);

        try {
            const result = await getLogicSheet(actorId);
            if (result.success) {
                setLogicSheet(result.data);
            } else {
                setError(result.error || 'Failed to load logic sheet');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Mode A: Sync to Engine via postMessage
    async function syncToEngine() {
        if (!logicSheet) return;

        setSyncStatus('syncing');
        try {
            // Save to filesystem first
            await saveLogicSheet(actorId, logicSheet);

            // Send to engine via postMessage (if embedded)
            const engineFrame = document.querySelector('iframe[src*="5174"]');
            if (engineFrame?.contentWindow) {
                engineFrame.contentWindow.postMessage({
                    type: 'UPDATE_LOGIC',
                    actorId: actorId,
                    logicSheet: logicSheet
                }, '*');
            }

            setSyncStatus('synced');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err) {
            console.error('Sync failed:', err);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
        }
    }

    // Mode B: Generate IDE Prompt
    function generatePrompt() {
        if (!logicSheet) return;

        const nodeDescriptions = logicSheet.nodes?.map(node => {
            const props = node.properties || {};
            const propsStr = Object.entries(props)
                .filter(([k, v]) => k !== 'description')
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ');

            return `- ${node.type.toUpperCase()} node "${node.subtype}" (${node.id})${propsStr ? `: ${propsStr}` : ''}`;
        }).join('\n') || '';

        const connectionDescriptions = logicSheet.connections?.map(conn => {
            return `- ${conn.from.nodeId}.${conn.from.outputId} → ${conn.to.nodeId}.${conn.to.inputId}`;
        }).join('\n') || '';

        const prompt = `## Update ${actorId} Logic Implementation

The visual logic graph for ${actorId} has the following structure:

### Nodes (${logicSheet.nodes?.length || 0}):
${nodeDescriptions}

### Connections (${logicSheet.connections?.length || 0}):
${connectionDescriptions}

### Required Code Changes:
Please update the ${actorId} actor in the game code to implement this logic:

1. For each EVENT node, add an event handler
2. For each ACTION node, call the corresponding method
3. For each LOGIC node, add the mathematical operation
4. For each VARIABLE node, read/write the specified variable
5. For each FLOW node, add the conditional/loop logic

The connections define the execution order. Follow the arrows from event nodes through to action nodes.

### Data File Location:
\`Engine/data/logic/${actorId}.logic.json\`
`;

        setGeneratedPrompt(prompt);
        setShowPrompt(true);
    }

    function copyPromptToClipboard() {
        navigator.clipboard.writeText(generatedPrompt);
        alert('Prompt copied to clipboard!');
    }

    // ============ DRAG HANDLERS (matching SceneFlowMap pattern) ============

    function handleNodeMouseDown(e, node) {
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection
        console.log('[DRAG] MouseDown on node:', node.id);

        // Shift+click for multi-select (Diamond tier)
        if (e.shiftKey) {
            setSelectedNodes(prev => {
                const newSet = new Set(prev);
                if (newSet.has(node.id)) {
                    newSet.delete(node.id); // Toggle off
                } else {
                    newSet.add(node.id); // Toggle on
                }
                return newSet;
            });
            return; // Don't start drag when shift-clicking
        }

        // Regular click - clear multi-select, start drag
        setSelectedNodes(new Set());

        // Store the offset from mouse to node position (same as SceneFlowMap)
        setDraggingNode({
            nodeId: node.id,
            offsetX: e.clientX - node.position.x,
            offsetY: e.clientY - node.position.y
        });
        setSelectedNode(node);
    }

    function handleMouseMove(e) {
        if (!draggingNode) return;

        const newX = e.clientX - draggingNode.offsetX;
        const newY = e.clientY - draggingNode.offsetY;

        console.log('[DRAG] Moving to:', newX, newY);

        // Update the node position in logicSheet
        setLogicSheet(prev => {
            if (!prev) return prev;
            const updatedNodes = prev.nodes.map(n => {
                if (n.id === draggingNode.nodeId) {
                    return { ...n, position: { x: Math.max(0, newX), y: Math.max(0, newY) } };
                }
                return n;
            });
            return { ...prev, nodes: updatedNodes };
        });
    }

    function handleMouseUp() {
        if (draggingNode) {
            console.log('[DRAG] MouseUp - stopping drag');
            setDraggingNode(null);
        }
    }

    // ============ ADD/DELETE NODE FUNCTIONS ============

    function addNode(type, template) {
        if (!logicSheet) return;

        // Generate unique ID
        const prefix = type.charAt(0);
        const existingIds = logicSheet.nodes.map(n => n.id);
        let counter = 1;
        while (existingIds.includes(`${prefix}${counter}`)) counter++;
        const newId = `${prefix}${counter}`;

        // Calculate position (place in visible area, offset from existing nodes)
        const baseX = 300 + (logicSheet.nodes.length % 3) * 220;
        const baseY = 100 + Math.floor(logicSheet.nodes.length / 3) * 150;

        const newNode = {
            id: newId,
            type,
            subtype: template.subtype,
            description: template.description,
            position: { x: baseX, y: baseY },
            inputs: template.inputs || [],
            outputs: template.outputs || [],
            properties: {}
        };

        setLogicSheet(prev => ({
            ...prev,
            nodes: [...prev.nodes, newNode]
        }));

        setShowNodePalette(false);
        setSelectedNode(newNode);
    }

    function deleteNode(nodeId) {
        if (!logicSheet || !nodeId) return;

        // Remove node and any connections involving it
        setLogicSheet(prev => ({
            ...prev,
            nodes: prev.nodes.filter(n => n.id !== nodeId),
            connections: prev.connections.filter(c =>
                c.from.nodeId !== nodeId && c.to.nodeId !== nodeId
            )
        }));

        setSelectedNode(null);
    }

    // Handle keyboard shortcuts
    function handleKeyDown(e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedNode && !e.target.matches('input, textarea')) {
                e.preventDefault();
                deleteNode(selectedNode.id);
            }
        }
        // Escape to close context menu
        if (e.key === 'Escape' && contextMenu) {
            setContextMenu(null);
        }
    }

    // Handle pin click - show context menu with compatible nodes
    function handlePinClick(e, node, pin, isOutput) {
        e.stopPropagation();
        e.preventDefault();

        // Get click position relative to canvas
        const rect = canvasRef.current?.getBoundingClientRect();
        const x = e.clientX - (rect?.left || 0);
        const y = e.clientY - (rect?.top || 0);

        setContextMenu({
            x,
            y,
            filterType: pin.type,
            isOutput, // If clicking output, we need nodes with matching INPUT type
            sourceNode: node,
            sourcePin: pin
        });
    }

    // Get nodes compatible with a given data type
    function getCompatibleNodes(filterType, isSourceOutput) {
        const compatible = [];

        Object.entries(NODE_TEMPLATES).forEach(([nodeType, templates]) => {
            templates.forEach(template => {
                // If source is an output, look for nodes with compatible INPUTs
                // If source is an input, look for nodes with compatible OUTPUTs
                const portsToCheck = isSourceOutput ? template.inputs : template.outputs;

                if (portsToCheck?.some(port => port.type === filterType || filterType === 'any' || port.type === 'any')) {
                    compatible.push({ nodeType, template });
                }
            });
        });

        return compatible;
    }

    // Add node from context menu and auto-connect
    function addNodeFromContextMenu(nodeType, template) {
        if (!logicSheet || !contextMenu) return;

        // Generate unique ID
        const prefix = nodeType.charAt(0);
        const existingIds = logicSheet.nodes.map(n => n.id);
        let counter = 1;
        while (existingIds.includes(`${prefix}${counter}`)) counter++;
        const newId = `${prefix}${counter}`;

        // Position near context menu
        const newNode = {
            id: newId,
            type: nodeType,
            subtype: template.subtype,
            description: template.description,
            position: { x: contextMenu.x + 20, y: contextMenu.y - 30 },
            inputs: template.inputs || [],
            outputs: template.outputs || [],
            properties: {}
        };

        // Auto-create connection
        let newConnection = null;
        if (contextMenu.isOutput) {
            // Source was an output, connect to new node's compatible input
            const compatibleInput = template.inputs?.find(p =>
                p.type === contextMenu.filterType || p.type === 'any'
            );
            if (compatibleInput) {
                newConnection = {
                    id: `conn_${Date.now()}`,
                    from: { nodeId: contextMenu.sourceNode.id, outputId: contextMenu.sourcePin.id },
                    to: { nodeId: newId, inputId: compatibleInput.id }
                };
            }
        } else {
            // Source was an input, connect new node's output to it
            const compatibleOutput = template.outputs?.find(p =>
                p.type === contextMenu.filterType || p.type === 'any'
            );
            if (compatibleOutput) {
                newConnection = {
                    id: `conn_${Date.now()}`,
                    from: { nodeId: newId, outputId: compatibleOutput.id },
                    to: { nodeId: contextMenu.sourceNode.id, inputId: contextMenu.sourcePin.id }
                };
            }
        }

        setLogicSheet(prev => ({
            ...prev,
            nodes: [...prev.nodes, newNode],
            connections: newConnection ? [...prev.connections, newConnection] : prev.connections
        }));

        setContextMenu(null);
        setSelectedNode(newNode);
    }

    // Handle wire drop - create connection with optional auto-conversion (Platinum tier)
    function handleWireDrop(targetNode, targetPin, targetIsOutput) {
        if (!draggingWire || !logicSheet) return;

        // Determine source and target based on drag direction
        let sourceNodeId, sourcePin, destNodeId, destPin;

        if (draggingWire.isOutput && !targetIsOutput) {
            // Dragging from output to input
            sourceNodeId = draggingWire.sourceNodeId;
            sourcePin = draggingWire.sourcePin;
            destNodeId = targetNode.id;
            destPin = targetPin;
        } else if (!draggingWire.isOutput && targetIsOutput) {
            // Dragging from input to output
            sourceNodeId = targetNode.id;
            sourcePin = targetPin;
            destNodeId = draggingWire.sourceNodeId;
            destPin = draggingWire.sourcePin;
        } else {
            // Invalid (output to output or input to input)
            setDraggingWire(null);
            return;
        }

        // Check compatibility
        const sourceType = sourcePin.type;
        const targetType = destPin.type;

        if (!isTypeCompatible(sourceType, targetType) && !canImplicitConvert(sourceType, targetType)) {
            // Incompatible - show error feedback (already shown via red border)
            console.log('Incompatible types:', sourceType, '→', targetType);
            setDraggingWire(null);
            return;
        }

        // If needs conversion, auto-insert conversion node
        if (!isTypeCompatible(sourceType, targetType) && canImplicitConvert(sourceType, targetType)) {
            const conversionSubtype = getConversionNode(sourceType, targetType);
            const conversionTemplate = NODE_TEMPLATES.cast.find(t => t.subtype === conversionSubtype);

            if (conversionTemplate) {
                // Generate ID for conversion node
                const existingIds = logicSheet.nodes.map(n => n.id);
                let counter = 1;
                while (existingIds.includes(`c${counter}`)) counter++;
                const convNodeId = `c${counter}`;

                // Create conversion node positioned between source and target
                const sourceNode = logicSheet.nodes.find(n => n.id === sourceNodeId);
                const convNode = {
                    id: convNodeId,
                    type: 'cast',
                    subtype: conversionSubtype,
                    description: conversionTemplate.description,
                    position: {
                        x: (sourceNode?.position?.x || 200) + 100,
                        y: (sourceNode?.position?.y || 200)
                    },
                    inputs: conversionTemplate.inputs || [],
                    outputs: conversionTemplate.outputs || [],
                    properties: {},
                    autoInserted: true // Mark as auto-inserted
                };

                // Create two connections: source → conversion → target
                const conn1 = {
                    id: `conn_${Date.now()}_1`,
                    from: { nodeId: sourceNodeId, outputId: sourcePin.id },
                    to: { nodeId: convNodeId, inputId: conversionTemplate.inputs[0]?.id }
                };
                const conn2 = {
                    id: `conn_${Date.now()}_2`,
                    from: { nodeId: convNodeId, outputId: conversionTemplate.outputs[0]?.id },
                    to: { nodeId: destNodeId, inputId: destPin.id }
                };

                setLogicSheet(prev => ({
                    ...prev,
                    nodes: [...prev.nodes, convNode],
                    connections: [...prev.connections, conn1, conn2]
                }));

                console.log('Auto-inserted conversion:', sourceType, '→', conversionSubtype, '→', targetType);
            }
        } else {
            // Direct connection - types are compatible
            const newConnection = {
                id: `conn_${Date.now()}`,
                from: { nodeId: sourceNodeId, outputId: sourcePin.id },
                to: { nodeId: destNodeId, inputId: destPin.id }
            };

            setLogicSheet(prev => ({
                ...prev,
                connections: [...prev.connections, newConnection]
            }));
        }

        setDraggingWire(null);
        setWireDropTarget(null);
    }

    // Create a reusable Action from selected nodes (Diamond tier)
    function createActionFromSelection() {
        if (!logicSheet || selectedNodes.size < 2 || !actionName.trim()) return;

        const selectedNodeIds = Array.from(selectedNodes);
        const selectedNodesList = logicSheet.nodes.filter(n => selectedNodeIds.includes(n.id));

        // Find connections that are internal to the selection
        const internalConnections = logicSheet.connections.filter(c =>
            selectedNodeIds.includes(c.from.nodeId) && selectedNodeIds.includes(c.to.nodeId)
        );

        // Find external connections (dangling wires become the Action's inputs/outputs)
        const externalInputs = logicSheet.connections.filter(c =>
            !selectedNodeIds.includes(c.from.nodeId) && selectedNodeIds.includes(c.to.nodeId)
        );
        const externalOutputs = logicSheet.connections.filter(c =>
            selectedNodeIds.includes(c.from.nodeId) && !selectedNodeIds.includes(c.to.nodeId)
        );

        // Calculate average position for the new Action node
        const avgX = selectedNodesList.reduce((sum, n) => sum + n.position.x, 0) / selectedNodesList.length;
        const avgY = selectedNodesList.reduce((sum, n) => sum + n.position.y, 0) / selectedNodesList.length;

        // Build inputs from external connections coming IN
        const actionInputs = [{ id: 'exec', type: 'execution' }]; // Always have exec
        externalInputs.forEach((conn, idx) => {
            const targetNode = selectedNodesList.find(n => n.id === conn.to.nodeId);
            const targetPin = targetNode?.inputs?.find(p => p.id === conn.to.inputId);
            if (targetPin && !actionInputs.some(i => i.id === `in_${idx}`)) {
                actionInputs.push({ id: `in_${idx}`, type: targetPin.type, label: targetPin.label || targetPin.id });
            }
        });

        // Build outputs from external connections going OUT
        const actionOutputs = [{ id: 'exec_out', type: 'execution' }];
        externalOutputs.forEach((conn, idx) => {
            const sourceNode = selectedNodesList.find(n => n.id === conn.from.nodeId);
            const sourcePin = sourceNode?.outputs?.find(p => p.id === conn.from.outputId);
            if (sourcePin && !actionOutputs.some(o => o.id === `out_${idx}`)) {
                actionOutputs.push({ id: `out_${idx}`, type: sourcePin.type, label: sourcePin.label || sourcePin.id });
            }
        });

        // Generate unique ID for the Action node
        const existingIds = logicSheet.nodes.map(n => n.id);
        let counter = 1;
        while (existingIds.includes(`action_${counter}`)) counter++;
        const actionId = `action_${counter}`;

        // Create the Action node with embedded sub-graph
        const actionNode = {
            id: actionId,
            type: 'action',
            subtype: actionName.trim(),
            description: `Custom Action: ${actionName.trim()}`,
            position: { x: avgX, y: avgY },
            inputs: actionInputs,
            outputs: actionOutputs,
            properties: {},
            isCustomAction: true,
            subGraph: {
                nodes: selectedNodesList.map(n => ({
                    ...n,
                    // Store relative position to action center
                    position: {
                        x: n.position.x - avgX + 100,
                        y: n.position.y - avgY + 50
                    }
                })),
                connections: internalConnections
            }
        };

        // Rewire external connections to point to the new Action node
        const newConnections = logicSheet.connections
            .filter(c => !selectedNodeIds.includes(c.from.nodeId) || !selectedNodeIds.includes(c.to.nodeId))
            .filter(c => !externalInputs.includes(c) && !externalOutputs.includes(c))
            .concat(
                externalInputs.map((conn, idx) => ({
                    ...conn,
                    to: { nodeId: actionId, inputId: `in_${idx}` }
                })),
                externalOutputs.map((conn, idx) => ({
                    ...conn,
                    from: { nodeId: actionId, outputId: `out_${idx}` }
                }))
            );

        // Remove selected nodes, add Action node
        setLogicSheet(prev => ({
            ...prev,
            nodes: [...prev.nodes.filter(n => !selectedNodeIds.includes(n.id)), actionNode],
            connections: newConnections
        }));

        // Clean up
        setSelectedNodes(new Set());
        setCreateActionModal(false);
        setActionName('');
        setSelectedNode(actionNode);

        console.log('Created custom Action:', actionName, 'from', selectedNodeIds.length, 'nodes');
    }

    // Update a node's property value
    function updateNodeProperty(nodeId, propertyKey, newValue) {
        setLogicSheet(prev => {
            if (!prev) return prev;
            const updatedNodes = prev.nodes.map(n => {
                if (n.id === nodeId) {
                    return {
                        ...n,
                        properties: { ...n.properties, [propertyKey]: newValue }
                    };
                }
                return n;
            });
            return { ...prev, nodes: updatedNodes };
        });

        // Also update selectedNode so UI reflects change
        if (selectedNode?.id === nodeId) {
            setSelectedNode(prev => ({
                ...prev,
                properties: { ...prev.properties, [propertyKey]: newValue }
            }));
        }
    }


    // Calculate Y offset for a specific port on a node
    function getPortY(node, portId, isInput) {
        const ports = isInput ? (node.inputs || []) : (node.outputs || []);
        const portIndex = ports.findIndex(p => p.id === portId);
        if (portIndex === -1) return 50; // Default center

        // Header height (32px) + padding (8px) + port spacing
        const headerHeight = 32;
        const portHeight = 20;
        const startY = headerHeight + 12;

        // Inputs are on left side, outputs on right side, both below header
        if (isInput) {
            return startY + (portIndex * portHeight);
        } else {
            // Outputs are rendered after inputs
            const inputCount = node.inputs?.length || 0;
            return startY + (inputCount * portHeight) + (portIndex * portHeight);
        }
    }

    // Draw connections between nodes with bendy "wire" style curves
    function renderConnections() {
        if (!logicSheet?.connections || !logicSheet?.nodes) return null;

        return logicSheet.connections.map((connection, idx) => {
            const fromNode = logicSheet.nodes.find(n => n.id === connection.from.nodeId);
            const toNode = logicSheet.nodes.find(n => n.id === connection.to.nodeId);

            if (!fromNode || !toNode) return null;

            const nodeWidth = 180;
            const dotRadius = 6;

            // Calculate precise connection points based on port positions
            const fromPortY = getPortY(fromNode, connection.from.outputId, false);
            const toPortY = getPortY(toNode, connection.to.inputId, true);

            const fromX = fromNode.position.x + nodeWidth + dotRadius;
            const fromY = fromNode.position.y + fromPortY;
            const toX = toNode.position.x - dotRadius;
            const toY = toNode.position.y + toPortY;

            // Dynamic bezier curve - more "bendy" look
            const dx = Math.abs(toX - fromX);
            const controlOffset = Math.max(50, dx * 0.4);

            // Create S-curve for that "wired" feel
            const c1x = fromX + controlOffset;
            const c1y = fromY;
            const c2x = toX - controlOffset;
            const c2y = toY;

            // Get wire color from OUTPUT port's data type
            const outputPort = fromNode.outputs?.find(p => p.id === connection.from.outputId);
            const dataType = outputPort?.type || 'any';
            const wireColor = DATA_TYPE_COLORS[dataType] || DATA_TYPE_COLORS.any;

            return (
                <g key={connection.id || `conn-${idx}`}>
                    {/* Wire shadow for depth */}
                    <path
                        d={`M ${fromX} ${fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toX} ${toY}`}
                        fill="none"
                        stroke="rgba(0,0,0,0.4)"
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    {/* Main wire - colored by data type */}
                    <path
                        d={`M ${fromX} ${fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toX} ${toY}`}
                        fill="none"
                        stroke={wireColor}
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    {/* Highlight wire */}
                    <path
                        d={`M ${fromX} ${fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toX} ${toY}`}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.15)"
                        strokeWidth="1"
                        strokeLinecap="round"
                    />
                </g>
            );
        });
    }

    // Render a single node with visible input/output dots
    function renderNode(node) {
        const color = NODE_COLORS[node.type] || '#8b5cf6';
        const icon = NODE_ICONS[node.type] || '📦';
        const isSelected = selectedNode?.id === node.id;
        const isMultiSelected = selectedNodes.has(node.id); // Diamond tier
        const nodeWidth = 180;
        const isDragging = draggingNode?.nodeId === node.id;

        // Border color priority: multi-selected (blue) > selected (white) > type color
        const borderColor = isMultiSelected ? '#3b82f6' : (isSelected ? '#fff' : color);
        const glowColor = isMultiSelected ? '#3b82f6' : color;

        return (
            <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                style={{
                    position: 'absolute',
                    left: node.position.x,
                    top: node.position.y,
                    width: nodeWidth,
                    backgroundColor: '#1e293b',
                    border: `3px solid ${borderColor}`,
                    borderRadius: '8px',
                    overflow: 'visible', // Allow dots to extend outside
                    cursor: isDragging ? 'grabbing' : 'grab',
                    boxShadow: (isSelected || isMultiSelected) ? `0 0 20px ${glowColor}60` : '0 4px 12px rgba(0,0,0,0.3)',
                    transition: isDragging ? 'none' : 'box-shadow 0.2s, border 0.2s',
                    zIndex: isDragging ? 100 : isMultiSelected ? 50 : 1,
                    userSelect: 'none'
                }}
            >
                {/* Node header */}
                <div style={{
                    backgroundColor: color,
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    userSelect: 'none',
                    cursor: 'inherit',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                }}>
                    <span style={{ pointerEvents: 'none' }}>{icon}</span>
                    <span style={{ pointerEvents: 'none' }}>{node.subtype}</span>
                </div>

                {/* Node body with ports */}
                <div style={{ padding: '8px 10px', position: 'relative' }}>
                    {/* Input ports */}
                    {node.inputs?.length > 0 && (
                        <div style={{ marginBottom: '4px' }}>
                            {node.inputs.map((input, idx) => {
                                // Check if this pin is a valid drop target during wire drag
                                const isDropTarget = draggingWire && !draggingWire.isOutput === false; // Output dragging to input
                                const isCompatible = draggingWire && (
                                    isTypeCompatible(draggingWire.sourcePin.type, input.type) ||
                                    canImplicitConvert(draggingWire.sourcePin.type, input.type)
                                );
                                const isInvalid = isDropTarget && !isCompatible;
                                const needsConversion = isDropTarget && !isTypeCompatible(draggingWire?.sourcePin.type, input.type) && isCompatible;

                                return (
                                    <div key={input.id} style={{
                                        fontSize: '10px',
                                        color: '#94a3b8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        height: '20px',
                                        position: 'relative',
                                        userSelect: 'none'
                                    }}>
                                        {/* Input dot - supports both click (context menu) and drag (wire) */}
                                        <span
                                            onClick={(e) => !draggingWire && handlePinClick(e, node, input, false)}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setDraggingWire({
                                                    sourceNodeId: node.id,
                                                    sourcePin: input,
                                                    isOutput: false,
                                                    mouseX: e.clientX,
                                                    mouseY: e.clientY
                                                });
                                            }}
                                            onMouseUp={(e) => {
                                                if (draggingWire && draggingWire.isOutput) {
                                                    // Dropping output onto this input
                                                    handleWireDrop(node, input, false);
                                                }
                                            }}
                                            onMouseEnter={(e) => {
                                                if (draggingWire) {
                                                    setWireDropTarget({ nodeId: node.id, pin: input, isCompatible });
                                                }
                                                e.target.style.transform = 'scale(1.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                setWireDropTarget(null);
                                                e.target.style.transform = 'scale(1)';
                                            }}
                                            style={{
                                                position: 'absolute',
                                                left: '-16px',
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '50%',
                                                backgroundColor: DATA_TYPE_COLORS[input.type] || DATA_TYPE_COLORS.any,
                                                border: isInvalid ? '3px solid #ef4444' : needsConversion ? '3px solid #a855f7' : '2px solid #1e293b',
                                                boxShadow: isInvalid
                                                    ? '0 0 12px #ef4444'
                                                    : isCompatible && isDropTarget
                                                        ? `0 0 12px ${DATA_TYPE_COLORS[input.type]}`
                                                        : `0 0 6px ${(DATA_TYPE_COLORS[input.type] || DATA_TYPE_COLORS.any)}40`,
                                                cursor: draggingWire ? (isCompatible ? 'copy' : 'not-allowed') : 'crosshair',
                                                transition: 'transform 0.1s, box-shadow 0.1s, border 0.1s',
                                                pointerEvents: 'auto'
                                            }}
                                            title={draggingWire ? (isCompatible ? 'Drop to connect' : 'Incompatible type') : `Click to add node (${input.type})`}
                                        />
                                        <span style={{ pointerEvents: 'none' }}>{input.label || input.id}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Output ports */}
                    {node.outputs?.length > 0 && (
                        <div style={{ textAlign: 'right' }}>
                            {node.outputs.map((output, idx) => {
                                // Check if this pin is a valid drop target during wire drag
                                const isDropTarget = draggingWire && draggingWire.isOutput === false; // Input dragging to output
                                const isCompatible = draggingWire && (
                                    isTypeCompatible(output.type, draggingWire.sourcePin.type) ||
                                    canImplicitConvert(output.type, draggingWire.sourcePin.type)
                                );
                                const isInvalid = isDropTarget && !isCompatible;
                                const needsConversion = isDropTarget && !isTypeCompatible(output.type, draggingWire?.sourcePin.type) && isCompatible;

                                return (
                                    <div key={output.id} style={{
                                        fontSize: '10px',
                                        color: '#94a3b8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        gap: '8px',
                                        height: '20px',
                                        position: 'relative',
                                        userSelect: 'none'
                                    }}>
                                        <span style={{ pointerEvents: 'none' }}>{output.label || output.id}</span>
                                        {/* Output dot - supports both click (context menu) and drag (wire) */}
                                        <span
                                            onClick={(e) => !draggingWire && handlePinClick(e, node, output, true)}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setDraggingWire({
                                                    sourceNodeId: node.id,
                                                    sourcePin: output,
                                                    isOutput: true,
                                                    mouseX: e.clientX,
                                                    mouseY: e.clientY
                                                });
                                            }}
                                            onMouseUp={(e) => {
                                                if (draggingWire && !draggingWire.isOutput) {
                                                    // Dropping input onto this output
                                                    handleWireDrop(node, output, true);
                                                }
                                            }}
                                            onMouseEnter={(e) => {
                                                if (draggingWire) {
                                                    setWireDropTarget({ nodeId: node.id, pin: output, isCompatible });
                                                }
                                                e.target.style.transform = 'scale(1.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                setWireDropTarget(null);
                                                e.target.style.transform = 'scale(1)';
                                            }}
                                            style={{
                                                position: 'absolute',
                                                right: '-16px',
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '50%',
                                                backgroundColor: DATA_TYPE_COLORS[output.type] || DATA_TYPE_COLORS.any,
                                                border: isInvalid ? '3px solid #ef4444' : needsConversion ? '3px solid #a855f7' : '2px solid #1e293b',
                                                boxShadow: isInvalid
                                                    ? '0 0 12px #ef4444'
                                                    : isCompatible && isDropTarget
                                                        ? `0 0 12px ${DATA_TYPE_COLORS[output.type]}`
                                                        : `0 0 6px ${(DATA_TYPE_COLORS[output.type] || DATA_TYPE_COLORS.any)}40`,
                                                cursor: draggingWire ? (isCompatible ? 'copy' : 'not-allowed') : 'crosshair',
                                                transition: 'transform 0.1s, box-shadow 0.1s, border 0.1s',
                                                pointerEvents: 'auto'
                                            }}
                                            title={draggingWire ? (isCompatible ? 'Drop to connect' : 'Incompatible type') : `Click to add node (${output.type})`}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Node ID (debug) */}
                <div style={{
                    padding: '4px 10px',
                    fontSize: '9px',
                    color: '#475569',
                    borderTop: '1px solid #334155',
                    userSelect: 'none',
                    pointerEvents: 'none'
                }}>
                    {node.id}
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h3 style={styles.title}>🔗 Logic Editor: {actorId}</h3>
                    <button onClick={onClose} style={styles.closeButton}>✕</button>
                </div>
                <div style={styles.loading}>Loading logic sheet...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h3 style={styles.title}>🔗 Logic Editor: {actorId}</h3>
                    <button onClick={onClose} style={styles.closeButton}>✕</button>
                </div>
                <div style={styles.error}>{error}</div>
            </div>
        );
    }

    if (!logicSheet) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h3 style={styles.title}>🔗 Logic Editor: {actorId}</h3>
                    <button onClick={onClose} style={styles.closeButton}>✕</button>
                </div>
                <div style={styles.empty}>No logic sheet found for {actorId}</div>
            </div>
        );
    }

    return (
        <div style={styles.container} onKeyDown={handleKeyDown} tabIndex={0}>
            {/* Header */}
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={onClose} style={styles.backButton}>← Back</button>
                    <h3 style={styles.title}>🔗 {actorId} Logic</h3>
                    <span style={styles.subtitle}>
                        {logicSheet.nodes?.length || 0} nodes, {logicSheet.connections?.length || 0} connections
                    </span>
                </div>
                <div style={styles.headerActions}>
                    <button onClick={loadLogicSheet} style={styles.refreshButton}>↻</button>

                    {/* Mode A: Sync to Engine */}
                    <button
                        onClick={syncToEngine}
                        style={{
                            ...styles.actionButton,
                            background: syncStatus === 'synced' ? '#22c55e' :
                                syncStatus === 'error' ? '#ef4444' :
                                    'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                        }}
                        disabled={syncStatus === 'syncing'}
                    >
                        {syncStatus === 'syncing' ? '⏳ Syncing...' :
                            syncStatus === 'synced' ? '✓ Synced!' :
                                syncStatus === 'error' ? '✗ Error' :
                                    '🔄 Sync to Engine'}
                    </button>

                    {/* AI Generate Button (Phase 2) */}
                    <button
                        onClick={() => setShowAIModal(true)}
                        style={{
                            ...styles.actionButton,
                            background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)'
                        }}
                    >
                        ✨ AI Generate
                    </button>

                    {/* Mode B: Generate IDE Prompt */}
                    <button
                        onClick={generatePrompt}
                        style={{
                            ...styles.actionButton,
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                        }}
                    >
                        📋 Generate Prompt
                    </button>

                    {/* View Toggle: Stack vs Nodes */}
                    <div style={{
                        display: 'flex',
                        background: 'rgba(30, 41, 59, 0.8)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        overflow: 'hidden'
                    }}>
                        <button
                            onClick={() => setViewMode('stack')}
                            style={{
                                padding: '8px 12px',
                                background: viewMode === 'stack' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                                border: 'none',
                                color: viewMode === 'stack' ? '#fff' : '#94a3b8',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            📋 Stack
                        </button>
                        <button
                            onClick={() => setViewMode('nodes')}
                            style={{
                                padding: '8px 12px',
                                background: viewMode === 'nodes' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                                border: 'none',
                                color: viewMode === 'nodes' ? '#fff' : '#94a3b8',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            🔗 Nodes
                        </button>
                    </div>

                    {/* Add Node Button */}
                    <button
                        onClick={() => setShowNodePalette(!showNodePalette)}
                        style={{
                            ...styles.actionButton,
                            background: showNodePalette
                                ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                        }}
                    >
                        {showNodePalette ? '✕ Close' : '➕ Add Node'}
                    </button>

                    {/* Create Action Button - Diamond Tier */}
                    {selectedNodes.size >= 2 && (
                        <button
                            onClick={() => setCreateActionModal(true)}
                            style={{
                                ...styles.actionButton,
                                background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                                animation: 'pulse 2s infinite'
                            }}
                        >
                            📦 Create Action ({selectedNodes.size} nodes)
                        </button>
                    )}

                    {/* Delete Selected Button */}
                    {selectedNode && (
                        <button
                            onClick={() => deleteNode(selectedNode.id)}
                            style={{
                                ...styles.actionButton,
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                            }}
                        >
                            🗑️ Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div style={styles.legend}>
                <div style={{ display: 'flex', gap: '12px', borderRight: '1px solid #334155', paddingRight: '12px' }}>
                    <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>NODES:</span>
                    {Object.entries(NODE_COLORS).map(([type, color]) => (
                        <div key={type} style={styles.legendItem}>
                            <span style={{ ...styles.legendDot, backgroundColor: color }}></span>
                            <span>{type}</span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>WIRES:</span>
                    {Object.entries(DATA_TYPE_COLORS).filter(([t]) => t !== 'any').map(([type, color]) => (
                        <div key={type} style={styles.legendItem}>
                            <span style={{ ...styles.legendDot, backgroundColor: color, border: '1px solid #475569' }}></span>
                            <span>{type}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Prompt Modal */}
            {showPrompt && (
                <div style={styles.modalOverlay} onClick={() => setShowPrompt(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0, fontSize: '16px' }}>📋 IDE Prompt Generated</h3>
                            <button onClick={() => setShowPrompt(false)} style={styles.closeButton}>✕</button>
                        </div>
                        <div style={styles.modalBody}>
                            <pre style={styles.promptText}>{generatedPrompt}</pre>
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={copyPromptToClipboard} style={styles.copyButton}>
                                📋 Copy to Clipboard
                            </button>
                            <button onClick={() => setShowPrompt(false)} style={styles.cancelButton}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Action Modal - Diamond Tier */}
            {createActionModal && (
                <div style={styles.modalOverlay} onClick={() => setCreateActionModal(false)}>
                    <div style={{ ...styles.modal, maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            ...styles.modalHeader,
                            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '16px' }}>📦 Create Custom Action</h3>
                            <button onClick={() => setCreateActionModal(false)} style={styles.closeButton}>✕</button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
                                Group {selectedNodes.size} selected nodes into a reusable Action block.
                            </p>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontSize: '12px', fontWeight: '600' }}>
                                Action Name
                            </label>
                            <input
                                type="text"
                                value={actionName}
                                onChange={(e) => setActionName(e.target.value)}
                                placeholder="e.g., Fire Weapon, Take Damage"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: '#1e293b',
                                    border: '2px solid #334155',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && actionName.trim()) {
                                        createActionFromSelection();
                                    }
                                }}
                            />
                        </div>
                        <div style={styles.modalFooter}>
                            <button
                                onClick={createActionFromSelection}
                                disabled={!actionName.trim()}
                                style={{
                                    ...styles.copyButton,
                                    background: actionName.trim()
                                        ? 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
                                        : '#475569',
                                    cursor: actionName.trim() ? 'pointer' : 'not-allowed'
                                }}
                            >
                                ✨ Create Action
                            </button>
                            <button onClick={() => setCreateActionModal(false)} style={styles.cancelButton}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Main Content Area - Stack or Canvas */}
            {viewMode === 'stack' ? (
                <div style={{ flex: 1, overflow: 'auto', background: '#0f172a' }}>
                    <LogicStack
                        nodes={logicSheet.nodes || []}
                        connections={logicSheet.connections || []}
                        selectedNodeId={selectedNode?.id}
                        onSelectNode={setSelectedNode}
                        onSwitchToNodeView={() => setViewMode('nodes')}
                    />
                </div>
            ) : (
                /* Canvas - Node View */
                <div
                    ref={canvasRef}
                    style={styles.canvas}
                    onMouseMove={(e) => {
                        handleMouseMove(e);
                        // Track mouse position during wire drag
                        if (draggingWire) {
                            setDraggingWire(prev => ({
                                ...prev,
                                mouseX: e.clientX,
                                mouseY: e.clientY
                            }));
                        }
                    }}
                    onMouseUp={(e) => {
                        handleMouseUp(e);
                        // Cancel wire drag if released on canvas (not on a pin)
                        if (draggingWire) {
                            setDraggingWire(null);
                            setWireDropTarget(null);
                        }
                    }}
                    onMouseLeave={(e) => {
                        handleMouseUp(e);
                        setDraggingWire(null);
                        setWireDropTarget(null);
                    }}
                    onClick={() => setContextMenu(null)} // Click canvas to close menu
                >
                    {/* SVG for connections */}
                    <svg style={styles.connectionsSvg}>
                        {renderConnections()}

                        {/* Wire preview during drag (Platinum tier) */}
                        {draggingWire && canvasRef.current && (() => {
                            const rect = canvasRef.current.getBoundingClientRect();
                            const sourceNode = logicSheet.nodes?.find(n => n.id === draggingWire.sourceNodeId);
                            if (!sourceNode) return null;

                            // Calculate source position (from node position + offset)
                            const pinIndex = draggingWire.isOutput
                                ? sourceNode.outputs?.findIndex(p => p.id === draggingWire.sourcePin.id) || 0
                                : sourceNode.inputs?.findIndex(p => p.id === draggingWire.sourcePin.id) || 0;

                            const startX = sourceNode.position.x + offset.x + (draggingWire.isOutput ? 180 : 0);
                            const startY = sourceNode.position.y + offset.y + 60 + (pinIndex * 20);
                            const endX = draggingWire.mouseX - rect.left;
                            const endY = draggingWire.mouseY - rect.top;

                            // Wire color based on source type
                            const wireColor = wireDropTarget
                                ? (wireDropTarget.isCompatible ? '#22c55e' : '#ef4444')
                                : DATA_TYPE_COLORS[draggingWire.sourcePin.type] || DATA_TYPE_COLORS.any;

                            // Bezier curve
                            const midX = (startX + endX) / 2;
                            const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

                            return (
                                <path
                                    d={path}
                                    fill="none"
                                    stroke={wireColor}
                                    strokeWidth="3"
                                    strokeDasharray={wireDropTarget?.isCompatible === false ? "5,5" : "none"}
                                    opacity="0.8"
                                    style={{ pointerEvents: 'none' }}
                                />
                            );
                        })()}
                    </svg>

                    {/* Nodes */}
                    {logicSheet.nodes?.map(node => renderNode(node))}

                    {/* Context Menu - Shows compatible nodes */}
                    {contextMenu && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                position: 'absolute',
                                left: contextMenu.x,
                                top: contextMenu.y,
                                minWidth: '200px',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                background: 'rgba(15, 23, 42, 0.98)',
                                border: `2px solid ${DATA_TYPE_COLORS[contextMenu.filterType] || DATA_TYPE_COLORS.any}`,
                                borderRadius: '12px',
                                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${DATA_TYPE_COLORS[contextMenu.filterType]}30`,
                                zIndex: 500
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                padding: '10px 14px',
                                background: `linear-gradient(135deg, ${DATA_TYPE_COLORS[contextMenu.filterType]}30 0%, transparent 100%)`,
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: DATA_TYPE_COLORS[contextMenu.filterType] || '#fff'
                            }}>
                                {contextMenu.isOutput ? '→ Connect to:' : '← Connect from:'}
                                <span style={{
                                    marginLeft: '6px',
                                    padding: '2px 6px',
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: '4px',
                                    fontSize: '10px'
                                }}>
                                    {contextMenu.filterType}
                                </span>
                            </div>

                            {/* Compatible Nodes */}
                            <div style={{ padding: '6px' }}>
                                {getCompatibleNodes(contextMenu.filterType, contextMenu.isOutput).length > 0 ? (
                                    getCompatibleNodes(contextMenu.filterType, contextMenu.isOutput).map(({ nodeType, template }, idx) => (
                                        <button
                                            key={`${nodeType}-${template.subtype}-${idx}`}
                                            onClick={() => addNodeFromContextMenu(nodeType, template)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                width: '100%',
                                                padding: '8px 10px',
                                                background: 'transparent',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: '#e2e8f0',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
                                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                        >
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: NODE_COLORS[nodeType],
                                                flexShrink: 0
                                            }} />
                                            <span style={{ fontWeight: '500' }}>{template.subtype}</span>
                                            <span style={{
                                                fontSize: '10px',
                                                color: '#64748b',
                                                marginLeft: 'auto'
                                            }}>
                                                {nodeType}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <div style={{ padding: '12px', color: '#64748b', fontSize: '11px', textAlign: 'center' }}>
                                        No compatible nodes
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Selected node properties */}
            {selectedNode && (
                <div style={styles.propertiesPanel}>
                    <h4 style={styles.propertiesTitle}>
                        {NODE_ICONS[selectedNode.type]} {selectedNode.subtype}
                    </h4>
                    <div style={styles.propertyRow}>
                        <span style={styles.propertyLabel}>ID:</span>
                        <span style={styles.propertyValue}>{selectedNode.id}</span>
                    </div>
                    <div style={styles.propertyRow}>
                        <span style={styles.propertyLabel}>Type:</span>
                        <span style={styles.propertyValue}>{selectedNode.type}</span>
                    </div>
                    {selectedNode.description && (
                        <div style={styles.propertyRow}>
                            <span style={styles.propertyLabel}>Description:</span>
                            <span style={styles.propertyValue}>{selectedNode.description}</span>
                        </div>
                    )}
                    {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                        <>
                            <h5 style={styles.propertiesSubtitle}>Properties</h5>
                            {Object.entries(selectedNode.properties).map(([key, value]) => {
                                // Editable properties for variable nodes
                                const isEditable = selectedNode.type === 'variable' ||
                                    key === 'defaultValue' ||
                                    key === 'variableName' ||
                                    key === 'targetActor' ||
                                    key === 'soundId' ||
                                    key === 'targetX' ||
                                    key === 'targetY';

                                if (isEditable && typeof value !== 'object') {
                                    return (
                                        <div key={key} style={styles.propertyRow}>
                                            <span style={styles.propertyLabel}>{key}:</span>
                                            <input
                                                type={typeof value === 'number' ? 'number' : 'text'}
                                                value={value}
                                                onChange={(e) => updateNodeProperty(
                                                    selectedNode.id,
                                                    key,
                                                    typeof value === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                                                )}
                                                style={{
                                                    flex: 1,
                                                    padding: '4px 8px',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    border: '1px solid #475569',
                                                    borderRadius: '4px',
                                                    color: '#e2e8f0',
                                                    fontSize: '11px',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>
                                    );
                                }

                                return (
                                    <div key={key} style={styles.propertyRow}>
                                        <span style={styles.propertyLabel}>{key}:</span>
                                        <span style={styles.propertyValue}>
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </span>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            )}

            {/* Node Palette - Add Node Panel */}
            {showNodePalette && (
                <div style={{
                    position: 'absolute',
                    top: '120px',
                    right: '20px',
                    width: '280px',
                    maxHeight: 'calc(100% - 160px)',
                    background: 'rgba(30, 41, 59, 0.98)',
                    border: '1px solid #475569',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    zIndex: 200
                }}>
                    <div style={{
                        padding: '12px 16px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        fontWeight: '600',
                        fontSize: '14px'
                    }}>
                        ➕ Add Node
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
                        {Object.entries(NODE_TEMPLATES).map(([type, templates]) => (
                            <div key={type} style={{ marginBottom: '12px' }}>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: NODE_COLORS[type] || '#94a3b8',
                                    textTransform: 'uppercase',
                                    marginBottom: '6px',
                                    padding: '0 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <span>{NODE_ICONS[type]}</span>
                                    {type}
                                </div>
                                {templates.map(template => (
                                    <button
                                        key={template.subtype}
                                        onClick={() => addNode(type, template)}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            padding: '8px 12px',
                                            marginBottom: '4px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${NODE_COLORS[type]}40`,
                                            borderRadius: '6px',
                                            color: '#e2e8f0',
                                            fontSize: '12px',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = `${NODE_COLORS[type]}20`;
                                            e.target.style.borderColor = NODE_COLORS[type];
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = 'rgba(255,255,255,0.05)';
                                            e.target.style.borderColor = `${NODE_COLORS[type]}40`;
                                        }}
                                    >
                                        <div style={{ fontWeight: '500' }}>{template.subtype}</div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                                            {template.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showAIModal && (
                <AIGenerateModal
                    project={{ canvas: { width: 1080, height: 1920, orientation: 'portrait' } }}
                    scene={{ name: actorId }}
                    onClose={() => setShowAIModal(false)}
                    onGenerate={(nodes) => {
                        // Handle generated logic nodes
                        console.log('Generated AI nodes:', nodes);
                        setShowAIModal(false);
                    }}
                />
            )}
        </div>
    );
}

const styles = {
    container: {
        backgroundColor: '#0f172a',
        color: '#f1f5f9',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155'
    },
    title: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '600'
    },
    subtitle: {
        fontSize: '12px',
        color: '#64748b'
    },
    backButton: {
        background: '#334155',
        border: 'none',
        color: '#f1f5f9',
        cursor: 'pointer',
        padding: '6px 12px',
        borderRadius: '4px',
        fontSize: '13px'
    },
    closeButton: {
        background: 'none',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '18px',
        padding: '4px 8px'
    },
    headerActions: {
        display: 'flex',
        gap: '8px'
    },
    refreshButton: {
        background: '#334155',
        border: 'none',
        color: '#f1f5f9',
        cursor: 'pointer',
        padding: '6px 12px',
        borderRadius: '4px',
        fontSize: '14px'
    },
    legend: {
        display: 'flex',
        gap: '16px',
        padding: '8px 20px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        fontSize: '11px',
        color: '#94a3b8'
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        textTransform: 'capitalize'
    },
    legendDot: {
        width: '10px',
        height: '10px',
        borderRadius: '50%'
    },
    canvas: {
        flex: 1,
        position: 'relative',
        overflow: 'auto',
        backgroundColor: '#0a0f1a',
        backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
        backgroundSize: '20px 20px'
    },
    connectionsSvg: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
    },
    loading: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b'
    },
    error: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ef4444'
    },
    empty: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b'
    },
    propertiesPanel: {
        position: 'absolute',
        right: '20px',
        top: '140px',
        width: '280px',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    },
    propertiesTitle: {
        margin: '0 0 12px 0',
        fontSize: '14px',
        fontWeight: '600',
        color: '#f1f5f9'
    },
    propertiesSubtitle: {
        margin: '12px 0 8px 0',
        fontSize: '12px',
        fontWeight: '600',
        color: '#94a3b8'
    },
    propertyRow: {
        marginBottom: '8px'
    },
    propertyLabel: {
        fontSize: '11px',
        color: '#64748b',
        display: 'block',
        marginBottom: '2px'
    },
    propertyValue: {
        fontSize: '12px',
        color: '#f1f5f9',
        wordBreak: 'break-word'
    },
    actionButton: {
        border: 'none',
        color: '#fff',
        padding: '8px 14px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modal: {
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
    },
    modalHeader: {
        padding: '16px 20px',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    modalBody: {
        flex: 1,
        padding: '20px',
        overflow: 'auto'
    },
    modalFooter: {
        padding: '16px 20px',
        borderTop: '1px solid #334155',
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end'
    },
    promptText: {
        backgroundColor: '#0f172a',
        padding: '16px',
        borderRadius: '8px',
        fontSize: '12px',
        lineHeight: '1.6',
        color: '#e2e8f0',
        whiteSpace: 'pre-wrap',
        margin: 0,
        fontFamily: 'Monaco, Consolas, monospace'
    },
    copyButton: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        border: 'none',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    cancelButton: {
        background: '#334155',
        border: 'none',
        color: '#f1f5f9',
        padding: '10px 20px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer'
    }
};

export default NodeEditor;

