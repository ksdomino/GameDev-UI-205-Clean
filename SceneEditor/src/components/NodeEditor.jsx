/**
 * NodeEditor Component
 * 
 * Visual node-based editor for game logic
 * Displays nodes from logic/*.json files with connections
 */
import React, { useState, useEffect, useRef } from 'react';
import { getLogicSheet, saveLogicSheet } from '../services/api';

// Node type colors (matching the 5 node types)
const NODE_COLORS = {
    event: '#ef4444',     // Red
    variable: '#22c55e',  // Green
    logic: '#eab308',     // Yellow
    flow: '#f97316',      // Orange
    action: '#3b82f6'     // Blue
};

const NODE_ICONS = {
    event: '🔴',
    variable: '🟢',
    logic: '🟡',
    flow: '🟠',
    action: '🔵'
};

export function NodeEditor({ actorId, onClose }) {
    const [logicSheet, setLogicSheet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [offset, setOffset] = useState({ x: 50, y: 50 }); // Canvas pan offset
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error
    const [showPrompt, setShowPrompt] = useState(false);
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const canvasRef = useRef(null);

    // Dragging state
    const [draggingNode, setDraggingNode] = useState(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    // Add Node state
    const [showNodePalette, setShowNodePalette] = useState(false);

    // Available node templates for creating new nodes
    const NODE_TEMPLATES = {
        event: [
            { subtype: 'OnUpdate', description: 'Called every frame', outputs: [{ id: 'exec', type: 'execution' }] },
            { subtype: 'OnStart', description: 'Called when scene starts', outputs: [{ id: 'exec', type: 'execution' }] },
            { subtype: 'OnCollision', description: 'Triggered on collision', outputs: [{ id: 'exec', type: 'execution' }] },
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
        ]
    };

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

            return (
                <g key={connection.id || `conn-${idx}`}>
                    {/* Wire shadow for depth */}
                    <path
                        d={`M ${fromX} ${fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toX} ${toY}`}
                        fill="none"
                        stroke="rgba(0,0,0,0.3)"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                    {/* Main wire */}
                    <path
                        d={`M ${fromX} ${fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toX} ${toY}`}
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                    {/* Highlight wire */}
                    <path
                        d={`M ${fromX} ${fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toX} ${toY}`}
                        fill="none"
                        stroke="rgba(148, 163, 184, 0.3)"
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
        const nodeWidth = 180;
        const isDragging = draggingNode?.nodeId === node.id;

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
                    border: `2px solid ${isSelected ? '#fff' : color}`,
                    borderRadius: '8px',
                    overflow: 'visible', // Allow dots to extend outside
                    cursor: isDragging ? 'grabbing' : 'grab',
                    boxShadow: isSelected ? `0 0 20px ${color}40` : '0 4px 12px rgba(0,0,0,0.3)',
                    transition: isDragging ? 'none' : 'box-shadow 0.2s',
                    zIndex: isDragging ? 100 : 1,
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
                            {node.inputs.map((input, idx) => (
                                <div key={input.id} style={{
                                    fontSize: '10px',
                                    color: '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    height: '20px',
                                    position: 'relative',
                                    userSelect: 'none',
                                    pointerEvents: 'none'
                                }}>
                                    {/* Input dot - positioned outside node */}
                                    <span style={{
                                        position: 'absolute',
                                        left: '-16px',
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        backgroundColor: input.type === 'execution' ? '#fff' : '#94a3b8',
                                        border: '2px solid #334155',
                                        boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                                    }}></span>
                                    {input.label || input.id}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Output ports */}
                    {node.outputs?.length > 0 && (
                        <div style={{ textAlign: 'right' }}>
                            {node.outputs.map((output, idx) => (
                                <div key={output.id} style={{
                                    fontSize: '10px',
                                    color: '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: '8px',
                                    height: '20px',
                                    position: 'relative',
                                    userSelect: 'none',
                                    pointerEvents: 'none'
                                }}>
                                    {output.label || output.id}
                                    {/* Output dot - positioned outside node */}
                                    <span style={{
                                        position: 'absolute',
                                        right: '-16px',
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        backgroundColor: output.type === 'execution' ? '#fff' : '#94a3b8',
                                        border: '2px solid #334155',
                                        boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                                    }}></span>
                                </div>
                            ))}
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
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                    <div key={type} style={styles.legendItem}>
                        <span style={{ ...styles.legendDot, backgroundColor: color }}></span>
                        <span>{type}</span>
                    </div>
                ))}
                <span style={{ marginLeft: 'auto', color: '#475569', fontSize: '10px' }}>
                    Click a node to see properties
                </span>
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


            {/* Canvas */}
            <div
                ref={canvasRef}
                style={styles.canvas}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* SVG for connections */}
                <svg style={styles.connectionsSvg}>
                    {renderConnections()}
                </svg>

                {/* Nodes */}
                {logicSheet.nodes?.map(node => renderNode(node))}
            </div>

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

