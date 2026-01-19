import { useState } from 'react'
import { createDefaultScene, LAYERS } from '../data/defaultProject'

/**
 * Dashboard - Project home page (simplified)
 * 
 * Clean layout with project info, nav buttons, and Scene Editor CTA.
 */
export default function Dashboard({
  project,
  updateProject,
  onOpenScene,
  onOpenDebug,
  onOpenProjects,
  onOpenFlowMap,
  onOpenLevelSelector,  // Opens Level Selector
  onOpenAssetLibrary,
  onOpenGameData,
  onExportGame,
  onDeployAndroid,
  saveStatus
}) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(project.name)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)

  // Save game name
  const saveGameName = () => {
    if (editedName.trim()) {
      updateProject({ name: editedName.trim() })
    }
    setIsEditingName(false)
  }

  // Calculate stats
  const totalSubScenes = project.scenes.reduce((sum, s) => sum + s.subScenes.length, 0)
  const totalActors = project.scenes.reduce((sum, scene) => {
    return sum + scene.subScenes.reduce((subSceneSum, subScene) => {
      return subSceneSum + Object.values(subScene.layers).reduce((layerSum, actors) => {
        return layerSum + actors.length
      }, 0)
    }, 0)
  }, 0)
  const totalAssets = project.assets.images.length + project.assets.audio.length

  // Button style helper
  const navButtonStyle = (gradient) => ({
    padding: '10px 20px',
    background: gradient,
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  })

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header - Navigation Only */}
      <header style={{
        padding: '12px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        {/* Left: Projects button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onOpenProjects && (
            <button
              onClick={onOpenProjects}
              style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              ← Projects
            </button>
          )}

          {/* Save Status */}
          {saveStatus && (
            <div style={{
              padding: '6px 12px',
              background: saveStatus === 'saved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              borderRadius: '6px',
              fontSize: '12px',
              color: saveStatus === 'saved' ? '#6ee7b7' : '#fcd34d'
            }}>
              {saveStatus === 'saved' && '✓ Saved'}
              {saveStatus === 'saving' && '⏳ Saving...'}
              {saveStatus === 'unsaved' && '• Unsaved'}
              {saveStatus === 'error' && '✕ Error'}
            </div>
          )}
        </div>

        {/* Right: Navigation Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {onOpenLevelSelector && (
            <button onClick={onOpenLevelSelector} style={navButtonStyle('linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)')}>
              🎮 Levels
            </button>
          )}

          {onOpenAssetLibrary && (
            <button onClick={onOpenAssetLibrary} style={navButtonStyle('linear-gradient(135deg, #ec4899 0%, #be185d 100%)')}>
              📦 Assets
            </button>
          )}

          {onOpenGameData && (
            <button onClick={onOpenGameData} style={navButtonStyle('linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)')}>
              📊 Game Data
            </button>
          )}

          <button onClick={onOpenDebug} style={navButtonStyle('linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)')}>
            🐛 Test & Debug
          </button>

          {onExportGame && (
            <button
              disabled={isExporting}
              onClick={async () => {
                setIsExporting(true)
                try {
                  await onExportGame()
                  setTimeout(() => {
                    window.open('http://localhost:5174', '_blank')
                    setIsExporting(false)
                  }, 800)
                } catch (e) {
                  setIsExporting(false)
                }
              }}
              style={{
                ...navButtonStyle(isExporting ? 'rgba(16, 185, 129, 0.5)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'),
                cursor: isExporting ? 'wait' : 'pointer',
                opacity: isExporting ? 0.7 : 1
              }}
            >
              {isExporting ? '⌛ Exporting...' : '🌐 Test in a new tab'}
            </button>
          )}

          {onDeployAndroid && (
            <button
              disabled={isDeploying}
              onClick={async () => {
                setIsDeploying(true)
                try {
                  await onDeployAndroid()
                  setIsDeploying(false)
                } catch (e) {
                  setIsDeploying(false)
                }
              }}
              style={{
                ...navButtonStyle(isDeploying ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'),
                cursor: isDeploying ? 'wait' : 'pointer',
                opacity: isDeploying ? 0.7 : 1
              }}
            >
              {isDeploying ? '⏳ Deploying...' : '📱 Test on Device'}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '32px 48px',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Project Info */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            margin: '0 auto 16px',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
          }}>🎮</div>

          {isEditingName ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={saveGameName}
              onKeyDown={(e) => e.key === 'Enter' && saveGameName()}
              autoFocus
              style={{
                fontSize: '28px',
                fontWeight: '700',
                background: 'rgba(0,0,0,0.3)',
                border: '2px solid #6366f1',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#fff',
                outline: 'none',
                textAlign: 'center',
                width: '300px'
              }}
            />
          ) : (
            <h1
              onClick={() => {
                setEditedName(project.name)
                setIsEditingName(true)
              }}
              style={{
                fontSize: '28px',
                fontWeight: '700',
                margin: '0 0 8px 0',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {project.name}
              <span style={{ fontSize: '16px', color: '#64748b' }}>✏️</span>
            </h1>
          )}

          {/* Stats - Inline and Small */}
          <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
            {project.canvas.width}×{project.canvas.height} • {project.scenes.length} scenes • {totalSubScenes} sub-scenes • {totalActors} actors • {totalAssets} assets
          </p>
        </div>

        {/* Levels CTA */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '16px',
          padding: '32px 48px',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#a5b4fc', margin: '0 0 12px 0' }}>
            🎮 Get Started
          </h2>
          <p style={{ fontSize: '15px', color: '#94a3b8', margin: '0 0 20px 0' }}>
            Click <strong style={{ color: '#c4b5fd' }}>Levels</strong> to design your game levels and scenes.
          </p>
          {onOpenLevelSelector && (
            <button
              onClick={onOpenLevelSelector}
              style={{
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)'
              }}
            >
              Open Levels →
            </button>
          )}
        </div>

        {/* Tips */}
        <div style={{
          marginTop: '32px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          maxWidth: '700px'
        }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6ee7b7', marginBottom: '8px' }}>
              🚀 Testing
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              Use <strong>Test in a new tab</strong> to preview, or <strong>Test on Device</strong> for Android.
            </p>
          </div>

          <div style={{
            background: 'rgba(236, 72, 153, 0.1)',
            border: '1px solid rgba(236, 72, 153, 0.2)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f9a8d4', marginBottom: '8px' }}>
              📦 Assets
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              Upload sprites and audio in the <strong>Assets</strong> panel.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
