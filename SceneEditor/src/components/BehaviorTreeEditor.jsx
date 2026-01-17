import { useState, useCallback } from 'react'

/**
 * Behavior Tree Editor - Visual node editor for game logic
 * 
 * Node types:
 * - Sequence: Execute children in order until one fails
 * - Selector: Execute children until one succeeds
 * - Condition: Check a condition
 * - Action: Perform an action
 */

const NODE_TYPES = [
  { type: 'sequence', label: 'Sequence', icon: '→', color: '#6366f1', desc: 'Run all in order' },
  { type: 'selector', label: 'Selector', icon: '?', color: '#8b5cf6', desc: 'Try until success' },
  { type: 'condition', label: 'Condition', icon: '❓', color: '#f59e0b', desc: 'Check if true' },
  { type: 'action', label: 'Action', icon: '⚡', color: '#10b981', desc: 'Do something' },
  { type: 'wait', label: 'Wait', icon: '⏱️', color: '#64748b', desc: 'Wait for time' },
  { type: 'loop', label: 'Loop', icon: '🔄', color: '#ec4899', desc: 'Repeat children' }
]

const CONDITION_OPTIONS = [
  { id: 'score_gt', label: 'Score > value' },
  { id: 'score_lt', label: 'Score < value' },
  { id: 'timer_done', label: 'Timer finished' },
  { id: 'button_pressed', label: 'Button pressed' },
  { id: 'entity_visible', label: 'Entity visible' },
  { id: 'custom', label: 'Custom condition' }
]

const ACTION_OPTIONS = [
  { id: 'switch_state', label: 'Switch state' },
  { id: 'switch_scene', label: 'Switch scene' },
  { id: 'play_sound', label: 'Play sound' },
  { id: 'set_score', label: 'Set score' },
  { id: 'show_entity', label: 'Show entity' },
  { id: 'hide_entity', label: 'Hide entity' },
  { id: 'animate', label: 'Play animation' },
  { id: 'custom', label: 'Custom action' }
]

export default function BehaviorTreeEditor({ tree, onChange, onClose }) {
  const [nodes, setNodes] = useState(tree?.nodes || [])
  const [selectedNode, setSelectedNode] = useState(null)
  const [dragging, setDragging] = useState(null)
  
  // Add a new node
  const addNode = (type) => {
    const nodeType = NODE_TYPES.find(t => t.type === type)
    const newNode = {
      id: `node_${Date.now()}`,
      type,
      label: nodeType?.label || type,
      x: 300 + nodes.length * 50,
      y: 200 + (nodes.length % 3) * 100,
      children: [],
      config: {}
    }
    setNodes([...nodes, newNode])
    setSelectedNode(newNode.id)
  }
  
  // Update node
  const updateNode = (nodeId, updates) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n))
  }
  
  // Delete node
  const deleteNode = (nodeId) => {
    setNodes(nodes.filter(n => n.id !== nodeId))
    if (selectedNode === nodeId) setSelectedNode(null)
  }
  
  // Handle drag
  const handleMouseMove = (e) => {
    if (!dragging) return
    setNodes(nodes.map(n => 
      n.id === dragging.nodeId
        ? { ...n, x: e.clientX - dragging.offsetX, y: e.clientY - dragging.offsetY }
        : n
    ))
  }
  
  const handleMouseUp = () => {
    setDragging(null)
  }
  
  // Save and close
  const handleSave = () => {
    onChange({ nodes })
    onClose()
  }
  
  const selectedNodeData = nodes.find(n => n.id === selectedNode)
  
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>🌳 Behavior Tree Editor</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Create game logic with visual nodes
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSave} style={styles.saveButton}>Save</button>
            <button onClick={onClose} style={styles.closeButton}>✕</button>
          </div>
        </div>
        
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Node Palette */}
          <div style={styles.palette}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>Add Node</h3>
            {NODE_TYPES.map(type => (
              <button
                key={type.type}
                onClick={() => addNode(type.type)}
                style={{
                  ...styles.paletteItem,
                  borderLeftColor: type.color
                }}
              >
                <span style={{ fontSize: '16px' }}>{type.icon}</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>{type.label}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{type.desc}</div>
                </div>
              </button>
            ))}
          </div>
          
          {/* Canvas */}
          <div
            style={styles.canvas}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid */}
            <div style={styles.grid} />
            
            {/* Nodes */}
            {nodes.map(node => {
              const nodeType = NODE_TYPES.find(t => t.type === node.type)
              const isSelected = selectedNode === node.id
              
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node.id)}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    setDragging({
                      nodeId: node.id,
                      offsetX: e.clientX - node.x,
                      offsetY: e.clientY - node.y
                    })
                    setSelectedNode(node.id)
                  }}
                  style={{
                    ...styles.node,
                    left: node.x,
                    top: node.y,
                    borderColor: isSelected ? '#fff' : nodeType?.color || '#6366f1',
                    boxShadow: isSelected ? `0 4px 20px ${nodeType?.color}66` : 'none'
                  }}
                >
                  <div style={{ 
                    background: nodeType?.color || '#6366f1',
                    padding: '4px 8px',
                    borderRadius: '4px 4px 0 0',
                    margin: '-8px -10px 8px',
                    fontSize: '10px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>{nodeType?.icon}</span>
                    <span>{nodeType?.label}</span>
                  </div>
                  <div style={{ fontSize: '11px' }}>{node.label}</div>
                </div>
              )
            })}
            
            {nodes.length === 0 && (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>🌳</div>
                <p>Click a node type to add it</p>
              </div>
            )}
          </div>
          
          {/* Properties Panel */}
          <div style={styles.properties}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>Properties</h3>
            
            {selectedNodeData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={styles.label}>Label</label>
                  <input
                    type="text"
                    value={selectedNodeData.label}
                    onChange={(e) => updateNode(selectedNode, { label: e.target.value })}
                    style={styles.input}
                  />
                </div>
                
                {selectedNodeData.type === 'condition' && (
                  <div>
                    <label style={styles.label}>Condition</label>
                    <select
                      value={selectedNodeData.config?.condition || ''}
                      onChange={(e) => updateNode(selectedNode, { 
                        config: { ...selectedNodeData.config, condition: e.target.value }
                      })}
                      style={styles.input}
                    >
                      <option value="">Select...</option>
                      {CONDITION_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {selectedNodeData.type === 'action' && (
                  <div>
                    <label style={styles.label}>Action</label>
                    <select
                      value={selectedNodeData.config?.action || ''}
                      onChange={(e) => updateNode(selectedNode, { 
                        config: { ...selectedNodeData.config, action: e.target.value }
                      })}
                      style={styles.input}
                    >
                      <option value="">Select...</option>
                      {ACTION_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {selectedNodeData.type === 'wait' && (
                  <div>
                    <label style={styles.label}>Duration (seconds)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedNodeData.config?.duration || 1}
                      onChange={(e) => updateNode(selectedNode, { 
                        config: { ...selectedNodeData.config, duration: parseFloat(e.target.value) }
                      })}
                      style={styles.input}
                    />
                  </div>
                )}
                
                <button
                  onClick={() => deleteNode(selectedNode)}
                  style={styles.deleteButton}
                >
                  🗑️ Delete Node
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '11px', color: '#64748b' }}>
                Select a node to edit its properties
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    width: '90%',
    height: '80%',
    maxWidth: '1200px',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  saveButton: {
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  closeButton: {
    width: '36px',
    height: '36px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '16px',
    cursor: 'pointer'
  },
  palette: {
    width: '180px',
    padding: '16px',
    borderRight: '1px solid rgba(255,255,255,0.1)',
    overflow: 'auto'
  },
  paletteItem: {
    width: '100%',
    padding: '10px',
    background: 'rgba(0,0,0,0.2)',
    border: 'none',
    borderLeft: '3px solid',
    borderRadius: '6px',
    marginBottom: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#fff',
    textAlign: 'left'
  },
  canvas: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    background: '#0f0f23'
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '30px 30px'
  },
  node: {
    position: 'absolute',
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid',
    borderRadius: '8px',
    cursor: 'grab',
    minWidth: '120px'
  },
  emptyState: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    fontSize: '14px'
  },
  properties: {
    width: '220px',
    padding: '16px',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
    overflow: 'auto'
  },
  label: {
    display: 'block',
    fontSize: '10px',
    color: '#64748b',
    marginBottom: '4px',
    textTransform: 'uppercase'
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '12px'
  },
  deleteButton: {
    padding: '8px 12px',
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    color: '#fca5a5',
    fontSize: '11px',
    cursor: 'pointer',
    marginTop: '8px'
  }
}
