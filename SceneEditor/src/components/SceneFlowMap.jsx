import { useState, useRef, useEffect, useCallback } from 'react'
import { createDefaultScene, generateSceneName, getNextSceneNumber } from '../data/defaultProject'

/**
 * Scene Flow Map - Visual node editor for scene connections
 * Shows scenes as draggable nodes with connections between them
 * When levelIndex is provided, only shows scenes for that level
 *
 * Based on NodeEditor.jsx drag pattern
 */
export default function SceneFlowMap({ project, updateProject, onOpenScene, onBack, levelIndex, onPushUndo }) {
  const canvasRef = useRef(null)
  const [nodes, setNodes] = useState([])
  const [connections, setConnections] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)

  // Dragging state - matching NodeEditor pattern
  const [draggingNode, setDraggingNode] = useState(null)

  // Connection drawing state
  const [connecting, setConnecting] = useState(null)

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { sceneName } or null

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null) // { x, y, sceneName } or null

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

  // Create a stable key for when we need to re-initialize nodes
  // Only re-init when scene names actually change, not on every render
  const sceneNamesKey = displayScenes.map(s => s.name).join(',')

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

    // Also load saved manual connections from flowMap
    const savedConnections = project.flowMap?.connections || []
    savedConnections.forEach(conn => {
      // Only add if both nodes exist in current view
      if (displaySceneNames.has(conn.from) && displaySceneNames.has(conn.to)) {
        // Avoid duplicates - only one connection per source node
        const exists = newConnections.some(c => c.from === conn.from)
        if (!exists) {
          newConnections.push(conn)
        }
      }
    })

    // Create default sequential connections if no connections exist for a scene
    // Scene 1 → Scene 2 → Scene 3, etc.
    const sceneNamesList = displayScenes.map(s => s.name)
    for (let i = 0; i < sceneNamesList.length - 1; i++) {
      const fromScene = sceneNamesList[i]
      const toScene = sceneNamesList[i + 1]
      // Only add if this scene doesn't already have an outgoing connection
      const hasOutgoing = newConnections.some(c => c.from === fromScene)
      if (!hasOutgoing) {
        newConnections.push({
          from: fromScene,
          to: toScene,
          trigger: 'sequential'
        })
      }
    }

    setConnections(newConnections)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneNamesKey])

  // Keyboard event listener for Delete/Backspace
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle Delete/Backspace when a node is selected and no modal is open
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode && !deleteConfirm) {
        // Prevent backspace from navigating back in browser
        e.preventDefault()
        setDeleteConfirm({ sceneName: selectedNode })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNode, deleteConfirm])

  // Save node positions to project
  const savePositions = useCallback((nodesToSave) => {
    const positions = {}
    nodesToSave.forEach(node => {
      positions[node.id] = { x: node.x, y: node.y }
    })
    updateProject({
      flowMap: { ...project.flowMap, positions }
    })
  }, [project?.flowMap, updateProject])

  // ============ DRAG HANDLERS (matching NodeEditor pattern exactly) ============

  function handleNodeMouseDown(e, node) {
    e.stopPropagation()
    e.preventDefault()

    setDraggingNode({
      nodeId: node.id,
      offsetX: e.clientX - node.x,
      offsetY: e.clientY - node.y
    })
    setSelectedNode(node.id)
  }

  function handleMouseMove(e) {
    if (draggingNode) {
      const newX = e.clientX - draggingNode.offsetX
      const newY = e.clientY - draggingNode.offsetY

      setNodes(prev => prev.map(n =>
        n.id === draggingNode.nodeId
          ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) }
          : n
      ))
    }

    if (connecting) {
      setConnecting(prev => prev ? {
        ...prev,
        endX: e.clientX,
        endY: e.clientY
      } : null)
    }
  }

  function handleMouseUp() {
    if (draggingNode) {
      // Save positions after drag ends
      savePositions(nodes)
      setDraggingNode(null)
    }

    if (connecting) {
      // Check if we're over a node - use the last mouse position
      // This is simplified - in production you'd check actual positions
      setConnecting(null)
    }
  }

  // Handle output handle drag start
  function handleOutputMouseDown(e, node) {
    e.stopPropagation()
    e.preventDefault()

    setConnecting({
      from: node.id,
      startX: node.x + 200,
      startY: node.y + 40,
      endX: e.clientX,
      endY: e.clientY
    })
  }

  // Add new scene to current level
  const addScene = () => {
    if (!currentLevel) {
      const sceneName = `Scene${project.scenes.length + 1}`
      const newScene = createDefaultScene(sceneName, false)
      updateProject({
        scenes: [...project.scenes, newScene]
      })
      return
    }

    const nextNum = getNextSceneNumber(currentLevel.sceneNames || [], currentLevel.number)
    const sceneName = generateSceneName(currentLevel.number, nextNum)
    const newScene = createDefaultScene(sceneName, false)

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

  // Handle delete button click - show confirmation modal
  const handleDeleteClick = (e, sceneName) => {
    e.stopPropagation()
    e.preventDefault()
    setDeleteConfirm({ sceneName })
  }

  // Handle right-click context menu
  const handleContextMenu = (e, sceneName) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, sceneName })
  }

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null)
  }

  // Confirm delete scene
  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return
    const sceneName = deleteConfirm.sceneName

    // Store for undo before deleting
    const sceneToDelete = project.scenes.find(s => s.name === sceneName)
    if (sceneToDelete && onPushUndo) {
      onPushUndo('scene', sceneToDelete, levelIndex)
    }

    // Remove from level.sceneNames if in a level
    const updatedLevels = project.levels?.map((lvl, i) =>
      i === levelIndex
        ? { ...lvl, sceneNames: (lvl.sceneNames || []).filter(s => s !== sceneName) }
        : lvl
    ) || []

    // Remove from project.scenes
    const updatedScenes = project.scenes.filter(s => s.name !== sceneName)

    updateProject({
      levels: updatedLevels,
      scenes: updatedScenes
    })

    setDeleteConfirm(null)
    setSelectedNode(null)
  }

  // Cancel delete
  const handleDeleteCancel = () => {
    setDeleteConfirm(null)
  }

  // Save connections to project flowMap
  const saveConnections = useCallback((conns) => {
    // Only save manual connections (not auto-detected ones from scene transitions)
    const manualConnections = conns.filter(c => c.trigger === 'manual')
    updateProject({
      flowMap: {
        ...project.flowMap,
        connections: manualConnections
      }
    })
  }, [project?.flowMap, updateProject])

  // Delete connection
  const deleteConnection = (index) => {
    setConnections(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Save after delete
      saveConnections(updated)
      return updated
    })
  }

  // Render connections with bendy "wire" style curves (from NodeEditor)
  function renderConnections() {
    return connections.map((conn, idx) => {
      const fromNode = nodes.find(n => n.id === conn.from)
      const toNode = nodes.find(n => n.id === conn.to)

      if (!fromNode || !toNode) return null

      const nodeWidth = 200
      const nodeHeight = 80

      // Connection points
      const fromX = fromNode.x + nodeWidth
      const fromY = fromNode.y + nodeHeight / 2
      const toX = toNode.x
      const toY = toNode.y + nodeHeight / 2

      // Dynamic bezier curve - more "bendy" look
      const dx = Math.abs(toX - fromX)
      const controlOffset = Math.max(50, dx * 0.4)

      const c1x = fromX + controlOffset
      const c1y = fromY
      const c2x = toX - controlOffset
      const c2y = toY

      return (
        <g key={`conn-${idx}`} onClick={() => deleteConnection(idx)} style={{ cursor: 'pointer' }}>
          {/* Invisible wider path for easier clicking */}
          <path
            d={`M ${fromX} ${fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toX} ${toY}`}
            fill="none"
            stroke="transparent"
            strokeWidth="12"
            strokeLinecap="round"
            style={{ pointerEvents: 'stroke' }}
          />
          {/* Wire shadow for depth */}
          <path
            d={`M ${fromX} ${fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toX} ${toY}`}
            fill="none"
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="4"
            strokeLinecap="round"
            style={{ pointerEvents: 'none' }}
          />
          {/* Main wire */}
          <path
            d={`M ${fromX} ${fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toX} ${toY}`}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ pointerEvents: 'none' }}
          />
          {conn.label && (
            <text
              x={(fromX + toX) / 2}
              y={(fromY + toY) / 2 - 10}
              fill="#94a3b8"
              fontSize="10"
              textAnchor="middle"
            >
              {conn.label}
            </text>
          )}
        </g>
      )
    })
  }

  // Render the connection being drawn
  function renderDrawingConnection() {
    if (!connecting) return null

    const fromNode = nodes.find(n => n.id === connecting.from)
    if (!fromNode) return null

    // Get canvas offset for coordinate conversion
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    if (!rect) return null

    const startX = fromNode.x + 200
    const startY = fromNode.y + 40
    const endX = connecting.endX - rect.left
    const endY = connecting.endY - rect.top

    const dx = Math.abs(endX - startX)
    const controlOffset = Math.max(50, dx * 0.4)

    return (
      <path
        d={`M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`}
        fill="none"
        stroke="#6366f1"
        strokeWidth="2"
        strokeDasharray="5,5"
        strokeLinecap="round"
      />
    )
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
          <button onClick={onBack} style={styles.backButton}>← Back</button>
          <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            {currentLevel ? `${currentLevel.name} - (Level ${currentLevel.number}) Scenes` : 'Level Scenes'}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={addScene} style={styles.addButton}>+ Add Scene</button>
        </div>
      </header>

      {/* Canvas Area - matching NodeEditor pattern */}
      <div
        ref={canvasRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          backgroundColor: '#0a0f1a',
          backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          cursor: draggingNode ? 'grabbing' : 'default'
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* SVG for connections - container allows events but doesn't block, paths handle their own */}
        <svg style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible'
        }}>
          <g style={{ pointerEvents: 'auto' }}>
            {renderConnections()}
          </g>
          {renderDrawingConnection()}
        </svg>

        {/* Scene Nodes */}
        {nodes.map(node => {
          const isSelected = selectedNode === node.id
          const isDragging = draggingNode?.nodeId === node.id
          const isBeingDragged = draggingNode !== null || connecting !== null

          // Handle dropping a connection onto this node
          function handleNodeMouseUp(e) {
            if (connecting && connecting.from !== node.id) {
              e.stopPropagation()
              // Create the connection - replacing any existing outgoing connection from this source
              const newConn = {
                from: connecting.from,
                to: node.id,
                trigger: 'manual'
              }
              setConnections(prev => {
                // Remove any existing connection FROM the same source (one output only)
                const filtered = prev.filter(c => c.from !== connecting.from)
                const updated = [...filtered, newConn]
                // Save to project
                saveConnections(updated)
                return updated
              })
              setConnecting(null)
            }
          }

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onMouseUp={handleNodeMouseUp}
              onDoubleClick={() => onOpenScene(project.scenes.findIndex(s => s.name === node.id))}
              onContextMenu={(e) => handleContextMenu(e, node.id)}
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: '200px',
                backgroundColor: '#1e293b',
                border: `2px solid ${node.isStart ? '#6366f1' : isSelected ? '#6366f1' : '#334155'}`,
                borderRadius: '12px',
                overflow: 'visible',
                cursor: isDragging ? 'grabbing' : 'grab',
                boxShadow: isSelected ? '0 0 20px rgba(99, 102, 241, 0.4)' : '0 4px 12px rgba(0,0,0,0.3)',
                transition: isDragging ? 'none' : 'box-shadow 0.2s',
                zIndex: isDragging ? 100 : 1,
                userSelect: 'none',
                // When dragging a NODE, disable pointer events on other nodes so canvas gets events
                // When drawing a CONNECTION, keep pointer events so we can drop on target nodes
                pointerEvents: (draggingNode && !isDragging) ? 'none' : 'auto'
              }}
            >
              {/* Red X delete button in top right corner */}
              <button
                onClick={(e) => handleDeleteClick(e, node.id)}
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '22px',
                  height: '22px',
                  background: '#ef4444',
                  border: '2px solid #0a0f1a',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 20,
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)',
                  lineHeight: 1
                }}
                title="Delete scene (or press Delete key)"
              >
                ✕
              </button>

              {/* Node header - pointerEvents none so parent gets drag events */}
              <div style={{
                backgroundColor: node.isStart ? '#6366f1' : '#334155',
                padding: '8px 12px',
                borderRadius: '10px 10px 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                pointerEvents: 'none',
                userSelect: 'none'
              }}>
                <span>🎬</span>
                <span style={{ fontSize: '14px', fontWeight: '600', flex: 1 }}>{node.id}</span>
              </div>

              {/* Node body - pointerEvents none so parent gets drag events */}
              <div style={{ padding: '10px 12px', pointerEvents: 'none', userSelect: 'none' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {node.scene.states?.length || 0} sub-scenes
                </div>
                <div style={{ fontSize: '9px', color: '#475569', marginTop: '4px' }}>
                  Double-click to edit
                </div>
              </div>

              {/* Input dot (left side) - drop target for connections */}
              <div
                onMouseUp={handleNodeMouseUp}
                style={{
                  position: 'absolute',
                  left: '-8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '14px',
                  height: '14px',
                  backgroundColor: connecting && connecting.from !== node.id ? '#22c55e' : '#10b981',
                  borderRadius: '50%',
                  border: '2px solid #0a0f1a',
                  boxShadow: connecting && connecting.from !== node.id
                    ? '0 0 12px rgba(34, 197, 94, 0.8)'
                    : '0 0 6px rgba(16, 185, 129, 0.5)',
                  zIndex: 10,
                  cursor: connecting ? 'pointer' : 'default',
                  transition: 'all 0.15s'
                }}
                title="Input (drop connection here)"
              />

              {/* Output dot (right side) - click to delete outgoing connections, drag to create new */}
              <div
                onMouseDown={(e) => handleOutputMouseDown(e, node)}
                onClick={(e) => {
                  e.stopPropagation()
                  // Delete all connections from this node
                  const hasOutgoing = connections.some(c => c.from === node.id)
                  if (hasOutgoing) {
                    setConnections(prev => {
                      const updated = prev.filter(c => c.from !== node.id)
                      saveConnections(updated)
                      return updated
                    })
                  }
                }}
                style={{
                  position: 'absolute',
                  right: '-8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '14px',
                  height: '14px',
                  backgroundColor: connections.some(c => c.from === node.id) ? '#ef4444' : '#6366f1',
                  borderRadius: '50%',
                  border: '2px solid #0a0f1a',
                  boxShadow: connections.some(c => c.from === node.id)
                    ? '0 0 6px rgba(239, 68, 68, 0.5)'
                    : '0 0 6px rgba(99, 102, 241, 0.5)',
                  cursor: 'crosshair',
                  zIndex: 10
                }}
                title={connections.some(c => c.from === node.id) ? "Click to delete connections, or drag to connect" : "Drag to connect"}
              />
            </div>
          )
        })}

        {/* Help / Key */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          background: 'rgba(0,0,0,0.7)',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '11px',
          zIndex: 50
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Help / Key</div>
          <div style={{ color: '#94a3b8', lineHeight: '1.8' }}>
            • Drag nodes to reposition<br />
            • <span style={{ color: '#6366f1' }}>●</span> Output → drag to connect<br />
            • <span style={{ color: '#ef4444' }}>●</span> Output (red) → click to delete<br />
            • <span style={{ color: '#10b981' }}>●</span> Input → drop here<br />
            • Double-click → edit scene<br />
            • Click wire → delete<br />
            • <span style={{ color: '#ef4444' }}>✕</span> Red X / Right-click / Delete key → delete scene
          </div>
        </div>
      </div>

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={closeContextMenu}
          onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}
        >
          <div
            style={{
              position: 'absolute',
              top: contextMenu.y,
              left: contextMenu.x,
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              minWidth: '160px',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '8px 12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '11px',
              color: '#94a3b8',
              fontWeight: '500'
            }}>
              {contextMenu.sceneName}
            </div>
            <button
              onClick={() => {
                setDeleteConfirm({ sceneName: contextMenu.sceneName })
                closeContextMenu()
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                color: '#fca5a5',
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              <span style={{ color: '#ef4444' }}>✕</span>
              Delete Scene
            </button>
          </div>
        </div>
      )}

      {/* Delete Scene Confirmation Modal */}
      {deleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={handleDeleteCancel}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1e1e3f 0%, #2a2a4a 100%)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
              <p style={{ fontSize: '16px', color: '#fff', lineHeight: '1.5' }}>
                Are you sure you want to delete <strong style={{ color: '#fca5a5' }}>"{deleteConfirm.sceneName}"</strong>?
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleDeleteCancel}
                style={{
                  padding: '12px 32px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                No
              </button>
              <button
                onClick={handleDeleteConfirm}
                style={{
                  padding: '12px 32px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
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
