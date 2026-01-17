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
  const [project, setProject] = useState(null)
  const [projectFilename, setProjectFilename] = useState(null)
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0)
  const [selectedLevelIndex, setSelectedLevelIndex] = useState(0)
  const [selectedObjectId, setSelectedObjectId] = useState(null)
  const [backendConnected, setBackendConnected] = useState(false)
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved', 'saving', 'unsaved', 'error'
  const [lastError, setLastError] = useState(null)

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
    setSelectedSceneIndex(sceneIndex)
    setView('editor')
  }

  const openDashboard = () => setView('dashboard')
  const openDebugPanel = () => setView('debug')
  const openProjectManager = () => setView('projects')
  const openFlowMap = () => setView('flowmap')
  const openAssetLibrary = () => setView('assetLibrary')
  const openGameDataHub = () => setView('gameDataHub')
  const openLevelSelector = () => setView('levelSelector')
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
        />
      )}

      {view === 'editor' && project && (
        <SceneEditor
          project={project}
          updateProject={updateProject}
          sceneIndex={selectedSceneIndex}
          onBack={openDashboard}
          onOpenDebug={openDebugPanel}
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
        />
      )}



      <ConnectionStatus />
    </div>
  )
}
