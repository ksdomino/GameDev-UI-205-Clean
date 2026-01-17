import { useState, useEffect, useMemo } from 'react'

/**
 * State Flow View - Visual state machine within a scene
 * Shows states as nodes with transition connections
 */
export default function StateFlowView({ scene, selectedStateIndex, onSelectState, onUpdateState }) {
  const [nodes, setNodes] = useState([])
  
  // Calculate node positions in a horizontal flow
  useEffect(() => {
    if (!scene?.states) return
    
    const newNodes = scene.states.map((state, i) => ({
      id: state.name,
      state,
      index: i,
      x: 40 + i * 140,
      y: 40
    }))
    setNodes(newNodes)
  }, [scene?.states])
  
  // Build connections from state transitions
  const connections = useMemo(() => {
    if (!scene?.states) return []
    
    const conns = []
    scene.states.forEach((state, fromIndex) => {
      // Check transition.nextState
      if (state.transition?.nextState) {
        const toIndex = scene.states.findIndex(s => s.name === state.transition.nextState)
        if (toIndex !== -1) {
          conns.push({
            from: fromIndex,
            to: toIndex,
            type: state.transition.type,
            duration: state.transition.duration
          })
        }
      }
      
      // Check button onClick for switchState
      Object.values(state.layers || {}).flat().forEach(entity => {
        if (entity.onClick?.action === 'switchState' && entity.onClick?.target) {
          const toIndex = scene.states.findIndex(s => s.name === entity.onClick.target)
          if (toIndex !== -1) {
            conns.push({
              from: fromIndex,
              to: toIndex,
              type: 'button',
              label: entity.text || 'Button'
            })
          }
        }
      })
    })
    return conns
  }, [scene?.states])
  
  if (!scene?.states || scene.states.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
        No states in this scene
      </div>
    )
  }
  
  const getNodePos = (index) => {
    const node = nodes[index]
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 }
  }
  
  return (
    <div style={{
      width: '100%',
      height: '80px',
      background: 'rgba(0,0,0,0.2)',
      borderRadius: '6px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* SVG for connections */}
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <defs>
          <marker id="arrow-state" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
          </marker>
        </defs>
        
        {connections.map((conn, i) => {
          const from = getNodePos(conn.from)
          const to = getNodePos(conn.to)
          
          // Curved line for backwards connections, straight for forward
          const isBackward = conn.to < conn.from
          const fromX = from.x + 55
          const fromY = from.y + (isBackward ? -20 : 5)
          const toX = to.x + 55
          const toY = to.y + (isBackward ? -20 : 5)
          
          if (isBackward) {
            // Loop back above
            const midY = -10
            return (
              <path
                key={i}
                d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
                stroke="#6366f1"
                strokeWidth="1.5"
                fill="none"
                markerEnd="url(#arrow-state)"
                opacity={0.5}
              />
            )
          }
          
          return (
            <line
              key={i}
              x1={fromX + 55}
              y1={fromY + 20}
              x2={toX - 55}
              y2={toY + 20}
              stroke="#6366f1"
              strokeWidth="1.5"
              markerEnd="url(#arrow-state)"
              opacity={0.5}
            />
          )
        })}
      </svg>
      
      {/* State Nodes */}
      {nodes.map((node, i) => {
        const isSelected = selectedStateIndex === i
        const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e']
        const color = colors[i % colors.length]
        
        return (
          <div
            key={node.id}
            onClick={() => onSelectState(i)}
            style={{
              position: 'absolute',
              left: node.x,
              top: node.y - 20,
              width: '110px',
              height: '50px',
              background: isSelected 
                ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
                : `linear-gradient(135deg, ${color}66 0%, ${color}44 100%)`,
              border: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
              boxShadow: isSelected ? `0 2px 10px ${color}66` : 'none',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ 
              fontSize: '10px', 
              fontWeight: '600',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {i === 0 && '▶ '}{node.id}
            </div>
            <div style={{ fontSize: '8px', opacity: 0.7, marginTop: '2px' }}>
              {node.state.duration || 2}s • {Object.values(node.state.layers || {}).flat().length} items
            </div>
          </div>
        )
      })}
      
      {/* Add state hint */}
      <div
        style={{
          position: 'absolute',
          left: 40 + nodes.length * 140,
          top: 20,
          width: '40px',
          height: '50px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.15)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          color: '#4a5568'
        }}
      >
        +
      </div>
    </div>
  )
}
