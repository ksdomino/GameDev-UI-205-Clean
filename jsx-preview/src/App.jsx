import { useState, useEffect } from 'react'
import DebugPanelMockup from './mockup-debug-panel.jsx'
import SceneEditorMockup from './mockup-scene-editor.jsx'

export default function App() {
  const [screen, setScreen] = useState('editor')
  const [scale, setScale] = useState(1)
  
  // Calculate scale to fit 1920x1080 in viewport
  useEffect(() => {
    const calculateScale = () => {
      const padding = 100 // Space for controls
      const availableWidth = window.innerWidth - 40
      const availableHeight = window.innerHeight - padding
      
      const scaleX = availableWidth / 1920
      const scaleY = availableHeight / 1080
      
      setScale(Math.min(scaleX, scaleY, 1)) // Don't scale up, only down
    }
    
    calculateScale()
    window.addEventListener('resize', calculateScale)
    return () => window.removeEventListener('resize', calculateScale)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px'
    }}>
      {/* Control Bar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.05)',
        padding: '12px 20px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Preview:</span>
        <button 
          onClick={() => setScreen('debug')}
          style={{
            padding: '8px 16px',
            background: screen === 'debug' ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'rgba(255,255,255,0.05)',
            border: screen === 'debug' ? 'none' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🐛 Debug Panel
        </button>
        <button 
          onClick={() => setScreen('editor')}
          style={{
            padding: '8px 16px',
            background: screen === 'editor' ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.05)',
            border: screen === 'editor' ? 'none' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🎬 Scene Editor
        </button>
        
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
        
        <span style={{ color: '#64748b', fontSize: '12px' }}>
          Scale: {(scale * 100).toFixed(0)}%
        </span>
        <span style={{ color: '#64748b', fontSize: '12px' }}>
          | 1920×1080
        </span>
      </div>

      {/* Mockup Container with scaling */}
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {screen === 'debug' ? <DebugPanelMockup /> : <SceneEditorMockup />}
      </div>
      
      {/* Info */}
      <div style={{
        marginTop: '20px',
        color: '#64748b',
        fontSize: '11px',
        textAlign: 'center'
      }}>
        GameDev UI Mockup Preview • Designed for 1920×1080 landscape displays
      </div>
    </div>
  )
}
