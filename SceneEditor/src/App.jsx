import { useState, useEffect, useCallback } from 'react'
import Dashboard from './components/Dashboard'
import SceneEditor from './components/SceneEditor'
import DebugPanel from './components/DebugPanel'
import ProjectManager from './components/ProjectManager'
import SceneFlowMap from './components/SceneFlowMap'
import AssetLibrary from './components/AssetLibrary'
import GameDataHub from './components/GameDataHub'
import LevelSelector from './components/LevelSelector'
import { createDefaultProject } from './data/defaultProject'
import * as api from './services/api'
import { connectFileWatcher, disconnectFileWatcher } from './services/api'


/**
 * Main App - GameDev UI
 * 
 * Views:
 * - projects: Project list and management (start here)
 * - dashboard: Project overview, scene list
 * - editor: Scene Editor (timeline, layers, entities)
 * - debug: Debug Panel (testing, inspection)
 */
export default function App() {
  const [view, setView] = useState('projects')
  const [previousView, setPreviousView] = useState(null) // Track where user came from
  const [project, setProject] = useState(null)
  const [projectFilename, setProjectFilename] = useState(null)
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0)
  const [selectedLevelIndex, setSelectedLevelIndex] = useState(0)
  const [selectedObjectId, setSelectedObjectId] = useState(null)
  const [preselectedActorId, setPreselectedActorId] = useState(null) // For navigation shortcuts
  const [backendConnected, setBackendConnected] = useState(false)
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved', 'saving', 'unsaved', 'error'
  const [lastError, setLastError] = useState(null)

  // Undo state
  const [undoItem, setUndoItem] = useState(null) // { type: 'level'|'scene', data, levelIndex? }
  const [showUndoToast, setShowUndoToast] = useState(false)

  // Check backend connection and setup file watcher on mount
  useEffect(() => {
    checkBackend()

    // Setup file watcher for IDE sync
    const handleFileChange = async (message) => {
      if (message.type === 'FILE_CHANGED' && projectFilename) {
        // Check if it's our current project
        if (message.data.filename === projectFilename) {
          console.log('🔄 Project file changed externally, reloading...')
          try {
            const reloadedProject = await api.loadProject(projectFilename)
            setProject(reloadedProject)
            setSaveStatus('saved')
          } catch (error) {
            console.error('Failed to reload project:', error)
          }
        }
      }
    }

    connectFileWatcher(handleFileChange)

    return () => {
      disconnectFileWatcher(handleFileChange)
    }
  }, [projectFilename])

  const checkBackend = async () => {
    const health = await api.checkBackendHealth()
    setBackendConnected(health.connected)
    if (!health.connected) {
      console.warn('Backend server not running. Start with: npm run server')
    }
  }

  // Auto-save to filesystem when project changes (debounced)
  useEffect(() => {
    if (!project || !backendConnected) return

    setSaveStatus('unsaved')

    const saveTimeout = setTimeout(async () => {
      try {
        setSaveStatus('saving')
        const result = await api.saveProject(project, projectFilename)
        setProjectFilename(result.filename)
        setSaveStatus('saved')
        console.log(`💾 Auto-saved: ${result.filename}`)
      } catch (error) {
        console.error('Auto-save failed:', error)
        setSaveStatus('error')
        setLastError(error.message)
        // Fall back to localStorage
        localStorage.setItem('gamedev-project-backup', JSON.stringify(project))
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(saveTimeout)
  }, [project, backendConnected])

  // Update project helper
  const updateProject = useCallback((updates) => {
    setProject(prev => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }))
  }, [])

  // Undo: store deleted item for restore
  const pushUndo = useCallback((type, data, levelIndex = null) => {
    setUndoItem({ type, data, levelIndex })
    setShowUndoToast(true)
    // Auto-hide toast after 5 seconds
    setTimeout(() => setShowUndoToast(false), 5000)
  }, [])

  // Undo: restore last deleted item
  const performUndo = useCallback(() => {
    if (!undoItem || !project) return

    if (undoItem.type === 'level') {
      // Restore level
      updateProject({
        levels: [...(project.levels || []), undoItem.data]
      })
    } else if (undoItem.type === 'scene') {
      // Restore scene to project.scenes
      const updatedScenes = [...(project.scenes || []), undoItem.data]

      // Also restore to level.sceneNames if levelIndex provided
      let updatedLevels = project.levels
      if (undoItem.levelIndex !== null && project.levels?.[undoItem.levelIndex]) {
        updatedLevels = project.levels.map((lvl, i) =>
          i === undoItem.levelIndex
            ? { ...lvl, sceneNames: [...(lvl.sceneNames || []), undoItem.data.name] }
            : lvl
        )
      }

      updateProject({
        levels: updatedLevels,
        scenes: updatedScenes
      })
    }

    setUndoItem(null)
    setShowUndoToast(false)
  }, [undoItem, project, updateProject])

  // Keyboard listener for Ctrl+Z / Cmd+Z undo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && undoItem) {
        e.preventDefault()
        performUndo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoItem, performUndo])

  // Load a project
  const loadProject = useCallback(async (filename) => {
    try {
      const loadedProject = await api.loadProject(filename)
      setProject(loadedProject)
      setProjectFilename(filename)
      setView('dashboard')
      setSaveStatus('saved')
    } catch (error) {
      console.error('Failed to load project:', error)
      setLastError(error.message)
    }
  }, [])

  // Create new project
  const createNewProject = useCallback((name = 'Untitled Game') => {
    const newProject = createDefaultProject()
    newProject.name = name
    setProject(newProject)
    setProjectFilename(null) // Will be auto-generated on first save
    setView('dashboard')
    setSaveStatus('unsaved')
  }, [])

  // Export game to Engine
  const exportToEngine = useCallback(async () => {
    if (!project) return
    try {
      const result = await api.exportGame(project)
      alert(`✅ Game exported!\n\nScenes: ${result.scenes.join(', ')}\nPath: ${result.enginePath}`)
      return result
    } catch (error) {
      console.error('Export failed:', error)
      setLastError(error.message)
      alert(`❌ Export failed: ${error.message}`)
    }
  }, [project])

  // Deploy to Android device
  const deployToAndroid = useCallback(async () => {
    if (!project) return

    // Use a simple state to show we're deploying
    const startTime = Date.now()
    console.log('📱 Starting Android deployment...')

    try {
      const result = await api.deployAndroid(project)
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)

      if (result.success) {
        alert(`✅ Android Build Complete! (${duration}s)\n\n${result.message}\n\nIn Android Studio:\n1. Wait for Gradle sync\n2. Connect your phone via USB\n3. Click the ▶ Run button`)
      } else {
        alert(`❌ Deploy failed at step: ${result.step || 'unknown'}\n\nError: ${result.error}`)
      }
    } catch (error) {
      console.error('Deploy failed:', error)
      setLastError(error.message)
      alert(`❌ Deploy failed: ${error.message}\n\nMake sure the backend server is running.`)
    }
  }, [project])

  // Navigation handlers
  const openSceneEditor = (sceneIndex) => {
    setPreviousView(view) // Remember where we came from
    setSelectedSceneIndex(sceneIndex)
    setView('editor')
  }

  // Go back from editor to wherever user came from
  const goBackFromEditor = () => {
    if (previousView === 'levelSelector') {
      setView('levelSelector')
    } else {
      setView('flowmap') // Default fallback to flowmap
    }
    setPreviousView(null)
  }

  const openDashboard = () => setView('dashboard')
  const openDebugPanel = () => setView('debug')
  const openProjectManager = () => setView('projects')
  const openFlowMap = () => setView('flowmap')
  const openAssetLibrary = () => setView('assetLibrary')
  const openGameDataHub = () => setView('gameDataHub')
  const openLevelSelector = () => setView('levelSelector')
  const openActorLogic = (actorId) => {
    setPreselectedActorId(actorId)
    setView('gameDataHub')
  }
  const openLevelEditor = (levelIndex) => {
    setSelectedLevelIndex(levelIndex)
    setView('flowmap')
  }


  // Connection status component - minimal, top-right corner
  const ConnectionStatus = () => (
    <div style={{
      position: 'fixed',
      top: '8px',
      right: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 10px',
      background: 'rgba(0,0,0,0.6)',
      borderRadius: '20px',
      fontSize: '10px',
      zIndex: 1000,
      opacity: 0.8
    }}>
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: backendConnected ? '#10b981' : '#ef4444'
      }} />
      {project && saveStatus && (
        <span style={{
          color: saveStatus === 'saved' ? '#6ee7b7'
            : saveStatus === 'saving' ? '#fcd34d'
              : '#94a3b8'
        }}>
          {saveStatus === 'saved' && '✓'}
          {saveStatus === 'saving' && '⏳'}
          {saveStatus === 'unsaved' && '•'}
          {saveStatus === 'error' && '✕'}
        </span>
      )}
    </div>
  )

  // Render current view
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {view === 'projects' && (
        <ProjectManager
          backendConnected={backendConnected}
          onLoadProject={loadProject}
          onCreateProject={createNewProject}
          onRetryConnection={checkBackend}
        />
      )}

      {view === 'dashboard' && project && (
        <Dashboard
          project={project}
          updateProject={updateProject}
          onOpenScene={openSceneEditor}
          onOpenDebug={openDebugPanel}
          onOpenProjects={openProjectManager}
          onOpenFlowMap={openFlowMap}
          onOpenLevelSelector={openLevelSelector}
          onOpenAssetLibrary={openAssetLibrary}
          onOpenGameData={openGameDataHub}
          onExportGame={exportToEngine}
          onDeployAndroid={deployToAndroid}
          saveStatus={saveStatus}
        />

      )}

      {view === 'levelSelector' && project && (
        <LevelSelector
          project={project}
          updateProject={updateProject}
          onBack={openDashboard}
          onEditLevel={openLevelEditor}
          onOpenScene={openSceneEditor}
          onPushUndo={pushUndo}
        />
      )}

      {view === 'assetLibrary' && project && (
        <AssetLibrary
          project={project}
          updateProject={updateProject}
          onBack={openDashboard}
        />
      )}

      {view === 'flowmap' && project && (
        <SceneFlowMap
          project={project}
          updateProject={updateProject}
          onOpenScene={openSceneEditor}
          onBack={openLevelSelector}
          levelIndex={selectedLevelIndex}
          onPushUndo={pushUndo}
        />
      )}

      {view === 'editor' && project && (
        <SceneEditor
          project={project}
          updateProject={updateProject}
          sceneIndex={selectedSceneIndex}
          onBack={goBackFromEditor}
          onOpenDebug={openDebugPanel}
          onOpenLogic={openActorLogic}
        />
      )}

      {view === 'debug' && project && (
        <DebugPanel
          project={project}
          sceneIndex={selectedSceneIndex}
          onBack={openDashboard}
        />
      )}

      {view === 'gameDataHub' && project && (
        <GameDataHub
          project={project}
          updateProject={updateProject}
          onBack={openDashboard}
          initialActorId={preselectedActorId}
        />
      )}



      {/* Undo Toast */}
      {showUndoToast && undoItem && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #1e1e3f 0%, #2a2a4a 100%)',
          borderRadius: '12px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          zIndex: 2000
        }}>
          <span style={{ color: '#fff', fontSize: '14px' }}>
            Deleted {undoItem.type === 'level' ? `"${undoItem.data.name}"` : `"${undoItem.data.name}"`}
          </span>
          <button
            onClick={performUndo}
            style={{
              padding: '6px 16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Undo
          </button>
          <span style={{ color: '#64748b', fontSize: '11px' }}>Ctrl+Z</span>
        </div>
      )}

      <ConnectionStatus />
    </div>
  )
}
