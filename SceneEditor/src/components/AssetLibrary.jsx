import { useState, useEffect, useRef } from 'react'
import * as api from '../services/api'

/**
 * Asset Categories
 */
const ASSET_TABS = [
    { id: 'images', label: 'Images', icon: '🖼️' },
    { id: 'sprites', label: 'Sprites', icon: '🎮' },
    { id: 'audio', label: 'Sounds', icon: '🔊' }
]

/**
 * AssetLibrary - Manage game assets (images, sprites, sounds)
 */
export default function AssetLibrary({
    project,
    updateProject,
    onSelectAsset,  // Callback when asset is selected (for picker mode)
    pickerMode = false, // If true, show in modal/picker style
    filterType = null,  // Filter to specific type: 'images', 'sprites', 'audio'
    onBack
}) {
    const [activeTab, setActiveTab] = useState(filterType || 'images')
    const [assets, setAssets] = useState({ images: [], sprites: [], audio: [], backgrounds: [] })
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [selectedAsset, setSelectedAsset] = useState(null)
    const fileInputRef = useRef(null)

    // Load assets on mount
    useEffect(() => {
        loadAssets()
    }, [])

    const loadAssets = async () => {
        setLoading(true)
        try {
            const result = await api.getAssets()
            if (result.success) {
                setAssets(result.assets)
            }
        } catch (error) {
            console.error('Failed to load assets:', error)
        }
        setLoading(false)
    }

    // Handle file upload
    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files)
        if (files.length === 0) return

        setUploading(true)

        for (const file of files) {
            try {
                // Read file as base64
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result.split(',')[1])
                    reader.onerror = reject
                    reader.readAsDataURL(file)
                })

                // Determine asset type
                let assetType = 'image'
                if (file.type.startsWith('audio/')) {
                    assetType = activeTab === 'audio' ? 'sfx' : 'sfx'
                }

                // Upload
                const result = await api.uploadAsset({ filename: file.name, assetType, data: base64 })
                if (result.success) {
                    console.log(`✅ Uploaded: ${file.name}`)
                }
            } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error)
            }
        }

        // Reload assets
        await loadAssets()
        setUploading(false)

        // Clear input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // Handle asset delete
    const handleDelete = async (asset) => {
        if (!confirm(`Delete "${asset.filename}"?`)) return

        try {
            let type = 'images'
            if (asset.type === 'music') type = 'music'
            else if (asset.type === 'sfx') type = 'sfx'

            const result = await api.deleteAsset(type, asset.filename)
            if (result.success) {
                await loadAssets()
            }
        } catch (error) {
            console.error('Delete failed:', error)
        }
    }

    // Handle asset selection
    const handleSelect = (asset) => {
        if (pickerMode && onSelectAsset) {
            onSelectAsset(asset)
        } else {
            setSelectedAsset(asset)
        }
    }

    // Get current assets for active tab
    const getCurrentAssets = () => {
        switch (activeTab) {
            case 'sprites':
                return assets.sprites || []
            case 'audio':
                return assets.audio || []
            default:
                return assets.images || []
        }
    }

    // Get accept types for file input
    const getAcceptTypes = () => {
        if (activeTab === 'audio') {
            return 'audio/mp3,audio/wav,audio/ogg,audio/m4a,.mp3,.wav,.ogg,.m4a'
        }
        return 'image/png,image/jpeg,image/gif,image/webp,.png,.jpg,.jpeg,.gif,.webp'
    }

    const currentAssets = getCurrentAssets()

    return (
        <div style={styles.container}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    {onBack && !pickerMode && (
                        <button onClick={onBack} style={styles.backButton}>🏠 Home</button>
                    )}
                    <div>
                        <h1 style={styles.title}>📦 Asset Library</h1>
                        <p style={styles.subtitle}>
                            {assets.images.length} images • {assets.audio.length} sounds
                        </p>
                    </div>
                </div>

                <div style={styles.headerActions}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={getAcceptTypes()}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={styles.uploadButton}
                        disabled={uploading}
                    >
                        {uploading ? '⏳ Uploading...' : '📤 Upload'}
                    </button>
                </div>
            </header>

            {/* Tabs */}
            {!filterType && (
                <div style={styles.tabs}>
                    {ASSET_TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                ...styles.tab,
                                ...(activeTab === tab.id ? styles.tabActive : {})
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Asset Grid */}
            <div style={styles.content}>
                {loading ? (
                    <div style={styles.loading}>Loading assets...</div>
                ) : currentAssets.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>
                            {activeTab === 'audio' ? '🔊' : '🖼️'}
                        </div>
                        <h3 style={styles.emptyTitle}>No {activeTab} yet</h3>
                        <p style={styles.emptyText}>
                            Upload {activeTab === 'audio' ? 'sound files' : 'images'} to use in your game.
                        </p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={styles.uploadButton}
                        >
                            📤 Upload {activeTab === 'audio' ? 'Sounds' : 'Images'}
                        </button>
                    </div>
                ) : (
                    <div style={styles.assetGrid}>
                        {currentAssets.map((asset, i) => (
                            <div
                                key={asset.id || i}
                                style={{
                                    ...styles.assetCard,
                                    ...(selectedAsset?.id === asset.id ? styles.assetCardSelected : {})
                                }}
                                onClick={() => handleSelect(asset)}
                            >
                                {/* Preview */}
                                <div style={styles.assetPreview}>
                                    {activeTab === 'audio' ? (
                                        <span style={{ fontSize: '32px' }}>
                                            {asset.type === 'music' ? '🎵' : '🔊'}
                                        </span>
                                    ) : (
                                        <img
                                            src={`http://localhost:5174${asset.path}`}
                                            alt={asset.filename}
                                            style={styles.assetImage}
                                            onError={(e) => {
                                                e.target.style.display = 'none'
                                                e.target.nextSibling.style.display = 'flex'
                                            }}
                                        />
                                    )}
                                    <div style={{ display: 'none', ...styles.assetPlaceholder }}>
                                        🖼️
                                    </div>
                                </div>

                                {/* Info */}
                                <div style={styles.assetInfo}>
                                    <div style={styles.assetName} title={asset.filename}>
                                        {asset.filename}
                                    </div>
                                    <div style={styles.assetMeta}>
                                        {asset.sizeFormatted || 'Unknown size'}
                                    </div>
                                </div>

                                {/* Delete button */}
                                {!pickerMode && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDelete(asset)
                                        }}
                                        style={styles.deleteButton}
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Selected asset preview (non-picker mode) */}
            {selectedAsset && !pickerMode && (
                <div style={styles.previewPanel}>
                    <h3 style={styles.previewTitle}>Selected Asset</h3>
                    <div style={styles.previewContent}>
                        {activeTab !== 'audio' ? (
                            <img
                                src={`http://localhost:5174${selectedAsset.path}`}
                                alt={selectedAsset.filename}
                                style={styles.previewImage}
                            />
                        ) : (
                            <audio
                                src={`http://localhost:5174${selectedAsset.path}`}
                                controls
                                style={{ width: '100%' }}
                            />
                        )}
                        <div style={styles.previewInfo}>
                            <div><strong>File:</strong> {selectedAsset.filename}</div>
                            <div><strong>Path:</strong> {selectedAsset.path}</div>
                            <div><strong>Size:</strong> {selectedAsset.sizeFormatted}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: {
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#fff'
    },
    header: {
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    backButton: {
        padding: '8px 16px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        color: '#94a3b8',
        fontSize: '13px',
        cursor: 'pointer'
    },
    title: {
        fontSize: '20px',
        fontWeight: '600',
        margin: 0
    },
    subtitle: {
        fontSize: '12px',
        color: '#64748b',
        margin: '4px 0 0 0'
    },
    headerActions: {
        display: 'flex',
        gap: '12px'
    },
    uploadButton: {
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    tabs: {
        display: 'flex',
        gap: '4px',
        padding: '12px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
    },
    tab: {
        padding: '10px 20px',
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        color: '#94a3b8',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    tabActive: {
        background: 'rgba(99, 102, 241, 0.2)',
        borderColor: '#6366f1',
        color: '#a5b4fc'
    },
    content: {
        flex: 1,
        padding: '24px',
        overflowY: 'auto'
    },
    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '200px',
        color: '#64748b'
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center'
    },
    emptyIcon: {
        fontSize: '64px',
        marginBottom: '16px',
        opacity: 0.5
    },
    emptyTitle: {
        fontSize: '18px',
        fontWeight: '600',
        margin: '0 0 8px 0'
    },
    emptyText: {
        fontSize: '13px',
        color: '#64748b',
        margin: '0 0 24px 0'
    },
    assetGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '16px'
    },
    assetCard: {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative'
    },
    assetCardSelected: {
        borderColor: '#6366f1',
        boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.3)'
    },
    assetPreview: {
        width: '100%',
        height: '120px',
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
    },
    assetImage: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain'
    },
    assetPlaceholder: {
        fontSize: '32px',
        opacity: 0.5,
        alignItems: 'center',
        justifyContent: 'center'
    },
    assetInfo: {
        padding: '12px'
    },
    assetName: {
        fontSize: '12px',
        fontWeight: '500',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        marginBottom: '4px'
    },
    assetMeta: {
        fontSize: '11px',
        color: '#64748b'
    },
    deleteButton: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: 'rgba(0,0,0,0.5)',
        border: 'none',
        borderRadius: '4px',
        padding: '4px 6px',
        fontSize: '12px',
        cursor: 'pointer',
        opacity: 0.7
    },
    previewPanel: {
        padding: '16px 24px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.2)'
    },
    previewTitle: {
        fontSize: '12px',
        color: '#64748b',
        margin: '0 0 12px 0',
        textTransform: 'uppercase'
    },
    previewContent: {
        display: 'flex',
        gap: '16px',
        alignItems: 'center'
    },
    previewImage: {
        maxWidth: '120px',
        maxHeight: '80px',
        objectFit: 'contain',
        borderRadius: '4px'
    },
    previewInfo: {
        fontSize: '12px',
        color: '#94a3b8',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    }
}
