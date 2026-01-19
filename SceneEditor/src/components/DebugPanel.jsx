import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Debug Panel - Real-time game testing with embedded Engine
 */
export default function DebugPanel({ project, sceneIndex, onBack }) {
  const iframeRef = useRef(null)
  const [isEngineReady, setIsEngineReady] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(sceneIndex)
  const [debugInfo, setDebugInfo] = useState({
    fps: 0,
    sceneName: '',
    subSceneName: '',
    layerCounts: {},
    totalActors: 0
  })
  const [logs, setLogs] = useState([])
  const [fpsHistory, setFpsHistory] = useState(Array(30).fill(0))

  const selectedScene = project.scenes[selectedSceneIndex]
  const [engineError, setEngineError] = useState(false)

  // Add log entry - declare before useEffect that uses it
  const addLog = useCallback((message, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    setLogs(prev => [...prev.slice(-50), { time, message, type }])
  }, [])

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event) => {
      const { type, data } = event.data || {}

      switch (type) {
        case 'ENGINE_READY':
          setIsEngineReady(true)
          setEngineError(false)
          addLog('Engine ready', 'success')
          break

        case 'ENGINE_STARTED':
          setIsRunning(true)
          addLog('Engine started', 'success')
          break

        case 'ENGINE_STOPPED':
          setIsRunning(false)
          addLog('Engine stopped', 'info')
          break

        case 'SCENE_LOADED':
          setIsRunning(true)
          setEngineError(false)
          addLog(`Scene loaded: ${data.sceneName}`, 'success')
          addLog(`States: ${data.states.join(' → ')}`, 'info')
          break

        case 'PROJECT_LOADED':
          setIsRunning(true)
          setEngineError(false)
          addLog(`Project loaded: ${data.sceneCount} scenes`, 'success')
          addLog(`Start scene: ${data.startScene}`, 'info')
          break

        case 'STATE_CHANGED':
          addLog(`State changed: ${data.stateName}`, 'info')
          break

        case 'DEBUG_INFO':
          // Adapt engine data to new labels
          setDebugInfo({
            ...data,
            subSceneName: data.stateName,
            totalActors: data.totalEntities
          })
          setFpsHistory(prev => [...prev.slice(1), data.fps])
          // Sync running state from engine
          if (data.isRunning !== undefined) {
            setIsRunning(data.isRunning)
          }
          break

        case 'ERROR':
          addLog(`Error: ${data.message}`, 'error')
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [addLog])

  // Send message to iframe
  const sendToEngine = useCallback((message) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*')
    }
  }, [])

  // Convert project scene to engine-compatible format
  const convertSceneToConfig = (scene) => {
    return {
      sceneName: scene.name,
      canvasSize: {
        width: project.canvas.width,
        height: project.canvas.height
      },
      assets: {
        images: scene.assets?.images || [],
        audio: scene.assets?.audio || []
      },
      states: scene.states.map(state => ({
        name: state.name,
        duration: state.duration || 2,
        clearLayers: state.clearLayers || false,
        layers: state.layers || {},
        transition: state.transition || { type: 'none' }
      }))
    }
  }

  // Run the game
  const runGame = () => {
    if (!isEngineReady) {
      addLog('Waiting for engine...', 'warning')
      return
    }

    // Build project config with ALL scenes for proper transitions
    const projectConfig = {
      canvasSize: {
        width: project.canvas.width,
        height: project.canvas.height
      },
      startScene: selectedScene.name,
      // Pass useCustomScenes flag - if true, Engine uses JS scene classes instead of JSON
      useCustomScenes: project.useCustomScenes || false,
      scenes: project.scenes.map(scene => ({
        sceneName: scene.name,
        assets: {
          images: scene.assets?.images || [],
          audio: scene.assets?.audio || []
        },
        states: scene.states.map(state => ({
          name: state.name,
          duration: state.duration || 2,
          clearLayers: state.clearLayers || false,
          layers: state.layers || {},
          transition: state.transition || { type: 'none' }
        }))
      }))
    }

    addLog(`Loading project: ${project.scenes.length} scenes, starting at ${selectedScene.name}`, 'info')
    sendToEngine({ type: 'LOAD_PROJECT_CONFIG', data: projectConfig })

    // Focus the iframe so in-game clicks and controls work
    setTimeout(() => {
      if (iframeRef.current) {
        iframeRef.current.focus()
      }
    }, 100)
  }

  // Stop the game
  const stopGame = () => {
    sendToEngine({ type: 'STOP_ENGINE' })
  }

  // Switch to next state
  const nextState = () => {
    const currentStateIndex = selectedScene.states.findIndex(s => s.name === debugInfo.subSceneName)
    const nextIndex = (currentStateIndex + 1) % selectedScene.states.length
    const nextStateName = selectedScene.states[nextIndex].name

    sendToEngine({ type: 'SWITCH_STATE', data: { stateName: nextStateName } })
  }

  // Restart from first state
  const restartScene = () => {
    const firstStateName = selectedScene.states[0]?.name
    if (firstStateName) {
      sendToEngine({ type: 'SWITCH_STATE', data: { stateName: firstStateName } })
      addLog('Scene restarted', 'info')
    }
  }

  // Get FPS color
  const getFpsColor = (fps) => {
    if (fps >= 55) return '#10b981'
    if (fps >= 45) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(180deg, #0c0c1d 0%, #1a1a2e 100%)',
      display: 'grid',
      gridTemplateColumns: '1fr 380px',
      overflow: 'hidden'
    }}>
      {/* Left Panel - Debug Controls */}
      <div style={{
        padding: '16px',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={onBack} style={styles.backButton}>← Back to Home 🏠</button>
            <div style={styles.headerIcon}>🐛</div>
            <div>
              <h1 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Debug Panel</h1>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                {isEngineReady ? '🟢 Engine Ready' : '🟡 Initializing...'}
              </p>
            </div>
          </div>
        </div>

        {/* Scene Selector */}
        <div style={styles.panel}>
          <label style={styles.label}>ACTIVE SCENE</label>
          <select
            value={selectedSceneIndex}
            onChange={(e) => setSelectedSceneIndex(parseInt(e.target.value))}
            style={styles.select}
          >
            {project.scenes.map((scene, i) => (
              <option key={i} value={i}>
                {scene.name} {scene.isStartScene ? '⭐' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Performance Stats */}
        <div style={styles.panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <span>📊</span>
            <span style={{ fontSize: '12px', fontWeight: '600' }}>Performance</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
            <StatBox
              value={isRunning ? debugInfo.fps : '--'}
              label="FPS"
              color={isRunning ? getFpsColor(debugInfo.fps) : '#64748b'}
            />
            <StatBox
              value={debugInfo.totalActors || 0}
              label="Actors"
              color="#f59e0b"
            />
            <StatBox
              value={Object.keys(debugInfo.layerCounts).filter(k => debugInfo.layerCounts[k] > 0).length}
              label="Layers"
              color="#8b5cf6"
            />
          </div>

          {/* FPS Graph */}
          <div style={styles.fpsGraph}>
            {fpsHistory.map((fps, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: isRunning ? `${Math.min((fps / 60) * 100, 100)}%` : '20%',
                  background: isRunning
                    ? `linear-gradient(180deg, ${getFpsColor(fps)} 0%, ${getFpsColor(fps)}88 100%)`
                    : 'rgba(100,100,100,0.3)',
                  borderRadius: '2px',
                  transition: 'height 0.2s'
                }}
              />
            ))}
          </div>
        </div>

        {/* Current State */}
        <div style={styles.panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <span>📍</span>
            <span style={{ fontSize: '12px', fontWeight: '600' }}>Current Sub-Scene</span>
          </div>

          <div style={{
            padding: '10px',
            background: 'rgba(99, 102, 241, 0.15)',
            borderRadius: '6px',
            marginBottom: '10px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#a5b4fc' }}>
              {debugInfo.subSceneName || 'Not running'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Scene: {debugInfo.sceneName || selectedScene?.name}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={restartScene} disabled={!isRunning} style={styles.controlButton}>
              🔄 Restart
            </button>
            <button onClick={nextState} disabled={!isRunning} style={styles.controlButton}>
              ⏭️ Next Sub-Scene
            </button>
          </div>
        </div>

        {/* Layer Visibility */}
        <div style={styles.panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <span>🎬</span>
            <span style={{ fontSize: '12px', fontWeight: '600' }}>Layers</span>
          </div>

          {['UI_BUTTONS', 'TEXT', 'SPRITES', 'SHAPES', 'VIDEO_IMAGE', 'BG_NEAR', 'BG_FAR'].map(layer => (
            <div key={layer} style={styles.layerRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="checkbox" defaultChecked style={{ width: '14px', height: '14px' }} />
                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#94a3b8' }}>{layer}</span>
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                ({debugInfo.layerCounts?.[layer] || 0})
              </span>
            </div>
          ))}
        </div>

        {/* Console */}
        <div style={{ ...styles.panel, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📋</span>
              <span style={{ fontSize: '12px', fontWeight: '600' }}>Console</span>
            </div>
            <button onClick={() => setLogs([])} style={styles.clearButton}>Clear</button>
          </div>

          <div style={styles.console}>
            {logs.length === 0 ? (
              <div style={{ color: '#64748b' }}>No logs yet...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{
                  color: log.type === 'error' ? '#fca5a5'
                    : log.type === 'success' ? '#6ee7b7'
                      : log.type === 'warning' ? '#fcd34d'
                        : '#94a3b8'
                }}>
                  <span style={{ color: '#64748b' }}>[{log.time}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Game Preview */}
      <div style={{
        background: '#0a0a14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}>
        <div style={{ marginBottom: '10px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500' }}>GAME PREVIEW</div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>
              {project.canvas.width}×{project.canvas.height} (scaled)
            </div>
          </div>
          <button
            onClick={isRunning ? stopGame : runGame}
            style={{
              ...styles.runButton,
              padding: '8px 16px',
              fontSize: '12px',
              background: isRunning
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            }}
          >
            {isRunning ? '⏹️ Stop' : '▶️ Run'}
          </button>
        </div>

        {/* Engine iframe */}
        <div style={{
          width: '340px',
          height: '510px',
          background: '#000',
          borderRadius: '10px',
          border: '2px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <iframe
            ref={iframeRef}
            src="http://localhost:5174?embedded=true"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: engineError ? 'none' : 'block'
            }}
            title="Game Engine"
            onLoad={() => {
              // Iframe loaded - engine should send ENGINE_READY message
              console.log('Engine iframe loaded')
            }}
            onError={() => setEngineError(true)}
          />

          {/* Engine not running message - only show if truly failed */}
          {engineError && !isEngineReady && !isRunning && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>⚠️</div>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Engine Not Responding</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '12px' }}>
                Make sure Engine is running on port 5174
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.4)',
                padding: '8px 14px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#6ee7b7',
                marginBottom: '12px'
              }}>
                cd Engine && npm run dev
              </div>
              <button
                onClick={() => { setEngineError(false); setIsEngineReady(false) }}
                style={{
                  padding: '6px 14px',
                  background: 'rgba(99, 102, 241, 0.3)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#a5b4fc',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Overlay when not running - subtle hint only */}
          {!isRunning && !engineError && (
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '11px',
              color: '#94a3b8'
            }}>
              Press ▶️ Run to start
            </div>
          )}
        </div>

        {/* Sub-scene navigation */}
        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '8px' }}>Sub-Scenes in Scene</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {selectedScene?.states.map((state, i) => (
              <button
                key={i}
                onClick={() => isRunning && sendToEngine({ type: 'SWITCH_STATE', data: { stateName: state.name } })}
                disabled={!isRunning}
                style={{
                  padding: '4px 8px',
                  background: debugInfo.subSceneName === state.name
                    ? 'rgba(99, 102, 241, 0.5)'
                    : 'rgba(255,255,255,0.05)',
                  border: debugInfo.subSceneName === state.name
                    ? '1px solid #6366f1'
                    : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: debugInfo.subSceneName === state.name ? '#fff' : '#94a3b8',
                  fontSize: '9px',
                  cursor: isRunning ? 'pointer' : 'default',
                  opacity: isRunning ? 1 : 0.5
                }}
              >
                {state.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tip - compact */}
        <div style={{
          marginTop: '12px',
          fontSize: '9px',
          color: '#64748b',
          textAlign: 'center',
          maxWidth: '320px'
        }}>
          💡 Click sub-scene buttons to jump between sub-scenes
        </div>
      </div>
    </div>
  )
}

function StatBox({ value, label, color }) {
  return (
    <div style={{
      background: `${color}15`,
      border: `1px solid ${color}30`,
      borderRadius: '6px',
      padding: '8px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '18px', fontWeight: '700', color }}>{value}</div>
      <div style={{ fontSize: '9px', color: `${color}cc` }}>{label}</div>
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
    fontSize: '11px',
    cursor: 'pointer'
  },
  headerIcon: {
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px'
  },
  runButton: {
    padding: '8px 18px',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  },
  panel: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '12px'
  },
  label: {
    display: 'block',
    fontSize: '10px',
    color: '#64748b',
    marginBottom: '6px',
    fontWeight: '500'
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '12px'
  },
  fpsGraph: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '4px',
    padding: '6px',
    height: '40px',
    display: 'flex',
    alignItems: 'flex-end',
    gap: '2px'
  },
  controlButton: {
    flex: 1,
    padding: '6px 10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '11px',
    cursor: 'pointer'
  },
  layerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '5px 8px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '4px',
    marginBottom: '4px'
  },
  clearButton: {
    padding: '4px 8px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '4px',
    color: '#64748b',
    fontSize: '10px',
    cursor: 'pointer'
  },
  console: {
    flex: 1,
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '6px',
    padding: '10px',
    fontFamily: 'monospace',
    fontSize: '10px',
    overflow: 'auto',
    lineHeight: '1.6'
  }
}
