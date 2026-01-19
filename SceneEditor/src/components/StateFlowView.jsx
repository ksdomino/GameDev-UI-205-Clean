import { useState, useEffect, useMemo } from 'react'

/**
 * State Flow View - Visual state machine within a scene
 * Shows states as nodes with transition connections
 */
export default function StateFlowView({ scene, selectedStateIndex, onSelectState, onUpdateState, vertical = false }) {
  const [nodes, setNodes] = useState([])

  // Calculate node positions
  useEffect(() => {
    if (!scene?.states) return

    const newNodes = scene.states.map((state, i) => ({
      id: state.name,
      state,
      index: i,
      x: vertical ? 20 : (40 + i * 140),
      y: vertical ? (40 + i * 80) : 10
    }))
    setNodes(newNodes)
  }, [scene?.states, vertical])

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
      if (state.layers) {
        Object.values(state.layers).flat().forEach(entity => {
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
      }
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

  const containerHeight = vertical ? (nodes.length * 80 + 100) : '80px';
  const containerWidth = vertical ? '100%' : (nodes.length * 140 + 100);

  return (
    <div style={{
      width: containerWidth,
      height: containerHeight,
      background: vertical ? 'transparent' : 'rgba(0,0,0,0.1)',
      borderRadius: '8px',
      position: 'relative',
      overflow: vertical ? 'visible' : 'auto',
      minHeight: vertical ? 'auto' : '80px'
    }}>
      {/* SVG for connections */}
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
        <defs>
          <marker id="arrow-state" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
            <path d="M 0 0 L 10 4 L 0 8 Z" fill="#6366f1" />
          </marker>
        </defs>

        {connections.map((conn, i) => {
          const from = getNodePos(conn.from)
          const to = getNodePos(conn.to)

          if (vertical) {
            // Vertical connections - simplified lines
            const fromX = from.x + 80
            const fromY = from.y + 25
            const toX = to.x + 80
            const toY = to.y + 0

            return (
              <path
                key={i}
                d={`M ${fromX} ${fromY} L ${fromX + 10} ${fromY} L ${fromX + 10} ${toY} L ${toX} ${toY}`}
                stroke="#6366f1"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrow-state)"
                opacity={0.4}
              />
            )
          }

          // Horizontal logic
          const isBackward = conn.to < conn.from
          const fromX = from.x + 55
          const fromY = from.y + (isBackward ? -20 : 5)
          const toX = to.x + 55
          const toY = to.y + (isBackward ? -20 : 5)

          if (isBackward) {
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
              top: vertical ? node.y : (node.y + 0),
              width: vertical ? '160px' : '110px',
              height: vertical ? '60px' : '50px',
              background: isSelected
                ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
                : `rgba(255,255,255,0.03)`,
              border: isSelected ? '2px solid #fff' : `1px solid ${color}44`,
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              boxShadow: isSelected ? `0 4px 15px ${color}44` : 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              zIndex: isSelected ? 10 : 1
            }}
          >
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: isSelected ? '#fff' : '#cbd5e1'
            }}>
              {i === 0 && '▶ '}{node.id}
            </div>
            <div style={{
              fontSize: '9px',
              opacity: 0.8,
              marginTop: '4px',
              color: isSelected ? '#eee' : '#94a3b8'
            }}>
              {node.state.duration || 2}s • {Object.values(node.state.layers || {}).flat().length} items
            </div>
          </div>
        )
      })}

      {/* Add state hint */}
      {!vertical && (
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
      )}
    </div>
  )
}
