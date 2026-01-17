import { useState, useEffect, useRef } from 'react'
import { listAssets, uploadAsset, validateAsset, deleteAsset } from '../services/api'
import SpriteSheetEditor from './SpriteSheetEditor'

/**
 * Asset Manager - Upload and manage sprites, backgrounds, and audio
 * Includes PO2 validation and size recommendations
 */
export default function AssetManager({ onSelectAsset, onClose, initialTab = 'sprites' }) {
  const [tab, setTab] = useState(initialTab) // 'sprites', 'backgrounds', 'audio'
  const [assets, setAssets] = useState({ images: [], sprites: [], backgrounds: [], audio: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [validation, setValidation] = useState(null)
  const [error, setError] = useState(null)
  const [showSpriteSheetEditor, setShowSpriteSheetEditor] = useState(false)
  const fileInputRef = useRef(null)
  
  // Load assets on mount
  useEffect(() => {
    loadAssets()
  }, [])
  
  const loadAssets = async () => {
    setIsLoading(true)
    try {
      const result = await listAssets()
      if (result.success) {
        setAssets(result.assets)
      }
    } catch (err) {
      setError('Failed to load assets')
    }
    setIsLoading(false)
  }
  
  // Handle file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setError(null)
    setValidation(null)
    
    // Determine asset type based on tab
    const assetType = tab === 'backgrounds' ? 'background' 
                    : tab === 'audio' ? (file.name.includes('music') ? 'music' : 'sfx')
                    : 'sprite'
    
    // For images, validate dimensions before upload
    if (file.type.startsWith('image/')) {
      const img = new Image()
      img.onload = async () => {
        // Validate dimensions
        try {
          const result = await validateAsset({
            width: img.width,
            height: img.height,
            assetType,
            fileSize: file.size
          })
          
          if (result.success) {
            setValidation({
              filename: file.name,
              width: img.width,
              height: img.height,
              ...result,
              file,
              assetType
            })
          }
        } catch (err) {
          // Continue without validation
          uploadFile(file, assetType)
        }
      }
      img.src = URL.createObjectURL(file)
    } else {
      // Audio files - upload directly
      uploadFile(file, assetType)
    }
    
    // Reset file input
    e.target.value = ''
  }
  
  // Upload file
  const uploadFile = async (file, assetType) => {
    setUploadProgress({ filename: file.name, progress: 0 })
    setError(null)
    
    try {
      // Convert to base64 using Promise
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const result = reader.result.split(',')[1]
            resolve(result)
          } catch (err) {
            reject(err)
          }
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })
      
      setUploadProgress({ filename: file.name, progress: 50 })
      
      // Upload to server
      const result = await uploadAsset({
        filename: file.name,
        assetType,
        data: base64
      })
      
      setUploadProgress({ filename: file.name, progress: 100 })
      
      if (result.success) {
        // Refresh assets list
        await loadAssets()
        setValidation(null)
        
        // Auto-select the uploaded asset (assigns to selected entity immediately)
        if (onSelectAsset && result.asset) {
          console.log('Auto-selecting uploaded asset:', result.asset)
          onSelectAsset(result.asset)
        }
        
        setTimeout(() => setUploadProgress(null), 500)
      } else {
        setError(result.error || 'Upload failed')
        setUploadProgress(null)
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed')
      setUploadProgress(null)
    }
  }
  
  // Confirm upload after validation
  const confirmUpload = () => {
    if (validation?.file) {
      uploadFile(validation.file, validation.assetType)
    }
  }
  
  // Delete asset
  const handleDelete = async (asset) => {
    if (!confirm(`Delete ${asset.filename}?`)) return
    
    try {
      const type = asset.type || (asset.path.includes('/music/') ? 'music' : asset.path.includes('/sfx/') ? 'sfx' : 'images')
      await deleteAsset(type, asset.filename)
      await loadAssets()
    } catch (err) {
      setError(err.message)
    }
  }
  
  // Get current tab's assets
  const getCurrentAssets = () => {
    switch (tab) {
      case 'backgrounds':
        return assets.backgrounds || []
      case 'audio':
        return assets.audio || []
      default:
        return assets.sprites || []
    }
  }
  
  const currentAssets = getCurrentAssets()
  
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>📦 Asset Manager</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Upload and manage game assets
            </p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>
        
        {/* Tabs */}
        <div style={styles.tabs}>
          {[
            { id: 'sprites', label: '🖼️ Sprites', count: assets.sprites?.length || 0 },
            { id: 'backgrounds', label: '🌄 Backgrounds', count: assets.backgrounds?.length || 0 },
            { id: 'audio', label: '🔊 Audio', count: assets.audio?.length || 0 }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                ...styles.tab,
                background: tab === t.id ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                borderColor: tab === t.id ? '#6366f1' : 'transparent'
              }}
            >
              {t.label} <span style={{ opacity: 0.5 }}>({t.count})</span>
            </button>
          ))}
        </div>
        
        {/* Upload Area */}
        <div style={styles.uploadArea}>
          <input
            ref={fileInputRef}
            type="file"
            accept={tab === 'audio' ? 'audio/*' : 'image/*'}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={styles.uploadButton}
          >
            ⬆️ Upload {tab === 'backgrounds' ? 'Background' : tab === 'audio' ? 'Audio' : 'Sprite'}
          </button>
          
          {tab === 'sprites' && (
            <button 
              onClick={() => setShowSpriteSheetEditor(true)}
              style={styles.spriteSheetButton}
            >
              🎬 Sprite Sheet Editor
            </button>
          )}
          
          {uploadProgress && (
            <div style={styles.progress}>
              <div style={styles.progressText}>
                Uploading {uploadProgress.filename}... {uploadProgress.progress}%
              </div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${uploadProgress.progress}%` }} />
              </div>
            </div>
          )}
        </div>
        
        {/* Validation Warning */}
        {validation && (
          <div style={styles.validation}>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px' }}>📋 Asset Analysis: {validation.filename}</h4>
            <div style={{ fontSize: '12px', marginBottom: '8px' }}>
              <strong>Dimensions:</strong> {validation.width}×{validation.height}px
              {validation.isPO2 ? (
                <span style={{ color: '#6ee7b7', marginLeft: '8px' }}>✓ PO2 Compliant</span>
              ) : (
                <span style={{ color: '#fca5a5', marginLeft: '8px' }}>⚠️ Not PO2</span>
              )}
            </div>
            
            {validation.warnings?.length > 0 && (
              <div style={styles.warningBox}>
                <strong>⚠️ Warnings:</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
                  {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            
            {validation.recommendations?.length > 0 && (
              <div style={styles.infoBox}>
                <strong>💡 Recommendations:</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
                  {validation.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={confirmUpload} style={styles.confirmButton}>
                ✓ Upload Anyway
              </button>
              <button onClick={() => setValidation(null)} style={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {/* Error */}
        {error && (
          <div style={styles.error}>
            ⚠️ {error}
            <button onClick={() => setError(null)} style={{ marginLeft: '8px', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        
        {/* Asset Grid */}
        <div style={styles.assetGrid}>
          {isLoading ? (
            <div style={styles.loading}>Loading assets...</div>
          ) : currentAssets.length === 0 ? (
            <div style={styles.empty}>
              <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>
                {tab === 'audio' ? '🔇' : '📁'}
              </div>
              <p>No {tab} uploaded yet</p>
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
                Click "Upload" to add assets
              </p>
            </div>
          ) : (
            currentAssets.map(asset => (
              <div 
                key={asset.filename}
                style={styles.assetCard}
                onClick={() => onSelectAsset?.(asset)}
              >
                {tab === 'audio' ? (
                  <div style={styles.audioIcon}>
                    {asset.type === 'music' ? '🎵' : '🔊'}
                  </div>
                ) : (
                  <div style={styles.assetPreview}>
                    <img 
                      src={`http://localhost:5174${asset.path}`} 
                      alt={asset.filename}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                )}
                <div style={styles.assetInfo}>
                  <div style={styles.assetName}>{asset.filename}</div>
                  <div style={styles.assetMeta}>{asset.sizeFormatted || ''}</div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(asset) }}
                  style={styles.deleteButton}
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
        
        {/* Tips */}
        <div style={styles.tips}>
          <h4 style={{ margin: '0 0 8px', fontSize: '12px' }}>
            {tab === 'sprites' && '📐 Sprite Guidelines'}
            {tab === 'backgrounds' && '🖼️ Background Guidelines'}
            {tab === 'audio' && '🔊 Audio Guidelines'}
          </h4>
          <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.6' }}>
            {tab === 'sprites' && (
              <>
                <p><strong>PO2 Rule:</strong> Sprite sheets should be Power of Two dimensions (64, 128, 256, 512, 1024, 2048px)</p>
                <p><strong>Max Size:</strong> Keep sheets ≤ 2048×2048 for mobile compatibility</p>
                <p><strong>Format:</strong> PNG with transparency recommended</p>
                <p><strong>File Size:</strong> Aim for &lt; 500KB per sheet</p>
                <p><strong>Frame Sizes:</strong> 64px (icons), 128px (enemies), 256px (players), 512px (bosses)</p>
              </>
            )}
            {tab === 'backgrounds' && (
              <>
                <p><strong>Full-Screen:</strong> 1080×1920px for static backgrounds</p>
                <p><strong>Tiled (Vertical):</strong> 1080×512px or 1080×1024px for seamless scroll</p>
                <p><strong>Tiled (Horizontal):</strong> 512×1920px or 1024×1920px</p>
                <p><strong>Naming:</strong> Use <code>bg_</code> or <code>_background</code> in filename</p>
              </>
            )}
            {tab === 'audio' && (
              <>
                <p><strong>Format:</strong> MP3 recommended (best compatibility)</p>
                <p><strong>Music:</strong> &lt; 3MB, 128-192kbps</p>
                <p><strong>SFX:</strong> &lt; 100KB, &lt; 3 seconds</p>
                <p><strong>Naming:</strong> Put in <code>music/</code> or <code>sfx/</code> folder by type</p>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Sprite Sheet Editor Modal */}
      {showSpriteSheetEditor && (
        <SpriteSheetEditor
          onSave={(metadata) => {
            console.log('Sprite sheet saved:', metadata)
            loadAssets()
          }}
          onClose={() => setShowSpriteSheetEditor(false)}
        />
      )}
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
    maxHeight: '90vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
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
  tabs: {
    display: 'flex',
    gap: '4px',
    padding: '0 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  tab: {
    padding: '12px 16px',
    background: 'transparent',
    border: '2px solid transparent',
    borderBottom: 'none',
    borderRadius: '8px 8px 0 0',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  uploadArea: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  uploadButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  spriteSheetButton: {
    padding: '10px 20px',
    background: 'rgba(251, 191, 36, 0.2)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: '8px',
    color: '#fbbf24',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  progress: {
    flex: 1
  },
  progressText: {
    fontSize: '11px',
    color: '#94a3b8',
    marginBottom: '4px'
  },
  progressBar: {
    height: '6px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: '#6366f1',
    transition: 'width 0.3s'
  },
  validation: {
    margin: '0 20px 16px',
    padding: '16px',
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: '8px'
  },
  warningBox: {
    padding: '8px 12px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '6px',
    color: '#fca5a5',
    fontSize: '11px',
    marginBottom: '8px'
  },
  infoBox: {
    padding: '8px 12px',
    background: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: '6px',
    color: '#a5b4fc',
    fontSize: '11px'
  },
  confirmButton: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer'
  },
  cancelButton: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '12px',
    cursor: 'pointer'
  },
  error: {
    margin: '0 20px 16px',
    padding: '12px',
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '12px'
  },
  assetGrid: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    alignContent: 'start'
  },
  loading: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px',
    color: '#64748b'
  },
  empty: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px',
    color: '#64748b'
  },
  assetCard: {
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    position: 'relative'
  },
  assetPreview: {
    height: '80px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
    overflow: 'hidden'
  },
  audioIcon: {
    height: '80px',
    background: 'rgba(99, 102, 241, 0.1)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    marginBottom: '8px'
  },
  assetInfo: {
    paddingRight: '24px'
  },
  assetName: {
    fontSize: '11px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  assetMeta: {
    fontSize: '10px',
    color: '#64748b'
  },
  deleteButton: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    width: '24px',
    height: '24px',
    background: 'rgba(239, 68, 68, 0.2)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  tips: {
    padding: '16px 20px',
    background: 'rgba(99, 102, 241, 0.05)',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  }
}
