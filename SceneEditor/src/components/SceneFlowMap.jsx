import { useState, useRef, useEffect, useCallback } from 'react'
import { createDefaultScene, generateSceneName, getNextSceneNumber } from '../data/defaultProject'

/**
 * Scene Flow Map - Visual node editor for scene connections
 * Shows scenes as draggable nodes with connections between them
 * When levelIndex is provided, only shows scenes for that level
 */
export default function SceneFlowMap({ project, updateProject, onOpenScene, onBack, levelIndex }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [nodes, setNodes] = useState([])
  const [connections, setConnections] = useState([])
  const [dragging, setDragging] = useState(null)
  const [connecting, setConnecting] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // Get scenes to display - filter by level if levelIndex is provided
  const getDisplayScenes = useCallback(() => {
    if (levelIndex !== undefined && project.levels?.[levelIndex]) {
      const level = project.levels[levelIndex]
      const sceneNames = level.sceneNames || []
      return project.scenes.filter(s => sceneNames.includes(s.name))
    }
    return project.scenes || []
  }, [project.scenes, project.levels, levelIndex])

  const displayScenes = getDisplayScenes()
  const currentLevel = levelIndex !== undefined ? project.levels?.[levelIndex] : null

  // Initialize nodes from display scenes
  useEffect(() => {
    if (!displayScenes.length) return

    // Load saved positions or create default grid layout
    const savedPositions = project.flowMap?.positions || {}
    const newNodes = displayScenes.map((scene, i) => ({
      id: scene.name,
      scene,
      x: savedPositions[scene.name]?.x ?? 150 + (i % 3) * 300,
      y: savedPositions[scene.name]?.y ?? 150 + Math.floor(i / 3) * 200,
      isStart: scene.isStartScene
    }))
    setNodes(newNodes)

    // Build connections from scene transitions (only for display scenes)
    const displaySceneNames = new Set(displayScenes.map(s => s.name))
    const newConnections = []
    displayScenes.forEach(scene => {
      scene.states?.forEach(state => {
        if (state.transition?.nextScene && displaySceneNames.has(state.transition.nextScene)) {
          newConnections.push({
            from: scene.name,
            to: state.transition.nextScene,
            trigger: state.transition.type,
            fromState: state.name
          })
        }
        // Also check button onClick actions
        Object.values(state.layers || {}).flat().forEach(entity => {
          if (entity.onClick?.action === 'switchScene' && entity.onClick?.target && displaySceneNames.has(entity.onClick.target)) {
            newConnections.push({
              from: scene.name,
              to: entity.onClick.target,
              trigger: 'button',
              label: entity.text || entity.id
            })
          }
        })
      })
    })
    setConnections(newConnections)
  }, [displayScenes])

  // Save node positions to project
  const savePositions = useCallback(() => {
    const positions = {}
    nodes.forEach(node => {
      positions[node.id] = { x: node.x, y: node.y }
    })
    updateProject({
      flowMap: { ...project.flowMap, positions }
    })
  }, [nodes, project?.flowMap, updateProject])

  // Handle mouse down on node
  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation()
    // Start dragging
    setDragging({
      nodeId: node.id,
      offsetX: e.clientX - node.x,
      offsetY: e.clientY - node.y
    })
    setSelectedNode(node.id)
  }

  // Handle mouse move
  const handleMouseMove = (e) => {
    if (dragging) {
      setNodes(prev => prev.map(n =>
        n.id === dragging.nodeId
          ? { ...n, x: e.clientX - dragging.offsetX, y: e.clientY - dragging.offsetY }
          : n
      ))
    }
    if (connecting) {
      setConnecting(prev => ({
        ...prev,
        endX: e.clientX,
        endY: e.clientY
      }))
    }
  }

  // Handle mouse up
  const handleMouseUp = (e) => {
    if (dragging) {
      savePositions()
      setDragging(null)
    }
    if (connecting) {
      // Check if we're over a node
      const targetNode = nodes.find(n => {
        const rect = { x: n.x, y: n.y, width: 200, height: 80 }
        return e.clientX >= rect.x && e.clientX <= rect.x + rect.width &&
          e.clientY >= rect.y && e.clientY <= rect.y + rect.height
      })

      if (targetNode && targetNode.id !== connecting.from) {
        // Create new connection
        const newConnection = {
          from: connecting.from,
          to: targetNode.id,
          trigger: 'manual',
          label: 'New transition'
        }
        setConnections(prev => [...prev, newConnection])
      }
      setConnecting(null)
    }
  }

  // Add new scene to current level
  const addScene = () => {
    if (!currentLevel) {
      // Fallback for legacy mode (no level selected)
      const sceneName = `Scene${project.scenes.length + 1}`
      const newScene = createDefaultScene(sceneName, false)
      updateProject({
        scenes: [...project.scenes, newScene]
      })
      return
    }

    // Use level-aware naming: L{N}_Scene_X
    const nextNum = getNextSceneNumber(currentLevel.sceneNames || [], currentLevel.number)
    const sceneName = generateSceneName(currentLevel.number, nextNum)
    const newScene = createDefaultScene(sceneName, false)

    // Update the level's sceneNames and add scene to project
    const updatedLevels = project.levels.map((lvl, i) =>
      i === levelIndex
        ? { ...lvl, sceneNames: [...(lvl.sceneNames || []), sceneName] }
        : lvl
    )

    updateProject({
      levels: updatedLevels,
      scenes: [...project.scenes, newScene]
    })
  }

  // Delete connection
  const deleteConnection = (index) => {
    setConnections(prev => prev.filter((_, i) => i !== index))
  }

  // Get node center position
  const getNodeCenter = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return { x: 0, y: 0 }
    return { x: node.x + 100, y: node.y + 40 }
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <header style={{
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={styles.backButton}>🎮 Back to Levels</button>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
              {currentLevel ? `Level ${currentLevel.number}: ${currentLevel.name}` : '🎬 Scene Editor'}
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              {displayScenes.length} scenes • {connections.length} connections
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={addScene} style={styles.addButton}>+ Add Scene</button>
        </div>
      </header>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          cursor: dragging ? 'grabbing' : 'default'
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setSelectedNode(null)}
      >
        {/* Grid Background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />

        {/* SVG for connections */}
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
            </marker>
          </defs>

          {/* Existing connections */}
          {connections.map((conn, i) => {
            const from = getNodeCenter(conn.from)
            const to = getNodeCenter(conn.to)
            const midX = (from.x + to.x) / 2
            const midY = (from.y + to.y) / 2

            return (
              <g key={i}>
                <path
                  d={`M ${from.x} ${from.y} Q ${midX} ${from.y}, ${midX} ${midY} T ${to.x} ${to.y}`}
                  stroke="#6366f1"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onClick={() => deleteConnection(i)}
                />
                {conn.label && (
                  <text x={midX} y={midY - 10} fill="#94a3b8" fontSize="10" textAnchor="middle">
                    {conn.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Connection being drawn */}
          {connecting && connecting.endX && (
            <line
              x1={connecting.startX}
              y1={connecting.startY}
              x2={connecting.endX}
              y2={connecting.endY}
              stroke="#6366f1"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
        </svg>

        {/* Scene Nodes */}
        {nodes.map(node => (
          <div
            key={node.id}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            onDoubleClick={() => onOpenScene(project.scenes.findIndex(s => s.name === node.id))}
            style={{
              position: 'absolute',
              left: node.x,
              top: node.y,
              width: '200px',
              background: selectedNode === node.id
                ? 'rgba(99, 102, 241, 0.3)'
                : 'rgba(255,255,255,0.05)',
              border: node.isStart
                ? '2px solid #6366f1'
                : selectedNode === node.id
                  ? '2px solid #6366f1'
                  : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px 16px',
              cursor: 'grab',
              userSelect: 'none',
              boxShadow: selectedNode === node.id ? '0 4px 20px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px' }}>🎬</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>{node.id}</span>
              {node.isStart && (
                <span style={{
                  fontSize: '9px',
                  background: '#6366f1',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  marginLeft: 'auto'
                }}>START</span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {node.scene.states?.length || 0} states
            </div>
            <div style={{
              fontSize: '9px',
              color: '#475569',
              marginTop: '4px'
            }}>
              Double-click to edit
            </div>

            {/* Connection Handle (Output) */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation()
                // Start connecting from this handle
                setConnecting({
                  from: node.id,
                  startX: node.x + 200, // Right edge
                  startY: node.y + 40   // Center Y
                })
              }}
              style={{
                position: 'absolute',
                right: '-6px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '12px',
                height: '12px',
                background: '#6366f1',
                borderRadius: '50%',
                cursor: 'crosshair',
                border: '2px solid #1a1a2e',
                boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.4)',
                zIndex: 10
              }}
              title="Drag to connect"
            />
          </div>
        ))}

        {/* Legend */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          background: 'rgba(0,0,0,0.6)',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '11px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Controls</div>
          <div style={{ color: '#94a3b8', lineHeight: '1.6' }}>
            • Drag nodes to reposition<br />
            • Drag from dot to connect<br />
            • Double-click to edit scene<br />
            • Click connection to delete
          </div>
        </div>
      </div>
    </div>

  )
}

const styles = {
  backButton: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '12px',
    cursor: 'pointer'
  },
  addButton: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  }
}
