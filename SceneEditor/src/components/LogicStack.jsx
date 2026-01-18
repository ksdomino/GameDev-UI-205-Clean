/**
 * LogicStack Component
 * 
 * Displays linear logic sequences as a vertical stack instead of scattered nodes.
 * 80% of game logic is sequential: "do A, then B, then C" - stacks are perfect for this.
 * Only use node view when logic branches (if/else).
 */
import React, { useState } from 'react';

// Data type colors (matching NodeEditor)
const DATA_TYPE_COLORS = {
    execution: '#FFFFFF',
    boolean: '#EF4444',
    number: '#22C55E',
    actor: '#3B82F6',
    string: '#EC4899',
    any: '#94A3B8'
};

// Node type colors
const NODE_COLORS = {
    event: '#ef4444',
    variable: '#22c55e',
    logic: '#eab308',
    flow: '#f97316',
    action: '#3b82f6'
};

const NODE_ICONS = {
    event: '🔴',
    variable: '🟢',
    logic: '🟡',
    flow: '🟠',
    action: '🔵'
};

export default function LogicStack({
    nodes = [],
    connections = [],
    onReorder,
    onSelectNode,
    selectedNodeId,
    onSwitchToNodeView
}) {
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    // Build execution chains from nodes and connections
    function buildExecutionChains() {
        if (!nodes.length) return [];

        // Find event nodes (starting points)
        const eventNodes = nodes.filter(n => n.type === 'event');
        const chains = [];

        eventNodes.forEach(eventNode => {
            const chain = [eventNode];
            let currentNode = eventNode;

            // Follow execution connections
            while (currentNode) {
                const execConnection = connections.find(c =>
                    c.from.nodeId === currentNode.id &&
                    (c.from.outputId === 'exec' || currentNode.outputs?.find(o => o.id === c.from.outputId && o.type === 'execution'))
                );

                if (execConnection) {
                    const nextNode = nodes.find(n => n.id === execConnection.to.nodeId);
                    if (nextNode && !chain.includes(nextNode)) {
                        chain.push(nextNode);
                        currentNode = nextNode;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }

            chains.push(chain);
        });

        return chains;
    }

    const chains = buildExecutionChains();

    // Handle drag start
    function handleDragStart(e, chainIndex, stepIndex) {
        setDraggedIndex({ chain: chainIndex, step: stepIndex });
        e.dataTransfer.effectAllowed = 'move';
    }

    // Handle drag over
    function handleDragOver(e, chainIndex, stepIndex) {
        e.preventDefault();
        setDragOverIndex({ chain: chainIndex, step: stepIndex });
    }

    // Handle drop
    function handleDrop(e, chainIndex, stepIndex) {
        e.preventDefault();
        if (draggedIndex && onReorder) {
            onReorder(draggedIndex, { chain: chainIndex, step: stepIndex });
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    }

    // Render a single step in the stack
    function renderStep(node, stepIndex, chainIndex, isLast) {
        const color = NODE_COLORS[node.type] || '#8b5cf6';
        const icon = NODE_ICONS[node.type] || '📦';
        const isSelected = selectedNodeId === node.id;
        const isDragOver = dragOverIndex?.chain === chainIndex && dragOverIndex?.step === stepIndex;
        const hasBranching = node.type === 'flow' && node.subtype === 'Branch';

        return (
            <div key={node.id}>
                {/* Step Card */}
                <div
                    draggable={node.type !== 'event'} // Can't drag event nodes
                    onDragStart={(e) => handleDragStart(e, chainIndex, stepIndex)}
                    onDragOver={(e) => handleDragOver(e, chainIndex, stepIndex)}
                    onDrop={(e) => handleDrop(e, chainIndex, stepIndex)}
                    onClick={() => onSelectNode?.(node)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        background: isSelected
                            ? `linear-gradient(135deg, ${color}30 0%, ${color}15 100%)`
                            : 'rgba(30, 41, 59, 0.8)',
                        border: `2px solid ${isSelected ? color : isDragOver ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '10px',
                        cursor: node.type === 'event' ? 'default' : 'grab',
                        transition: 'all 0.15s',
                        transform: isDragOver ? 'scale(1.02)' : 'scale(1)'
                    }}
                >
                    {/* Step Number */}
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#fff',
                        flexShrink: 0
                    }}>
                        {stepIndex + 1}
                    </div>

                    {/* Icon */}
                    <span style={{ fontSize: '16px' }}>{icon}</span>

                    {/* Node Info */}
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#f1f5f9',
                            marginBottom: '2px'
                        }}>
                            {node.subtype}
                        </div>
                        {node.description && (
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {node.description}
                            </div>
                        )}
                    </div>

                    {/* Type Badge */}
                    <div style={{
                        padding: '4px 8px',
                        background: `${color}25`,
                        border: `1px solid ${color}50`,
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        color: color,
                        textTransform: 'uppercase'
                    }}>
                        {node.type}
                    </div>

                    {/* Branch Warning */}
                    {hasBranching && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSwitchToNodeView?.(); }}
                            style={{
                                padding: '4px 8px',
                                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '600',
                                color: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            ↗ Node View
                        </button>
                    )}
                </div>

                {/* Connection Arrow */}
                {!isLast && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        padding: '4px 0'
                    }}>
                        <div style={{
                            width: '2px',
                            height: '20px',
                            background: DATA_TYPE_COLORS.execution,
                            borderRadius: '1px'
                        }} />
                    </div>
                )}
            </div>
        );
    }

    if (!chains.length) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#64748b'
            }}>
                <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📋</div>
                <p>No execution chains found.</p>
                <p style={{ fontSize: '12px' }}>Add an Event node to start a chain.</p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            padding: '16px'
        }}>
            {chains.map((chain, chainIndex) => (
                <div key={chainIndex} style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '16px'
                }}>
                    {/* Chain Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                        paddingBottom: '12px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)'
                    }}>
                        <span style={{ fontSize: '14px' }}>⚡</span>
                        <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#f1f5f9'
                        }}>
                            {chain[0]?.subtype || 'Chain'} Flow
                        </span>
                        <span style={{
                            fontSize: '11px',
                            color: '#64748b',
                            marginLeft: 'auto'
                        }}>
                            {chain.length} steps
                        </span>
                    </div>

                    {/* Steps */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {chain.map((node, stepIndex) =>
                            renderStep(node, stepIndex, chainIndex, stepIndex === chain.length - 1)
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
