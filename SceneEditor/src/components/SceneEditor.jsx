import { useState, useRef, useEffect, useCallback } from 'react'
import { createDefaultSubScene, LAYERS, ENTITY_TYPES, ANIMATION_TYPES, TRANSITION_TYPES } from '../data/defaultProject'
import ActorPropertyEditor from './ActorPropertyEditor'
import AIGenerateModal from './AIGenerateModal'
import SubSceneFlowView from './SubSceneFlowView'
import BehaviorTreeEditor from './BehaviorTreeEditor'
import AnimationCurveEditor from './AnimationCurveEditor'
import AssetManager from './AssetManager'
import { listAssets } from '../services/api'

/**
 * Scene Editor - Timeline-based scene creation with drag-drop
 */
export default function SceneEditor({ project, updateProject, sceneIndex, onBack, onOpenDebug, onOpenLogic }) {
  const scene = project.scenes[sceneIndex]
  const [selectedSubSceneIndex, setSelectedSubSceneIndex] = useState(0)
  const [selectedEntityKey, setSelectedEntityKey] = useState(null) // "LAYER_NAME:index"
  const [draggedEntityType, setDraggedEntityType] = useState(null)
  const [dragOverLayer, setDragOverLayer] = useState(null)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showBehaviorTree, setShowBehaviorTree] = useState(false)
  const [showAnimationCurve, setShowAnimationCurve] = useState(false)
  const [showAssetManager, setShowAssetManager] = useState(false)
  const [showTransitions, setShowTransitions] = useState(false)
  const [availableAssets, setAvailableAssets] = useState({ images: [], sprites: [], backgrounds: [], audio: [] })
  const [activeLayerMenu, setActiveLayerMenu] = useState(null)
  const [hiddenLayers, setHiddenLayers] = useState(new Set(['SYSTEM']))

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

  const selectedSubScene = scene.subScenes[selectedSubSceneIndex]

  // Parse selected actor
  const getSelectedEntity = () => {
    if (!selectedEntityKey || !selectedSubScene) return null
    const [layerName, indexStr] = selectedEntityKey.split(':')
    const index = parseInt(indexStr)
    return selectedSubScene.layers?.[layerName]?.[index] || null
  }

  const selectedEntity = getSelectedEntity()

  // Update scene helper
  const updateScene = (updates) => {
    const newScenes = [...project.scenes]
    newScenes[sceneIndex] = { ...scene, ...updates }
    updateProject({ scenes: newScenes })
  }

  // Update sub-scene helper
  const updateSubScene = (subSceneIndex, updates) => {
    const newSubScenes = [...scene.subScenes]
    newSubScenes[subSceneIndex] = { ...newSubScenes[subSceneIndex], ...updates }
    updateScene({ subScenes: newSubScenes })
  }

  // Update selected entity
  const updateSelectedEntity = (updates) => {
    if (!selectedEntityKey) return
    const [layerName, indexStr] = selectedEntityKey.split(':')
    const index = parseInt(indexStr)

    const newLayers = { ...selectedSubScene.layers }
    const newLayerEntities = [...(newLayers[layerName] || [])]
    newLayerEntities[index] = { ...newLayerEntities[index], ...updates }
    newLayers[layerName] = newLayerEntities

    updateSubScene(selectedSubSceneIndex, { layers: newLayers })
  }

  // Delete selected entity
  const deleteSelectedEntity = () => {
    if (!selectedEntityKey) return
    const [layerName, indexStr] = selectedEntityKey.split(':')
    const index = parseInt(indexStr)

    const newLayers = { ...selectedSubScene.layers }
    newLayers[layerName] = newLayers[layerName].filter((_, i) => i !== index)

    updateSubScene(selectedSubSceneIndex, { layers: newLayers })
    setSelectedEntityKey(null)
  }

  // Add new sub-scene
  const addSubScene = () => {
    const subSceneName = `SUB_SCENE_${scene.subScenes.length + 1}`
    const newSubScene = createDefaultSubScene(subSceneName)
    updateScene({ subScenes: [...scene.subScenes, newSubScene] })
    setSelectedSubSceneIndex(scene.subScenes.length)
  }

  // Delete sub-scene
  const deleteSubScene = (index) => {
    if (scene.subScenes.length <= 1) {
      alert('You need at least one sub-scene!')
      return
    }
    const newSubScenes = scene.subScenes.filter((_, i) => i !== index)
    updateScene({ subScenes: newSubScenes })
    if (selectedSubSceneIndex >= newSubScenes.length) {
      setSelectedSubSceneIndex(newSubScenes.length - 1)
    }
  }

  // Generate a short, readable ID for entities
  const generateEntityId = (type, layerName) => {
    // Count existing actors of this type across all sub-scenes
    let count = 0
    scene.subScenes.forEach(subScene => {
      LAYERS.forEach(layer => {
        const entities = subScene.layers?.[layer.name] || []
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
      case 'logic':
        return {
          type: 'logic',
          id: generateEntityId('logic', layerName),
          x: centerX,
          y: centerY,
          width: 64,
          height: 64,
          visible: true,
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

    const newLayers = { ...selectedSubScene.layers }
    newLayers[layerName] = [...(newLayers[layerName] || []), newEntity]

    updateSubScene(selectedSubSceneIndex, { layers: newLayers })

    // Select the new entity
    const newIndex = newLayers[layerName].length - 1
    setSelectedEntityKey(`${layerName}:${newIndex}`)

    setDraggedEntityType(null)
    setDragOverLayer(null)
  }

  // Calculate total timeline duration
  const totalDuration = scene.subScenes.reduce((sum, subScene) => sum + (subScene.duration || 2), 0)
  const timelineWidth = Math.max(totalDuration * 100, 800)

  // Calculate actor counts
  const totalActors = Object.values(selectedSubScene?.layers || {}).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header - Simplified as Sub-Scenes moved to sidebar */}
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
          <h1 style={{ fontSize: '14px', fontWeight: '800', margin: 0 }}>Scene Editor - 🎬 {scene.name}</h1>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setShowTransitions(true)} style={styles.toolButton}>🔀 Transitions</button>
          <button onClick={() => setShowBehaviorTree(true)} style={styles.toolButton}>🌳 Logic</button>
          <button onClick={() => setShowAnimationCurve(true)} style={styles.toolButton}>🎞️ Animation</button>
          <button onClick={() => setShowAIModal(true)} style={styles.generateButton}>✨ AI Generate</button>
          <button onClick={onOpenDebug} style={styles.testButton}>🐛 Test & Debug</button>
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
        {/* Column 1: Sub-Scenes (Flow & Settings) */}
        <div style={{ ...styles.panel, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={styles.panelHeader}>🔀 Sub-Scenes</h3>
            <button onClick={addSubScene} style={{ ...styles.addStateButton, padding: '2px 8px' }}>+ New</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', marginTop: '8px', paddingRight: '4px' }}>
            <SubSceneFlowView
              scene={scene}
              selectedSubSceneIndex={selectedSubSceneIndex}
              onSelectSubScene={(i) => { setSelectedSubSceneIndex(i); setSelectedEntityKey(null) }}
              onUpdateSubScene={updateSubScene}
              vertical={true}
            />
          </div>

          {/* Sub-Scene Settings */}
          {selectedSubScene && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '10px' }}>
              <h3 style={{ ...styles.panelHeader, border: 'none', padding: 0, marginBottom: '8px' }}>⚙️ Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Field label="Name">
                  <input
                    type="text"
                    value={selectedSubScene.name}
                    onChange={(e) => updateSubScene(selectedSubSceneIndex, { name: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    style={styles.input}
                  />
                </Field>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Field label="Duration (s)" style={{ flex: 1 }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={selectedSubScene.duration || 2}
                      onChange={(e) => updateSubScene(selectedSubSceneIndex, { duration: parseFloat(e.target.value) || 2 })}
                      style={styles.input}
                    />
                  </Field>
                </div>

                <Field label="Next Sub-Scene (Auto)">
                  <select
                    value={selectedSubScene.transition?.nextSubScene || ''}
                    onChange={(e) => updateSubScene(selectedSubSceneIndex, {
                      transition: {
                        ...selectedSubScene.transition,
                        nextSubScene: e.target.value || null,
                        type: e.target.value ? (selectedSubScene.transition?.type || 'fade') : 'none'
                      }
                    })}
                    style={styles.input}
                  >
                    <option value="">None (Static)</option>
                    {scene.subScenes
                      .filter((s, i) => i !== selectedSubSceneIndex)
                      .map(s => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))
                    }
                  </select>
                </Field>

                {selectedSubScene.transition?.nextSubScene && (
                  <Field label="Effect">
                    <select
                      value={selectedSubScene.transition?.type || 'fade'}
                      onChange={(e) => updateSubScene(selectedSubSceneIndex, { transition: { ...selectedSubScene.transition, type: e.target.value } })}
                      style={styles.input}
                    >
                      {TRANSITION_TYPES.filter(t => t.type !== 'none').map(t => (
                        <option key={t.type} value={t.type}>{t.label}</option>
                      ))}
                    </select>
                  </Field>
                )}

                {scene.subScenes.length > 1 && (
                  <button onClick={() => deleteSubScene(selectedSubSceneIndex)} style={{ ...styles.deleteButton, marginTop: '4px', fontSize: '10px', padding: '6px' }}>
                    🗑️ Delete Sub-Scene
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
            subScene={selectedSubScene}
            selectedEntityKey={selectedEntityKey}
            onSelectEntity={setSelectedEntityKey}
            onUpdateEntity={(key, updates) => {
              // Update entity position from drag
              const [layerName, indexStr] = key.split(':')
              const index = parseInt(indexStr)
              const entities = [...(selectedSubScene.layers?.[layerName] || [])]
              if (entities[index]) {
                entities[index] = { ...entities[index], ...updates }
                updateSubScene(selectedSubSceneIndex, {
                  layers: { ...selectedSubScene.layers, [layerName]: entities }
                })
              }
            }}
            availableAssets={availableAssets}
            hiddenLayers={hiddenLayers}
          />
        </div>

        {/* Column 3: Layers (Drop Targets) */}
        <div style={{ ...styles.panel, position: 'relative' }}>
          <h3 style={styles.panelHeader}>🎬 Layers</h3>
          <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 10px 0' }}>Manage actors by layer</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {LAYERS.slice().reverse().map(layer => {
              const entities = selectedSubScene?.layers?.[layer.name] || []
              const isDragOver = dragOverLayer === layer.name && draggedEntityType

              return (
                <div key={layer.name} style={{ position: 'relative' }}>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOverLayer(layer.name) }}
                    onDragLeave={() => setDragOverLayer(null)}
                    onDrop={() => handleDrop(layer.name)}
                    style={{
                      padding: '8px 10px',
                      background: isDragOver ? 'rgba(99, 102, 241, 0.3)' : entities.length > 0 ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0,0,0,0.2)',
                      border: isDragOver ? '2px dashed #6366f1' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '6px',
                      transition: 'all 0.15s',
                      opacity: hiddenLayers.has(layer.name) ? 0.5 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newHidden = new Set(hiddenLayers);
                            if (newHidden.has(layer.name)) newHidden.delete(layer.name);
                            else newHidden.add(layer.name);
                            setHiddenLayers(newHidden);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: 0,
                            opacity: hiddenLayers.has(layer.name) ? 0.4 : 1
                          }}
                        >
                          {hiddenLayers.has(layer.name) ? '❌' : '👁️'}
                        </button>
                        <span style={{ fontSize: '12px' }}>{layer.icon}</span>
                        <span style={{ fontSize: '10px', fontWeight: '600', color: '#cbd5e1' }}>{layer.label}</span>
                      </div>

                      {/* Add Actor Button */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => setActiveLayerMenu(activeLayerMenu === layer.name ? null : layer.name)}
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff'
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  {activeLayerMenu === layer.name && (
                    <div style={{
                      position: 'absolute',
                      top: '32px',
                      right: '0',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '4px',
                      zIndex: 100,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      minWidth: '120px'
                    }}>
                      {ENTITY_TYPES.map(type => (
                        <button
                          key={type.type}
                          onClick={() => {
                            const newEntity = createDefaultEntity(type.type, layer.name)
                            const newLayers = { ...selectedSubScene.layers }
                            newLayers[layer.name] = [...(newLayers[layer.name] || []), newEntity]
                            updateSubScene(selectedSubSceneIndex, { layers: newLayers })
                            const newIndex = newLayers[layer.name].length - 1
                            setSelectedEntityKey(`${layer.name}:${newIndex}`)
                            setActiveLayerMenu(null)
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            background: 'none',
                            border: 'none',
                            padding: '6px 10px',
                            color: '#cbd5e1',
                            fontSize: '11px',
                            cursor: 'pointer',
                            borderRadius: '4px'
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseLeave={(e) => e.target.style.background = 'none'}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Actor list for this layer */}
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

        {/* Column 4: Actor Properties */}
        <div style={styles.panel}>
          <h3 style={styles.panelHeader}>🎯 Actor Properties</h3>
          {selectedEntity ? (
            <ActorPropertyEditor
              entity={selectedEntity}
              onChange={updateSelectedEntity}
              onDelete={deleteSelectedEntity}
              project={project}
              scenes={project.scenes}
              subScenes={scene.subScenes}
              availableAssets={availableAssets}
              onOpenAssetManager={() => setShowAssetManager(true)}
              onOpenLogic={onOpenLogic}
              onOpenAnimation={() => setShowAnimationCurve(true)}
            />
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>👆</div>
              <p>Select an actor from the layers or canvas to edit its properties</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Generate Modal */}
      {showAIModal && (
        <AIGenerateModal
          project={project}
          scene={scene}
          subScene={selectedSubScene}
          onClose={() => setShowAIModal(false)}
          onGenerate={(generatedEntities, targetLayer) => {
            if (!generatedEntities || !targetLayer) return

            const newLayers = { ...selectedSubScene.layers }
            newLayers[targetLayer] = [...(newLayers[targetLayer] || []), ...generatedEntities]
            updateSubScene(selectedSubSceneIndex, { layers: newLayers })
            setShowAIModal(false)
          }}
          onGenerateSubScene={(newSubScene) => {
            updateScene({ subScenes: [...scene.subScenes, newSubScene] })
            setSelectedSubSceneIndex(scene.subScenes.length)
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

      {/* Transitions Modal */}
      {showTransitions && (
        <TransitionsModal
          scene={scene}
          project={project}
          onUpdate={(updates) => updateScene(updates)}
          onClose={() => setShowTransitions(false)}
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
 * Canvas Preview Component - Shows visual representation of actors with actual images
 * Supports click-drag to move actors
 */
function CanvasPreview({ project, subScene, selectedEntityKey, onSelectEntity, onUpdateEntity, availableAssets, hiddenLayers }) {
  const containerRef = useRef(null)
  const [loadedImages, setLoadedImages] = useState({})
  const [dragging, setDragging] = useState(null) // { key, startX, startY, entityStartX, entityStartY }

  // Invisible Logic Actors Icons
  const LOGIC_ICONS = {
    'SYSTEM': '⚙️',
    'default': '🚩'
  }

  // Load images for sprites
  useEffect(() => {
    if (!subScene) return

    const imagesToLoad = []
    LAYERS.forEach(layer => {
      const entities = subScene.layers?.[layer.name] || []
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
  }, [subScene, availableAssets])

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

  if (!subScene) return null

  const previewWidth = canvasConfig.width * scale
  const previewHeight = canvasConfig.height * scale

  // Gather all actors from all non-hidden layers
  const allEntities = []
  LAYERS.forEach(layer => {
    if (hiddenLayers && hiddenLayers.has(layer.name)) return;
    const entities = subScene.layers?.[layer.name] || []
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
                    : hasImage ? 'transparent' : 'rgba(99, 102, 241, 0.1)',
                border: isSelected ? '2px solid #fff' : (hasImage ? 'none' : '1px solid rgba(255,255,255,0.2)'),
                borderRadius: entity.shape === 'circle' ? '50%' : '4px',
                cursor: dragging?.key === key ? 'grabbing' : 'grab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: '#fff',
                textAlign: 'center',
                overflow: (entity.type === 'text' || entity.type === 'button') ? 'visible' : 'hidden',
                boxShadow: isSelected ? '0 0 10px rgba(99, 102, 241, 0.5)' : 'none',
                userSelect: 'none',
                minWidth: (entity.type === 'text' || entity.type === 'button') ? 'max-content' : undefined,
                whiteSpace: (entity.type === 'text' || entity.type === 'button') ? 'nowrap' : 'normal',
                opacity: entity.alpha ?? 1,
                zIndex: isSelected ? 100 : i
              }}
            >
              {/* Invisible Actor Icon */}
              {entity.type !== 'text' && entity.type !== 'button' && !hasImage && (
                <span style={{ fontSize: '20px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                  {LOGIC_ICONS[entity._layer] || LOGIC_ICONS.default}
                </span>
              )}
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
  addSubSceneButton: {
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

/**
 * Transitions Modal - Configure scene-to-scene transitions
 */
function TransitionsModal({ scene, project, onUpdate, onClose }) {
  const [transitions, setTransitions] = useState(scene.transitions || [])

  const addTransition = () => {
    const newTransition = {
      id: Date.now(),
      trigger: 'button_click',
      targetScene: '',
      animation: 'crossfade'
    }
    const updated = [...transitions, newTransition]
    setTransitions(updated)
    onUpdate({ transitions: updated })
  }

  const updateTransition = (index, updates) => {
    const updated = [...transitions]
    updated[index] = { ...updated[index], ...updates }
    setTransitions(updated)
    onUpdate({ transitions: updated })
  }

  const removeTransition = (index) => {
    const updated = transitions.filter((_, i) => i !== index)
    setTransitions(updated)
    onUpdate({ transitions: updated })
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        width: '500px',
        background: '#1e1e2f',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#fff' }}>🔀 Scene Transitions</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
          Define how this scene flows into others. These logical links guide the player's journey.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
          {transitions.map((t, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>TRIGGER</label>
                  <select
                    value={t.trigger}
                    onChange={(e) => updateTransition(i, { trigger: e.target.value })}
                    style={{ width: '100%', background: '#000', color: '#fff', border: '1px solid #333', padding: '6px', borderRadius: '4px', fontSize: '12px' }}
                  >
                    <option value="button_click">On Button Click</option>
                    <option value="scene_end">On Scene End (Timer)</option>
                    <option value="condition">On Custom Condition</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>TARGET SCENE</label>
                  <select
                    value={t.targetScene}
                    onChange={(e) => updateTransition(i, { targetScene: e.target.value })}
                    style={{ width: '100%', background: '#000', color: '#fff', border: '1px solid #333', padding: '6px', borderRadius: '4px', fontSize: '12px' }}
                  >
                    <option value="">Select Scene...</option>
                    {project.scenes.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => removeTransition(i)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}
                >
                  Delete Transition
                </button>
              </div>
            </div>
          ))}

          {transitions.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed #333' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🛤️</div>
              <div style={{ color: '#64748b', fontSize: '13px' }}>No transitions defined yet.</div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button
            onClick={addTransition}
            style={{
              flex: 1,
              padding: '12px',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '8px',
              color: '#a5b4fc',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            + Add New Transition
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
