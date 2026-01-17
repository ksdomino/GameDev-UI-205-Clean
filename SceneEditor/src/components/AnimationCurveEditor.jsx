import { useState, useRef, useEffect } from 'react'

/**
 * Animation Curve Editor - Visual easing curve editor
 * Allows users to create custom animation curves
 */

const PRESET_CURVES = [
  { name: 'Linear', points: [[0, 0], [1, 1]] },
  { name: 'Ease In', points: [[0, 0], [0.42, 0], [1, 1]] },
  { name: 'Ease Out', points: [[0, 0], [0.58, 1], [1, 1]] },
  { name: 'Ease In Out', points: [[0, 0], [0.42, 0], [0.58, 1], [1, 1]] },
  { name: 'Bounce', points: [[0, 0], [0.2, 0.6], [0.4, 0.8], [0.6, 0.4], [0.8, 1.1], [1, 1]] },
  { name: 'Elastic', points: [[0, 0], [0.3, 1.2], [0.5, 0.9], [0.7, 1.05], [1, 1]] }
]

export default function AnimationCurveEditor({ curve, onChange, onClose }) {
  const canvasRef = useRef(null)
  const [points, setPoints] = useState(curve?.points || [[0, 0], [0.5, 0.5], [1, 1]])
  const [selectedPoint, setSelectedPoint] = useState(null)
  const [dragging, setDragging] = useState(false)
  
  // Draw the curve
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const padding = 40
    
    // Clear
    ctx.fillStyle = '#0f0f23'
    ctx.fillRect(0, 0, width, height)
    
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * (width - padding * 2)
      const y = padding + (i / 10) * (height - padding * 2)
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }
    
    // Axis labels
    ctx.fillStyle = '#64748b'
    ctx.font = '10px Arial'
    ctx.fillText('0', padding - 15, height - padding + 5)
    ctx.fillText('1', width - padding + 5, height - padding + 5)
    ctx.fillText('1', padding - 15, padding + 5)
    ctx.fillText('Time →', width / 2, height - 10)
    ctx.save()
    ctx.translate(10, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Value →', 0, 0)
    ctx.restore()
    
    // Convert points to canvas coordinates
    const toCanvas = (p) => ({
      x: padding + p[0] * (width - padding * 2),
      y: height - padding - p[1] * (height - padding * 2)
    })
    
    // Draw curve
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 3
    ctx.beginPath()
    
    const sortedPoints = [...points].sort((a, b) => a[0] - b[0])
    sortedPoints.forEach((p, i) => {
      const cp = toCanvas(p)
      if (i === 0) {
        ctx.moveTo(cp.x, cp.y)
      } else {
        ctx.lineTo(cp.x, cp.y)
      }
    })
    ctx.stroke()
    
    // Draw points
    points.forEach((p, i) => {
      const cp = toCanvas(p)
      
      ctx.fillStyle = selectedPoint === i ? '#fff' : '#6366f1'
      ctx.beginPath()
      ctx.arc(cp.x, cp.y, selectedPoint === i ? 10 : 8, 0, Math.PI * 2)
      ctx.fill()
      
      if (selectedPoint === i) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })
    
    // Preview animation
    const time = (Date.now() % 2000) / 2000
    const value = evaluateCurve(sortedPoints, time)
    const previewPos = toCanvas([time, value])
    
    ctx.fillStyle = '#10b981'
    ctx.beginPath()
    ctx.arc(previewPos.x, previewPos.y, 6, 0, Math.PI * 2)
    ctx.fill()
    
  }, [points, selectedPoint])
  
  // Animate preview
  useEffect(() => {
    const interval = setInterval(() => {
      const canvas = canvasRef.current
      if (canvas) {
        // Trigger redraw
        setPoints(p => [...p])
      }
    }, 16)
    return () => clearInterval(interval)
  }, [])
  
  // Evaluate curve at time t
  const evaluateCurve = (pts, t) => {
    if (pts.length < 2) return t
    
    const sorted = [...pts].sort((a, b) => a[0] - b[0])
    
    // Find surrounding points
    let i = 0
    while (i < sorted.length - 1 && sorted[i + 1][0] < t) i++
    
    if (i >= sorted.length - 1) return sorted[sorted.length - 1][1]
    
    const p1 = sorted[i]
    const p2 = sorted[i + 1]
    
    const localT = (t - p1[0]) / (p2[0] - p1[0])
    return p1[1] + (p2[1] - p1[1]) * localT
  }
  
  // Handle mouse events
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = 1 - (e.clientY - rect.top) / rect.height
    
    // Check if clicking on existing point
    const clickedPoint = points.findIndex(p => {
      const dx = p[0] - x
      const dy = p[1] - y
      return Math.sqrt(dx * dx + dy * dy) < 0.05
    })
    
    if (clickedPoint !== -1) {
      setSelectedPoint(clickedPoint)
      setDragging(true)
    } else {
      // Add new point
      const newPoints = [...points, [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))]]
      setPoints(newPoints)
      setSelectedPoint(newPoints.length - 1)
    }
  }
  
  const handleMouseMove = (e) => {
    if (!dragging || selectedPoint === null) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = 1 - (e.clientY - rect.top) / rect.height
    
    // Don't move first or last point horizontally
    const newPoints = [...points]
    if (selectedPoint === 0) {
      newPoints[selectedPoint] = [0, Math.max(0, Math.min(1, y))]
    } else if (selectedPoint === points.length - 1) {
      newPoints[selectedPoint] = [1, Math.max(0, Math.min(1, y))]
    } else {
      newPoints[selectedPoint] = [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1.2, y))]
    }
    setPoints(newPoints)
  }
  
  const handleMouseUp = () => {
    setDragging(false)
  }
  
  // Delete selected point
  const deletePoint = () => {
    if (selectedPoint !== null && selectedPoint > 0 && selectedPoint < points.length - 1) {
      setPoints(points.filter((_, i) => i !== selectedPoint))
      setSelectedPoint(null)
    }
  }
  
  // Apply preset
  const applyPreset = (preset) => {
    setPoints(preset.points.map(p => [...p]))
    setSelectedPoint(null)
  }
  
  // Save
  const handleSave = () => {
    onChange({ points })
    onClose()
  }
  
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>📈 Animation Curve Editor</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Create custom easing curves
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSave} style={styles.saveButton}>Save</button>
            <button onClick={onClose} style={styles.closeButton}>✕</button>
          </div>
        </div>
        
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Presets */}
          <div style={styles.sidebar}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>Presets</h3>
            {PRESET_CURVES.map(preset => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                style={styles.presetButton}
              >
                {preset.name}
              </button>
            ))}
            
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Selected Point</h3>
              {selectedPoint !== null && selectedPoint > 0 && selectedPoint < points.length - 1 ? (
                <button onClick={deletePoint} style={styles.deleteButton}>
                  🗑️ Delete Point
                </button>
              ) : (
                <p style={{ fontSize: '11px', color: '#64748b' }}>
                  Click on curve to add points.<br/>
                  Drag points to adjust.
                </p>
              )}
            </div>
          </div>
          
          {/* Canvas */}
          <div style={styles.canvasContainer}>
            <canvas
              ref={canvasRef}
              width={500}
              height={400}
              style={styles.canvas}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            
            {/* Preview bar */}
            <div style={styles.previewBar}>
              <div style={styles.previewLabel}>Preview</div>
              <div style={styles.previewTrack}>
                <div 
                  style={{
                    ...styles.previewBall,
                    left: `${evaluateCurve(points, (Date.now() % 2000) / 2000) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    width: '700px',
    height: '550px',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  saveButton: {
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  closeButton: {
    width: '36px',
    height: '36px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '16px',
    cursor: 'pointer'
  },
  sidebar: {
    width: '150px',
    padding: '16px',
    borderRight: '1px solid rgba(255,255,255,0.1)',
    overflow: 'auto'
  },
  presetButton: {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    marginBottom: '6px',
    textAlign: 'left'
  },
  deleteButton: {
    padding: '8px 12px',
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    color: '#fca5a5',
    fontSize: '11px',
    cursor: 'pointer',
    width: '100%'
  },
  canvasContainer: {
    flex: 1,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  canvas: {
    borderRadius: '8px',
    cursor: 'crosshair'
  },
  previewBar: {
    marginTop: '16px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  previewLabel: {
    fontSize: '11px',
    color: '#64748b',
    width: '60px'
  },
  previewTrack: {
    flex: 1,
    height: '20px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '10px',
    position: 'relative'
  },
  previewBall: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '16px',
    height: '16px',
    background: '#10b981',
    borderRadius: '50%',
    transition: 'left 0.016s linear'
  }
}
