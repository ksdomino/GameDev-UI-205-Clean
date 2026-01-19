import { useState, useRef, useEffect, useCallback } from 'react'
import { createDefaultState, LAYERS, ENTITY_TYPES, ANIMATION_TYPES, TRANSITION_TYPES } from '../data/defaultProject'
import EntityPropertyEditor from './EntityPropertyEditor'
import AIGenerateModal from './AIGenerateModal'
import StateFlowView from './StateFlowView'
import BehaviorTreeEditor from './BehaviorTreeEditor'
import AnimationCurveEditor from './AnimationCurveEditor'
import AssetManager from './AssetManager'
import { listAssets } from '../services/api'

/**
 * Scene Editor - Timeline-based scene creation with drag-drop
 */
export default function SceneEditor({ project, updateProject, sceneIndex, onBack, onOpenDebug, onOpenLogic }) {
  const scene = project.scenes[sceneIndex]
  const [selectedStateIndex, setSelectedStateIndex] = useState(0)
  const [selectedEntityKey, setSelectedEntityKey] = useState(null) // "LAYER_NAME:index"
  const [draggedEntityType, setDraggedEntityType] = useState(null)
  const [dragOverLayer, setDragOverLayer] = useState(null)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showBehaviorTree, setShowBehaviorTree] = useState(false)
  const [showAnimationCurve, setShowAnimationCurve] = useState(false)
  const [showAssetManager, setShowAssetManager] = useState(false)
  const [availableAssets, setAvailableAssets] = useState({ images: [], sprites: [], backgrounds: [], audio: [] })

  // Load available assets
  useEffect(() => {
    loadAvailableAssets()
  }, [])

  const loadAvailableAssets = async () => {
    try {
      const result = await listAssets()
      if (result.success) {
        setAvailableAssets(result.assets)
      }
    } catch (err) {
      console.error('Failed to load assets:', err)
    }
  }

  if (!scene) {
    return <div>Scene not found</div>
  }

  const selectedState = scene.states[selectedStateIndex]

  // Parse selected entity
  const getSelectedEntity = () => {
    if (!selectedEntityKey || !selectedState) return null
    const [layerName, indexStr] = selectedEntityKey.split(':')
    const index = parseInt(indexStr)
    return selectedState.layers?.[layerName]?.[index] || null
  }

  const selectedEntity = getSelectedEntity()

  // Update scene helper
  const updateScene = (updates) => {
    const newScenes = [...project.scenes]
    newScenes[sceneIndex] = { ...scene, ...updates }
    updateProject({ scenes: newScenes })
  }

  // Update state helper
  const updateState = (stateIndex, updates) => {
    const newStates = [...scene.states]
    newStates[stateIndex] = { ...newStates[stateIndex], ...updates }
    updateScene({ states: newStates })
  }

  // Update selected entity
  const updateSelectedEntity = (updates) => {
    if (!selectedEntityKey) return
    const [layerName, indexStr] = selectedEntityKey.split(':')
    const index = parseInt(indexStr)

    const newLayers = { ...selectedState.layers }
    const newLayerEntities = [...(newLayers[layerName] || [])]
    newLayerEntities[index] = { ...newLayerEntities[index], ...updates }
    newLayers[layerName] = newLayerEntities

    updateState(selectedStateIndex, { layers: newLayers })
  }

  // Delete selected entity
  const deleteSelectedEntity = () => {
    if (!selectedEntityKey) return
    const [layerName, indexStr] = selectedEntityKey.split(':')
    const index = parseInt(indexStr)

    const newLayers = { ...selectedState.layers }
    newLayers[layerName] = newLayers[layerName].filter((_, i) => i !== index)

    updateState(selectedStateIndex, { layers: newLayers })
    setSelectedEntityKey(null)
  }

  // Add new state
  const addState = () => {
    const stateName = `STATE_${scene.states.length + 1}`
    const newState = createDefaultState(stateName)
    updateScene({ states: [...scene.states, newState] })
    setSelectedStateIndex(scene.states.length)
  }

  // Delete state
  const deleteState = (index) => {
    if (scene.states.length <= 1) {
      alert('You need at least one state!')
      return
    }
    const newStates = scene.states.filter((_, i) => i !== index)
    updateScene({ states: newStates })
    if (selectedStateIndex >= newStates.length) {
      setSelectedStateIndex(newStates.length - 1)
    }
  }

  // Generate a short, readable ID for entities
  const generateEntityId = (type, layerName) => {
    // Count existing entities of this type across all states
    let count = 0
    scene.states.forEach(state => {
      LAYERS.forEach(layer => {
        const entities = state.layers?.[layer.name] || []
        entities.forEach(entity => {
          if (entity.type === type) count++
        })
      })
    })

    // Use bg_ prefix for background layers, sprite_ for others
    const isBackgroundLayer = layerName === 'BG_FAR' || layerName === 'BG_NEAR' || layerName === 'VIDEO_IMAGE'
    const prefix = type === 'sprite'
      ? (isBackgroundLayer ? 'bg' : 'sprite')
      : type

    return `${prefix}_${count + 1}`
  }

  // Create default entity based on type
  const createDefaultEntity = (type, layerName = null) => {
    const canvas = project.canvas
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    switch (type) {
      case 'sprite':
        return {
          type: 'sprite',
          id: generateEntityId('sprite', layerName),
          assetId: '',
          x: centerX,
          y: centerY,
          width: 200,
          height: 200,
          rotation: 0,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          visible: true
        }
      case 'button':
        return {
          type: 'button',
          id: generateEntityId('button', layerName),
          text: 'Button',
          x: centerX,
          y: centerY,
          width: 300,
          height: 100,
          color: '#6366f1',
          alpha: 1,
          onClick: { action: 'none' }
        }
      case 'text':
        return {
          type: 'text',
          id: generateEntityId('text', layerName),
          content: 'Hello World',
          x: centerX,
          y: centerY,
          font: '48px Arial',
          color: '#ffffff',
          textAlign: 'center',
          alpha: 1
        }
      case 'shape':
        return {
          type: 'shape',
          id: generateEntityId('shape', layerName),
          shape: 'rect',
          x: centerX - 100,
          y: centerY - 100,
          width: 200,
          height: 200,
          color: '#6366f1',
          fill: true,
          strokeWidth: 2,
          alpha: 1
        }
      default:
        return null
    }
  }

  // Handle drop on layer
  const handleDrop = (layerName) => {
    if (!draggedEntityType) return

    const newEntity = createDefaultEntity(draggedEntityType, layerName)
    if (!newEntity) return

    const newLayers = { ...selectedState.layers }
    newLayers[layerName] = [...(newLayers[layerName] || []), newEntity]

    updateState(selectedStateIndex, { layers: newLayers })

    // Select the new entity
    const newIndex = newLayers[layerName].length - 1
    setSelectedEntityKey(`${layerName}:${newIndex}`)

    setDraggedEntityType(null)
    setDragOverLayer(null)
  }

  // Calculate total timeline duration
  const totalDuration = scene.states.reduce((sum, state) => sum + (state.duration || 2), 0)
  const timelineWidth = Math.max(totalDuration * 100, 800)

  // Calculate entity counts
  const totalEntities = Object.values(selectedState?.layers || {}).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header - Simplified as States moved to sidebar */}
      <header style={{
        padding: '6px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={onBack} style={styles.backButton}>←</button>
          <h1 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>🎬 {scene.name}</h1>
          <span style={{ fontSize: '10px', color: '#64748b' }}>
            {scene.states.length} states • {totalEntities} entities
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setShowAssetManager(true)} style={styles.toolButton}>📦 Assets</button>
          <button onClick={() => setShowBehaviorTree(true)} style={styles.toolButton}>🌳 Logic</button>
          <button onClick={() => setShowAnimationCurve(true)} style={styles.toolButton}>📈 Curves</button>
          <button onClick={() => setShowAIModal(true)} style={styles.generateButton}>✨ AI Generate</button>
          <button onClick={onOpenDebug} style={styles.testButton}>🐛 Test</button>
        </div>
      </header>

      {/* Main Content - 4 columns (States, Canvas, Layers, Properties) */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '220px 1fr 260px 240px',
        gap: '8px',
        padding: '8px 12px',
        overflow: 'hidden',
        minHeight: 0
      }}>
        {/* Column 1: States (Flow & Settings) */}
        <div style={{ ...styles.panel, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={styles.panelHeader}>🔀 States</h3>
            <button onClick={addState} style={{ ...styles.addStateButton, padding: '2px 8px' }}>+ New</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', marginTop: '8px', paddingRight: '4px' }}>
            <StateFlowView
              scene={scene}
              selectedStateIndex={selectedStateIndex}
              onSelectState={(i) => { setSelectedStateIndex(i); setSelectedEntityKey(null) }}
              onUpdateState={updateState}
              vertical={true}
            />
          </div>

          {/* State Settings */}
          {selectedState && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '10px' }}>
              <h3 style={{ ...styles.panelHeader, border: 'none', padding: 0, marginBottom: '8px' }}>⚙️ Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Field label="Name">
                  <input
                    type="text"
                    value={selectedState.name}
                    onChange={(e) => updateState(selectedStateIndex, { name: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    style={styles.input}
                  />
                </Field>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Field label="Duration (s)" style={{ flex: 1 }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={selectedState.duration || 2}
                      onChange={(e) => updateState(selectedStateIndex, { duration: parseFloat(e.target.value) || 2 })}
                      style={styles.input}
                    />
                  </Field>
                </div>

                <Field label="Next State (Auto)">
                  <select
                    value={selectedState.transition?.nextState || ''}
                    onChange={(e) => updateState(selectedStateIndex, {
                      transition: {
                        ...selectedState.transition,
                        nextState: e.target.value || null,
                        type: e.target.value ? (selectedState.transition?.type || 'fade') : 'none'
                      }
                    })}
                    style={styles.input}
                  >
                    <option value="">None (Static)</option>
                    {scene.states
                      .filter((s, i) => i !== selectedStateIndex)
                      .map(s => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))
                    }
                  </select>
                </Field>

                {selectedState.transition?.nextState && (
                  <Field label="Effect">
                    <select
                      value={selectedState.transition?.type || 'fade'}
                      onChange={(e) => updateState(selectedStateIndex, { transition: { ...selectedState.transition, type: e.target.value } })}
                      style={styles.input}
                    >
                      {TRANSITION_TYPES.filter(t => t.type !== 'none').map(t => (
                        <option key={t.type} value={t.type}>{t.label}</option>
                      ))}
                    </select>
                  </Field>
                )}

                {scene.states.length > 1 && (
                  <button onClick={() => deleteState(selectedStateIndex)} style={{ ...styles.deleteButton, marginTop: '4px', fontSize: '10px', padding: '6px' }}>
                    🗑️ Delete State
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Canvas Preview */}
        <div style={{ ...styles.panel, display: 'flex', flexDirection: 'column', padding: '8px' }}>
          <CanvasPreview
            project={project}
            state={selectedState}
            selectedEntityKey={selectedEntityKey}
            onSelectEntity={setSelectedEntityKey}
            onUpdateEntity={(key, updates) => {
              // Update entity position from drag
              const [layerName, indexStr] = key.split(':')
              const index = parseInt(indexStr)
              const entities = [...(selectedState.layers?.[layerName] || [])]
              if (entities[index]) {
                entities[index] = { ...entities[index], ...updates }
                updateState(selectedStateIndex, {
                  layers: { ...selectedState.layers, [layerName]: entities }
                })
              }
            }}
            availableAssets={availableAssets}
          />
        </div>

        {/* Column 3: Layers (Drop Targets) */}
        <div style={styles.panel}>
          <h3 style={styles.panelHeader}>🎬 Layers</h3>
          <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 10px 0' }}>Drop entities here</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {LAYERS.slice().reverse().map(layer => {
              const entities = selectedState?.layers?.[layer.name] || []
              const isDragOver = dragOverLayer === layer.name && draggedEntityType

              return (
                <div key={layer.name}>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOverLayer(layer.name) }}
                    onDragLeave={() => setDragOverLayer(null)}
                    onDrop={() => handleDrop(layer.name)}
                    style={{
                      padding: '8px 10px',
                      background: isDragOver ? 'rgba(99, 102, 241, 0.3)' : entities.length > 0 ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0,0,0,0.2)',
                      border: isDragOver ? '2px dashed #6366f1' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '6px',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px' }}>{layer.icon}</span>
                        <span style={{ fontSize: '10px', fontWeight: '600', color: '#cbd5e1' }}>{layer.label}</span>
                      </div>

                      {/* Add Entity Menu */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {ENTITY_TYPES.map(type => (
                          <button
                            key={type.type}
                            onClick={() => {
                              const newEntity = createDefaultEntity(type.type, layer.name)
                              const newLayers = { ...selectedState.layers }
                              newLayers[layer.name] = [...(newLayers[layer.name] || []), newEntity]
                              updateState(selectedStateIndex, { layers: newLayers })
                              const newIndex = newLayers[layer.name].length - 1
                              setSelectedEntityKey(`${layer.name}:${newIndex}`)
                            }}
                            title={`Add ${type.label}`}
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              fontSize: '10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {type.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Entity list for this layer */}
                  {entities.length > 0 && (
                    <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                      {entities.map((entity, i) => {
                        const key = `${layer.name}:${i}`
                        const isSelected = selectedEntityKey === key
                        return (
                          <div
                            key={i}
                            onClick={() => setSelectedEntityKey(key)}
                            style={{
                              padding: '4px 8px',
                              background: isSelected ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '10px',
                              color: isSelected ? '#fff' : '#94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span>{ENTITY_TYPES.find(t => t.type === entity.type)?.icon || '?'}</span>
                            <span>{entity.id || entity.content || entity.text || entity.type}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Column 4: Entity Properties */}
        <div style={styles.panel}>
          <h3 style={styles.panelHeader}>🎯 Properties</h3>
          {selectedEntity ? (
            <EntityPropertyEditor
              entity={selectedEntity}
              onChange={updateSelectedEntity}
              onDelete={deleteSelectedEntity}
              project={project}
              scenes={project.scenes}
              states={scene.states}
              availableAssets={availableAssets}
              onOpenAssetManager={() => setShowAssetManager(true)}
              onOpenLogic={onOpenLogic}
            />
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>👆</div>
              <p>Select an entity from the layers or canvas to edit its properties</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Generate Modal */}
      {showAIModal && (
        <AIGenerateModal
          project={project}
          scene={scene}
          state={selectedState}
          onClose={() => setShowAIModal(false)}
          onGenerate={(generatedEntities, targetLayer) => {
            if (!generatedEntities || !targetLayer) return

            const newLayers = { ...selectedState.layers }
            newLayers[targetLayer] = [...(newLayers[targetLayer] || []), ...generatedEntities]
            updateState(selectedStateIndex, { layers: newLayers })
            setShowAIModal(false)
          }}
          onGenerateState={(newState) => {
            updateScene({ states: [...scene.states, newState] })
            setSelectedStateIndex(scene.states.length)
            setShowAIModal(false)
          }}
        />
      )}

      {/* Behavior Tree Editor */}
      {showBehaviorTree && (
        <BehaviorTreeEditor
          tree={scene.behaviorTree}
          onChange={(tree) => updateScene({ behaviorTree: tree })}
          onClose={() => setShowBehaviorTree(false)}
        />
      )}

      {/* Animation Curve Editor */}
      {showAnimationCurve && (
        <AnimationCurveEditor
          curve={scene.animationCurve}
          onChange={(curve) => updateScene({ animationCurve: curve })}
          onClose={() => setShowAnimationCurve(false)}
        />
      )}

      {/* Asset Manager */}
      {showAssetManager && (
        <AssetManager
          onSelectAsset={(asset) => {
            console.log('Asset selected:', asset, 'Selected entity:', selectedEntity)

            // If an entity is selected and it's a sprite, auto-assign the asset
            if (selectedEntity && selectedEntity.type === 'sprite') {
              // Load image to get dimensions and auto-size
              const img = new Image()
              img.onload = () => {
                const [layerName] = selectedEntityKey?.split(':') || []
                const isBackground = layerName === 'BG_FAR' || layerName === 'BG_NEAR' || layerName === 'VIDEO_IMAGE'

                // Use original image dimensions
                let width = img.width
                let height = img.height

                // Center the entity
                let x = project.canvas.width / 2
                let y = project.canvas.height / 2

                console.log('Auto-sizing to:', width, 'x', height)

                updateSelectedEntity({
                  assetId: asset.id,
                  width,
                  height,
                  x,
                  y
                })

                // Close asset manager after assignment
                setShowAssetManager(false)
                loadAvailableAssets()
              }
              img.onerror = () => {
                // Just set the assetId without size update
                console.log('Image load error, setting assetId only')
                updateSelectedEntity({ assetId: asset.id })
                setShowAssetManager(false)
                loadAvailableAssets()
              }
              img.src = `http://localhost:5174${asset.path}`
            } else {
              // No sprite selected, just close
              setShowAssetManager(false)
              loadAvailableAssets()
            }
          }}
          onClose={() => {
            setShowAssetManager(false)
            loadAvailableAssets()
          }}
        />
      )}
    </div>
  )
}

/**
 * Simple form field wrapper
 */
function Field({ label, children, style = {} }) {
  return (
    <div style={{ marginBottom: '10px', ...style }}>
      <label style={{
        display: 'block',
        fontSize: '10px',
        color: '#64748b',
        marginBottom: '4px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

/**
 * Canvas Preview Component - Shows visual representation of entities with actual images
 * Supports click-drag to move entities
 */
function CanvasPreview({ project, state, selectedEntityKey, onSelectEntity, onUpdateEntity, availableAssets }) {
  const containerRef = useRef(null)
  const [loadedImages, setLoadedImages] = useState({})
  const [dragging, setDragging] = useState(null) // { key, startX, startY, entityStartX, entityStartY }

  // Load images for sprites
  useEffect(() => {
    if (!state) return

    const imagesToLoad = []
    LAYERS.forEach(layer => {
      const entities = state.layers?.[layer.name] || []
      entities.forEach(entity => {
        if (entity.type === 'sprite' && entity.assetId && !loadedImages[entity.assetId]) {
          imagesToLoad.push(entity.assetId)
        }
      })
    })

    imagesToLoad.forEach(assetId => {
      // Try different image extensions
      const extensions = ['png', 'jpg', 'jpeg', 'webp']
      let loaded = false

      extensions.forEach(ext => {
        if (loaded) return
        const img = new Image()
        img.onload = () => {
          if (!loaded) {
            loaded = true
            setLoadedImages(prev => ({ ...prev, [assetId]: img }))
          }
        }
        img.src = `http://localhost:5174/assets/images/${assetId}.${ext}`
      })

      // Also try without extension (in case filename has it)
      const img2 = new Image()
      img2.onload = () => {
        if (!loaded) {
          setLoadedImages(prev => ({ ...prev, [assetId]: img2 }))
        }
      }
      // Find from available assets
      const asset = availableAssets?.images?.find(a => a.id === assetId)
      if (asset) {
        img2.src = `http://localhost:5174${asset.path}`
      }
    })
  }, [state, availableAssets])

  const canvasConfig = project.canvas

  // Fixed scale for preview - 270x480 for 1080x1920 canvas (25%)
  const scale = 0.25

  // Handle mouse down on entity to start dragging
  const handleMouseDown = (e, key, entity) => {
    e.stopPropagation()
    onSelectEntity(key)

    const rect = containerRef.current.getBoundingClientRect()
    setDragging({
      key,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      entityStartX: entity.x || 0,
      entityStartY: entity.y || 0
    })
  }

  // Handle mouse move for dragging
  const handleMouseMove = (e) => {
    if (!dragging || !onUpdateEntity) return

    const rect = containerRef.current.getBoundingClientRect()
    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top

    // Calculate delta in canvas coordinates (divide by scale)
    const deltaX = (currentX - dragging.startX) / scale
    const deltaY = (currentY - dragging.startY) / scale

    const newX = Math.round(dragging.entityStartX + deltaX)
    const newY = Math.round(dragging.entityStartY + deltaY)

    onUpdateEntity(dragging.key, { x: newX, y: newY })
  }

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setDragging(null)
  }

  if (!state) return null

  const previewWidth = canvasConfig.width * scale
  const previewHeight = canvasConfig.height * scale

  // Gather all entities from all layers
  const allEntities = []
  LAYERS.forEach(layer => {
    const entities = state.layers?.[layer.name] || []
    entities.forEach((entity, index) => {
      allEntities.push({ ...entity, _layer: layer.name, _index: index })
    })
  })

  // Preview dimensions: 270x480 for 1080x1920 (9:16 aspect ratio)

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        cursor: dragging ? 'grabbing' : 'default',
        padding: '16px'
      }}
    >
      {/* Phone preview - fixed 270x480 (9:16) */}
      <div style={{
        width: `${previewWidth}px`,
        height: `${previewHeight}px`,
        background: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)',
        borderRadius: '12px',
        border: '2px solid #444',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        flexShrink: 0
      }}>
        {/* Grid */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '27px 27px'
        }} />

        {/* Render entities */}
        {allEntities.map((entity, i) => {
          const key = `${entity._layer}:${entity._index}`
          const isSelected = selectedEntityKey === key
          const x = (entity.x || 0) * scale
          const y = (entity.y || 0) * scale
          const w = (entity.width || 100) * scale
          const h = (entity.height || 100) * scale

          // Check if this sprite has a loaded image
          const hasImage = entity.type === 'sprite' && entity.assetId && loadedImages[entity.assetId]
          const asset = availableAssets?.images?.find(a => a.id === entity.assetId)

          return (
            <div
              key={i}
              onMouseDown={(e) => handleMouseDown(e, key, entity)}
              style={{
                position: 'absolute',
                left: `${x - w / 2}px`,
                top: `${y - h / 2}px`,
                width: `${w}px`,
                height: `${h}px`,
                background: entity.type === 'shape'
                  ? entity.color || '#6366f1'
                  : entity.type === 'button'
                    ? entity.color || '#6366f1'
                    : hasImage ? 'transparent' : 'rgba(99, 102, 241, 0.3)',
                border: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: entity.shape === 'circle' ? '50%' : '4px',
                cursor: dragging?.key === key ? 'grabbing' : 'grab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
                color: '#fff',
                textAlign: 'center',
                overflow: (entity.type === 'text' || entity.type === 'button') ? 'visible' : 'hidden',
                boxShadow: isSelected ? '0 0 10px rgba(99, 102, 241, 0.5)' : 'none',
                userSelect: 'none',
                minWidth: (entity.type === 'text' || entity.type === 'button') ? 'max-content' : undefined,
                whiteSpace: (entity.type === 'text' || entity.type === 'button') ? 'nowrap' : 'normal'
              }}
            >
              {/* Render sprite image if available */}
              {entity.type === 'sprite' && asset && (
                <>
                  {/* Checkered background to show transparency */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)',
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                    opacity: 0.3
                  }} />
                  <img
                    src={`http://localhost:5174${asset.path}`}
                    alt={entity.assetId || ''}
                    draggable={false}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: entity.alpha ?? 1,
                      pointerEvents: 'none'
                    }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </>
              )}
              {entity.type === 'sprite' && !asset && (
                <span style={{ opacity: 0.5, pointerEvents: 'none' }}>🖼️</span>
              )}
              {entity.type === 'text' && (
                <div style={{
                  pointerEvents: 'none',
                  color: entity.color || '#ffffff',
                  fontSize: `${(entity.fontSize || 48) * scale}px`,
                  fontFamily: entity.fontFamily || 'Arial',
                  fontWeight: entity.fontWeight || 'normal',
                  textAlign: entity.textAlign || 'center',
                  width: 'max-content',
                  padding: '0 10px'
                }}>
                  {entity.content || 'Text'}
                </div>
              )}
              {entity.type === 'button' && (
                <div style={{
                  pointerEvents: 'none',
                  color: entity.textColor || '#ffffff',
                  fontSize: `${(entity.fontSize || 36) * scale}px`,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: 'max-content',
                  padding: '0 12px'
                }}>
                  {entity.text || 'Button'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Styles
const styles = {
  panel: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '12px',
    overflow: 'auto'
  },
  panelHeader: {
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  backButton: {
    padding: '4px 8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    color: '#94a3b8',
    fontSize: '12px',
    cursor: 'pointer'
  },
  toolButton: {
    padding: '4px 8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    color: '#94a3b8',
    fontSize: '12px',
    cursor: 'pointer'
  },
  generateButton: {
    padding: '4px 10px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  testButton: {
    padding: '4px 8px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  addStateButton: {
    padding: '4px 10px',
    background: 'rgba(99, 102, 241, 0.2)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '4px',
    color: '#a5b4fc',
    fontSize: '11px',
    cursor: 'pointer'
  },
  input: {
    width: '100%',
    padding: '6px 10px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '11px'
  },
  deleteButton: {
    padding: '6px 12px',
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '4px',
    color: '#fca5a5',
    fontSize: '11px',
    cursor: 'pointer'
  }
}
