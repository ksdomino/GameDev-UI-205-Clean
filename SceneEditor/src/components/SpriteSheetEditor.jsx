import { useState, useRef, useEffect, useCallback } from 'react'
import { uploadAsset, validateAsset } from '../services/api'

/**
 * Sprite Sheet Editor - Upload, configure, and preview animated sprites
 * 
 * Features:
 * - Upload sprite sheet PNG
 * - Define frame size (width × height)
 * - Visual grid overlay showing frame boundaries
 * - Animation preview with play/pause
 * - Define multiple animations (idle, walk, attack, etc.)
 * - Export sprite sheet JSON metadata
 */
export default function SpriteSheetEditor({ onSave, onClose, existingSheet = null }) {
  // Sheet state
  const [sheetImage, setSheetImage] = useState(null)
  const [sheetUrl, setSheetUrl] = useState(existingSheet?.imageUrl || null)
  const [sheetFilename, setSheetFilename] = useState(existingSheet?.filename || '')
  const [sheetSize, setSheetSize] = useState({ width: 0, height: 0 })
  
  // Frame configuration
  const [frameWidth, setFrameWidth] = useState(existingSheet?.frameSize?.w || 128)
  const [frameHeight, setFrameHeight] = useState(existingSheet?.frameSize?.h || 128)
  const [columns, setColumns] = useState(0)
  const [rows, setRows] = useState(0)
  
  // Animations
  const [animations, setAnimations] = useState(existingSheet?.animations || {
    idle: { row: 0, frames: 4, frameRate: 8, loop: true }
  })
  const [selectedAnimation, setSelectedAnimation] = useState('idle')
  const [newAnimName, setNewAnimName] = useState('')
  
  // Preview state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [showGrid, setShowGrid] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [hoveredCell, setHoveredCell] = useState(null)
  
  // Validation
  const [validation, setValidation] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const canvasRef = useRef(null)
  const previewCanvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const animationRef = useRef(null)
  
  // Calculate grid dimensions when frame size changes
  useEffect(() => {
    if (sheetSize.width && sheetSize.height && frameWidth && frameHeight) {
      setColumns(Math.floor(sheetSize.width / frameWidth))
      setRows(Math.floor(sheetSize.height / frameHeight))
    }
  }, [sheetSize, frameWidth, frameHeight])
  
  // Animation loop
  useEffect(() => {
    if (!isPlaying || !animations[selectedAnimation]) return
    
    const anim = animations[selectedAnimation]
    const frameDuration = 1000 / anim.frameRate
    
    animationRef.current = setInterval(() => {
      setCurrentFrame(prev => {
        const next = prev + 1
        if (next >= anim.frames) {
          if (anim.loop) return 0
          setIsPlaying(false)
          return prev
        }
        return next
      })
    }, frameDuration)
    
    return () => clearInterval(animationRef.current)
  }, [isPlaying, selectedAnimation, animations])
  
  // Draw main canvas with grid overlay
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sheetImage) return
    
    const ctx = canvas.getContext('2d')
    const displayWidth = sheetSize.width * zoom
    const displayHeight = sheetSize.height * zoom
    
    canvas.width = displayWidth
    canvas.height = displayHeight
    
    // Clear
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, displayWidth, displayHeight)
    
    // Draw checkerboard for transparency
    const checkSize = 8 * zoom
    for (let y = 0; y < displayHeight; y += checkSize * 2) {
      for (let x = 0; x < displayWidth; x += checkSize * 2) {
        ctx.fillStyle = '#2a2a4e'
        ctx.fillRect(x, y, checkSize, checkSize)
        ctx.fillRect(x + checkSize, y + checkSize, checkSize, checkSize)
      }
    }
    
    // Draw image
    ctx.drawImage(sheetImage, 0, 0, displayWidth, displayHeight)
    
    // Draw grid overlay
    if (showGrid && frameWidth && frameHeight) {
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)'
      ctx.lineWidth = 1
      
      // Vertical lines
      for (let x = 0; x <= columns; x++) {
        ctx.beginPath()
        ctx.moveTo(x * frameWidth * zoom, 0)
        ctx.lineTo(x * frameWidth * zoom, displayHeight)
        ctx.stroke()
      }
      
      // Horizontal lines
      for (let y = 0; y <= rows; y++) {
        ctx.beginPath()
        ctx.moveTo(0, y * frameHeight * zoom)
        ctx.lineTo(displayWidth, y * frameHeight * zoom)
        ctx.stroke()
      }
      
      // Highlight selected animation row
      if (animations[selectedAnimation]) {
        const anim = animations[selectedAnimation]
        ctx.fillStyle = 'rgba(99, 102, 241, 0.15)'
        ctx.fillRect(
          0, 
          anim.row * frameHeight * zoom, 
          anim.frames * frameWidth * zoom, 
          frameHeight * zoom
        )
        
        // Highlight current frame
        ctx.strokeStyle = '#22c55e'
        ctx.lineWidth = 3
        ctx.strokeRect(
          currentFrame * frameWidth * zoom,
          anim.row * frameHeight * zoom,
          frameWidth * zoom,
          frameHeight * zoom
        )
      }
      
      // Highlight hovered cell
      if (hoveredCell) {
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 2
        ctx.strokeRect(
          hoveredCell.col * frameWidth * zoom,
          hoveredCell.row * frameHeight * zoom,
          frameWidth * zoom,
          frameHeight * zoom
        )
      }
    }
  }, [sheetImage, sheetSize, frameWidth, frameHeight, columns, rows, zoom, showGrid, animations, selectedAnimation, currentFrame, hoveredCell])
  
  // Draw preview canvas with current animation frame
  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas || !sheetImage || !animations[selectedAnimation]) return
    
    const ctx = canvas.getContext('2d')
    const anim = animations[selectedAnimation]
    const previewScale = 2 // 2x scale for preview
    
    canvas.width = frameWidth * previewScale
    canvas.height = frameHeight * previewScale
    
    // Clear with checkerboard
    const checkSize = 8
    for (let y = 0; y < canvas.height; y += checkSize * 2) {
      for (let x = 0; x < canvas.width; x += checkSize * 2) {
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(x, y, checkSize, checkSize)
        ctx.fillRect(x + checkSize, y + checkSize, checkSize, checkSize)
        ctx.fillStyle = '#2a2a4e'
        ctx.fillRect(x + checkSize, y, checkSize, checkSize)
        ctx.fillRect(x, y + checkSize, checkSize, checkSize)
      }
    }
    
    // Draw current frame
    const srcX = currentFrame * frameWidth
    const srcY = anim.row * frameHeight
    
    ctx.drawImage(
      sheetImage,
      srcX, srcY, frameWidth, frameHeight,
      0, 0, frameWidth * previewScale, frameHeight * previewScale
    )
  }, [sheetImage, frameWidth, frameHeight, animations, selectedAnimation, currentFrame])
  
  // Handle file upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setSheetFilename(file.name)
    
    // Load image to get dimensions
    const img = new Image()
    img.onload = async () => {
      setSheetImage(img)
      setSheetUrl(URL.createObjectURL(file))
      setSheetSize({ width: img.width, height: img.height })
      
      // Validate PO2
      const result = await validateAsset({
        width: img.width,
        height: img.height,
        assetType: 'spritesheet',
        fileSize: file.size
      })
      
      setValidation({
        ...result,
        fileSize: file.size,
        filename: file.name
      })
      
      // Auto-detect frame size based on common patterns
      autoDetectFrameSize(img.width, img.height)
    }
    img.src = URL.createObjectURL(file)
    
    e.target.value = ''
  }
  
  // Auto-detect frame size
  const autoDetectFrameSize = (width, height) => {
    // Common frame sizes to try
    const commonSizes = [32, 64, 128, 256, 512]
    
    for (const size of commonSizes) {
      if (width % size === 0 && height % size === 0) {
        const cols = width / size
        const rows = height / size
        if (cols >= 1 && cols <= 16 && rows >= 1 && rows <= 16) {
          setFrameWidth(size)
          setFrameHeight(size)
          return
        }
      }
    }
    
    // Fallback: try to find reasonable division
    for (const size of commonSizes) {
      if (width % size === 0) {
        setFrameWidth(size)
        setFrameHeight(Math.min(height, size))
        return
      }
    }
  }
  
  // Handle canvas mouse move
  const handleCanvasMouseMove = useCallback((e) => {
    if (!sheetImage || !frameWidth || !frameHeight) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom
    
    const col = Math.floor(x / frameWidth)
    const row = Math.floor(y / frameHeight)
    
    if (col >= 0 && col < columns && row >= 0 && row < rows) {
      setHoveredCell({ col, row })
    } else {
      setHoveredCell(null)
    }
  }, [sheetImage, frameWidth, frameHeight, columns, rows, zoom])
  
  // Add new animation
  const addAnimation = () => {
    if (!newAnimName.trim()) return
    const name = newAnimName.toLowerCase().replace(/\s+/g, '_')
    
    if (animations[name]) {
      alert('Animation name already exists!')
      return
    }
    
    setAnimations(prev => ({
      ...prev,
      [name]: { row: 0, frames: 4, frameRate: 8, loop: true }
    }))
    setSelectedAnimation(name)
    setNewAnimName('')
  }
  
  // Update animation property
  const updateAnimation = (prop, value) => {
    setAnimations(prev => ({
      ...prev,
      [selectedAnimation]: { ...prev[selectedAnimation], [prop]: value }
    }))
    setCurrentFrame(0)
  }
  
  // Delete animation
  const deleteAnimation = () => {
    if (Object.keys(animations).length <= 1) {
      alert('You need at least one animation!')
      return
    }
    
    const newAnims = { ...animations }
    delete newAnims[selectedAnimation]
    setAnimations(newAnims)
    setSelectedAnimation(Object.keys(newAnims)[0])
  }
  
  // Save sprite sheet config
  const handleSave = async () => {
    if (!sheetImage || !sheetFilename) {
      alert('Please upload a sprite sheet first!')
      return
    }
    
    setIsUploading(true)
    
    try {
      // Upload the image if it's a new file
      if (sheetUrl?.startsWith('blob:')) {
        const response = await fetch(sheetUrl)
        const blob = await response.blob()
        const reader = new FileReader()
        
        await new Promise((resolve, reject) => {
          reader.onload = async () => {
            const base64 = reader.result.split(',')[1]
            await uploadAsset({
              filename: sheetFilename,
              assetType: 'sprite',
              data: base64
            })
            resolve()
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      }
      
      // Create metadata
      const metadata = {
        $schema: 'sprite-sheet-schema-v1',
        meta: {
          image: sheetFilename,
          size: { w: sheetSize.width, h: sheetSize.height },
          frameSize: { w: frameWidth, h: frameHeight },
          scale: 1
        },
        animations
      }
      
      onSave?.(metadata)
      onClose?.()
    } catch (err) {
      alert('Failed to save: ' + err.message)
    }
    
    setIsUploading(false)
  }
  
  const currentAnim = animations[selectedAnimation]
  
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>🎬 Sprite Sheet Editor</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Upload, configure frames, and preview animations
            </p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>
        
        <div style={styles.content}>
          {/* Left Panel - Sheet View */}
          <div style={styles.leftPanel}>
            {/* Upload / Info */}
            {!sheetImage ? (
              <div style={styles.uploadArea}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/webp"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <div style={styles.uploadPrompt} onClick={() => fileInputRef.current?.click()}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖼️</div>
                  <h3 style={{ margin: '0 0 8px' }}>Upload Sprite Sheet</h3>
                  <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                    PNG or WebP • Recommended: PO2 dimensions (512, 1024, 2048)
                  </p>
                </div>
                
                {/* Quick Reference */}
                <div style={styles.reference}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '12px' }}>📐 Frame Size Reference</h4>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Entity Type</th>
                        <th>Frame Size</th>
                        <th>Example</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>Icons/Particles</td><td>64×64</td><td>Coins, sparks</td></tr>
                      <tr><td>Small Enemies</td><td>128×128</td><td>Simple monsters</td></tr>
                      <tr><td>Main Players</td><td>256×256</td><td>Hero characters</td></tr>
                      <tr><td>Large Bosses</td><td>512×512</td><td>Full-screen detail</td></tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Free Asset Sources */}
                <div style={styles.assetSources}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '12px' }}>🎨 Free Sprite Sheet Sources</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                    <a href="https://kenney.nl/assets" target="_blank" rel="noopener" style={styles.sourceLink}>
                      <span>🏆</span> Kenney.nl - High-quality, perfectly gridded assets
                    </a>
                    <a href="https://opengameart.org" target="_blank" rel="noopener" style={styles.sourceLink}>
                      <span>🖼️</span> OpenGameArt.org - CC0/Libre licensed assets
                    </a>
                    <a href="https://itch.io/game-assets/free" target="_blank" rel="noopener" style={styles.sourceLink}>
                      <span>🎮</span> Itch.io - Free starter packs & sprites
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Sheet Info */}
                <div style={styles.sheetInfo}>
                  <span style={{ fontWeight: '600' }}>{sheetFilename}</span>
                  <span style={{ color: '#64748b' }}>{sheetSize.width}×{sheetSize.height}</span>
                  <span style={{ color: '#64748b' }}>{columns}×{rows} grid</span>
                  <button onClick={() => fileInputRef.current?.click()} style={styles.changeButton}>
                    Change
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/webp"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>
                
                {/* Validation warnings */}
                {validation && !validation.isPO2 && (
                  <div style={styles.warning}>
                    ⚠️ Not PO2 compliant. Mobile GPUs will pad to {validation.suggestedWidth}×{validation.suggestedHeight}
                  </div>
                )}
                
                {/* Canvas controls */}
                <div style={styles.canvasControls}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                    Show Grid
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Zoom:</span>
                    <input
                      type="range"
                      min="0.25"
                      max="2"
                      step="0.25"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      style={{ width: '80px' }}
                    />
                    <span style={{ fontSize: '11px' }}>{Math.round(zoom * 100)}%</span>
                  </div>
                </div>
                
                {/* Main canvas */}
                <div style={styles.canvasContainer}>
                  <canvas
                    ref={canvasRef}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{ cursor: 'crosshair' }}
                  />
                </div>
                
                {/* Hovered cell info */}
                {hoveredCell && (
                  <div style={styles.cellInfo}>
                    Cell: ({hoveredCell.col}, {hoveredCell.row}) • 
                    Pixel: ({hoveredCell.col * frameWidth}, {hoveredCell.row * frameHeight})
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Right Panel - Configuration */}
          <div style={styles.rightPanel}>
            {/* Frame Size */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>📐 Frame Size</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={styles.label}>Width</label>
                  <select
                    value={frameWidth}
                    onChange={(e) => setFrameWidth(parseInt(e.target.value))}
                    style={styles.input}
                  >
                    {[32, 64, 128, 256, 512].map(s => (
                      <option key={s} value={s}>{s}px</option>
                    ))}
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Height</label>
                  <select
                    value={frameHeight}
                    onChange={(e) => setFrameHeight(parseInt(e.target.value))}
                    style={styles.input}
                  >
                    {[32, 64, 128, 256, 512].map(s => (
                      <option key={s} value={s}>{s}px</option>
                    ))}
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              {sheetImage && (
                <div style={styles.gridInfo}>
                  Grid: {columns} columns × {rows} rows = {columns * rows} frames
                </div>
              )}
            </div>
            
            {/* Animation Preview */}
            {sheetImage && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>▶️ Animation Preview</h3>
                <div style={styles.previewContainer}>
                  <canvas ref={previewCanvasRef} style={styles.previewCanvas} />
                </div>
                <div style={styles.playbackControls}>
                  <button
                    onClick={() => { setIsPlaying(!isPlaying); if (!isPlaying) setCurrentFrame(0) }}
                    style={styles.playButton}
                  >
                    {isPlaying ? '⏹️ Stop' : '▶️ Play'}
                  </button>
                  <button
                    onClick={() => setCurrentFrame(prev => Math.max(0, prev - 1))}
                    disabled={isPlaying}
                    style={styles.stepButton}
                  >
                    ◀️
                  </button>
                  <span style={styles.frameCounter}>
                    Frame {currentFrame + 1} / {currentAnim?.frames || 1}
                  </span>
                  <button
                    onClick={() => setCurrentFrame(prev => Math.min((currentAnim?.frames || 1) - 1, prev + 1))}
                    disabled={isPlaying}
                    style={styles.stepButton}
                  >
                    ▶️
                  </button>
                </div>
              </div>
            )}
            
            {/* Animations */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🎭 Animations</h3>
              
              {/* Animation list */}
              <div style={styles.animList}>
                {Object.keys(animations).map(name => (
                  <button
                    key={name}
                    onClick={() => { setSelectedAnimation(name); setCurrentFrame(0); setIsPlaying(false) }}
                    style={{
                      ...styles.animButton,
                      background: selectedAnimation === name ? 'rgba(99, 102, 241, 0.3)' : 'rgba(0,0,0,0.2)',
                      borderColor: selectedAnimation === name ? '#6366f1' : 'transparent'
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
              
              {/* Add new animation */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input
                  type="text"
                  value={newAnimName}
                  onChange={(e) => setNewAnimName(e.target.value)}
                  placeholder="Animation name..."
                  style={{ ...styles.input, flex: 1 }}
                  onKeyDown={(e) => e.key === 'Enter' && addAnimation()}
                />
                <button onClick={addAnimation} style={styles.addButton}>+</button>
              </div>
              
              {/* Selected animation settings */}
              {currentAnim && (
                <div style={styles.animSettings}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={styles.label}>Row (0-{rows - 1})</label>
                      <input
                        type="number"
                        min="0"
                        max={rows - 1}
                        value={currentAnim.row}
                        onChange={(e) => updateAnimation('row', parseInt(e.target.value) || 0)}
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Frames</label>
                      <input
                        type="number"
                        min="1"
                        max={columns}
                        value={currentAnim.frames}
                        onChange={(e) => updateAnimation('frames', parseInt(e.target.value) || 1)}
                        style={styles.input}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <div>
                      <label style={styles.label}>Frame Rate (FPS)</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={currentAnim.frameRate}
                        onChange={(e) => updateAnimation('frameRate', parseInt(e.target.value) || 8)}
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Loop</label>
                      <select
                        value={currentAnim.loop ? 'yes' : 'no'}
                        onChange={(e) => updateAnimation('loop', e.target.value === 'yes')}
                        style={styles.input}
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>
                  {Object.keys(animations).length > 1 && (
                    <button onClick={deleteAnimation} style={styles.deleteAnimButton}>
                      🗑️ Delete "{selectedAnimation}"
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* JSON Preview */}
            {sheetImage && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>📋 Metadata Preview</h3>
                <pre style={styles.jsonPreview}>
{JSON.stringify({
  meta: {
    image: sheetFilename,
    size: sheetSize,
    frameSize: { w: frameWidth, h: frameHeight }
  },
  animations
}, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelButton}>Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={!sheetImage || isUploading}
            style={{
              ...styles.saveButton,
              opacity: !sheetImage || isUploading ? 0.5 : 1
            }}
          >
            {isUploading ? '⏳ Saving...' : '💾 Save Sprite Sheet'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    width: '1100px',
    maxWidth: '95vw',
    height: '85vh',
    maxHeight: '900px',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexShrink: 0
  },
  closeButton: {
    width: '32px',
    height: '32px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '16px',
    cursor: 'pointer'
  },
  content: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '20px',
    padding: '20px',
    overflow: 'hidden',
    minHeight: 0
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  uploadArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px'
  },
  uploadPrompt: {
    textAlign: 'center',
    padding: '48px',
    background: 'rgba(0,0,0,0.2)',
    border: '2px dashed rgba(99, 102, 241, 0.3)',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
    maxWidth: '400px'
  },
  reference: {
    background: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: '12px',
    padding: '16px',
    width: '100%',
    maxWidth: '400px'
  },
  assetSources: {
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    borderRadius: '12px',
    padding: '16px',
    width: '100%',
    maxWidth: '400px'
  },
  sourceLink: {
    color: '#86efac',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '6px',
    transition: 'background 0.15s'
  },
  table: {
    width: '100%',
    fontSize: '11px',
    borderCollapse: 'collapse',
    color: '#e2e8f0',
    textAlign: 'left'
  },
  tableHeader: {
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    paddingBottom: '6px',
    marginBottom: '6px'
  },
  tableRow: {
    padding: '4px 0'
  },
  sheetInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '8px',
    marginBottom: '8px',
    fontSize: '12px'
  },
  changeButton: {
    marginLeft: 'auto',
    padding: '4px 12px',
    background: 'rgba(99, 102, 241, 0.2)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '4px',
    color: '#a5b4fc',
    fontSize: '11px',
    cursor: 'pointer'
  },
  warning: {
    padding: '8px 12px',
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: '6px',
    color: '#fbbf24',
    fontSize: '11px',
    marginBottom: '8px'
  },
  canvasControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    fontSize: '12px'
  },
  canvasContainer: {
    flex: 1,
    overflow: 'auto',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center'
  },
  cellInfo: {
    padding: '8px',
    fontSize: '11px',
    color: '#94a3b8',
    textAlign: 'center'
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflow: 'auto'
  },
  section: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '16px'
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: '13px',
    fontWeight: '600'
  },
  label: {
    display: 'block',
    fontSize: '10px',
    color: '#64748b',
    marginBottom: '4px',
    textTransform: 'uppercase'
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '12px'
  },
  gridInfo: {
    marginTop: '8px',
    padding: '8px',
    background: 'rgba(99, 102, 241, 0.1)',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#a5b4fc',
    textAlign: 'center'
  },
  previewContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    marginBottom: '12px'
  },
  previewCanvas: {
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px'
  },
  playbackControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  playButton: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  stepButton: {
    padding: '6px 10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    color: '#94a3b8',
    cursor: 'pointer'
  },
  frameCounter: {
    fontSize: '11px',
    color: '#94a3b8',
    minWidth: '80px',
    textAlign: 'center'
  },
  animList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  animButton: {
    padding: '6px 12px',
    border: '1px solid',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
    color: '#fff'
  },
  addButton: {
    width: '36px',
    background: 'rgba(99, 102, 241, 0.2)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '6px',
    color: '#a5b4fc',
    fontSize: '18px',
    cursor: 'pointer'
  },
  animSettings: {
    marginTop: '12px',
    padding: '12px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '8px'
  },
  deleteAnimButton: {
    marginTop: '12px',
    width: '100%',
    padding: '8px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '4px',
    color: '#fca5a5',
    fontSize: '11px',
    cursor: 'pointer'
  },
  jsonPreview: {
    margin: 0,
    padding: '12px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '6px',
    fontSize: '9px',
    color: '#6ee7b7',
    overflow: 'auto',
    maxHeight: '150px'
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    flexShrink: 0
  },
  cancelButton: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer'
  },
  saveButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  }
}
