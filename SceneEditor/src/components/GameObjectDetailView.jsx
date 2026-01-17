import { useState, useEffect } from 'react'
import * as api from '../services/api'

/**
 * Game Object Types
 */
const OBJECT_TYPES = [
    { value: 'ball', label: 'Ball', icon: '⚪' },
    { value: 'paddle', label: 'Paddle', icon: '🏓' },
    { value: 'player', label: 'Player', icon: '👤' },
    { value: 'enemy', label: 'Enemy', icon: '👾' },
    { value: 'projectile', label: 'Projectile', icon: '💥' },
    { value: 'pickup', label: 'Pickup', icon: '⭐' },
    { value: 'obstacle', label: 'Obstacle', icon: '🧱' },
    { value: 'other', label: 'Other', icon: '📦' }
]

const VISUAL_TYPES = [
    { value: 'shape', label: 'Shape', icon: '⬡' },
    { value: 'sprite', label: 'Sprite (Image)', icon: '🖼️' },
    { value: 'animatedSprite', label: 'Animated Sprite', icon: '🎬' }
]

const SHAPE_TYPES = [
    { value: 'rect', label: 'Rectangle' },
    { value: 'circle', label: 'Circle' }
]

/**
 * Sprite Picker Section - Allows selecting an image from the asset library
 */
function SpritePickerSection({ localObject, saveObject }) {
    const [assets, setAssets] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadAssets()
    }, [])

    const loadAssets = async () => {
        setLoading(true)
        try {
            const result = await api.getAssets()
            if (result.success) {
                setAssets(result.assets.images || [])
            }
        } catch (error) {
            console.error('Failed to load assets:', error)
        }
        setLoading(false)
    }

    const selectSprite = (asset) => {
        saveObject({
            spriteId: asset.id,
            spritePath: asset.path,
            spriteFilename: asset.filename
        })
    }

    return (
        <div>
            <div style={spriteStyles.field}>
                <label style={spriteStyles.label}>Selected Sprite</label>
                {localObject.spritePath ? (
                    <div style={spriteStyles.selectedSprite}>
                        <img
                            src={`http://localhost:5174${localObject.spritePath}`}
                            alt={localObject.spriteFilename}
                            style={spriteStyles.selectedImage}
                        />
                        <div style={spriteStyles.selectedInfo}>
                            <div>{localObject.spriteFilename}</div>
                            <button
                                onClick={() => saveObject({ spriteId: null, spritePath: null, spriteFilename: null })}
                                style={spriteStyles.clearButton}
                            >
                                ✕ Clear
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={spriteStyles.noSprite}>No sprite selected</div>
                )}
            </div>

            <div style={spriteStyles.field}>
                <label style={spriteStyles.label}>Choose from Asset Library</label>
                {loading ? (
                    <div style={spriteStyles.loading}>Loading assets...</div>
                ) : assets.length === 0 ? (
                    <div style={spriteStyles.empty}>
                        No images in asset library. Go to Assets to upload images.
                    </div>
                ) : (
                    <div style={spriteStyles.grid}>
                        {assets.map((asset, i) => (
                            <div
                                key={asset.id || i}
                                style={{
                                    ...spriteStyles.assetCard,
                                    ...(localObject.spriteId === asset.id ? spriteStyles.assetCardSelected : {})
                                }}
                                onClick={() => selectSprite(asset)}
                            >
                                <img
                                    src={`http://localhost:5174${asset.path}`}
                                    alt={asset.filename}
                                    style={spriteStyles.assetImage}
                                    onError={(e) => {
                                        e.target.style.display = 'none'
                                    }}
                                />
                                <div style={spriteStyles.assetName}>{asset.filename}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

const spriteStyles = {
    field: {
        marginBottom: '16px'
    },
    label: {
        display: 'block',
        fontSize: '11px',
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: '8px'
    },
    selectedSprite: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: 'rgba(99, 102, 241, 0.1)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '8px'
    },
    selectedImage: {
        width: '60px',
        height: '60px',
        objectFit: 'contain',
        borderRadius: '4px',
        background: 'rgba(0,0,0,0.2)'
    },
    selectedInfo: {
        flex: 1,
        fontSize: '12px'
    },
    clearButton: {
        marginTop: '8px',
        padding: '4px 8px',
        background: 'rgba(239, 68, 68, 0.2)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '4px',
        color: '#fca5a5',
        fontSize: '11px',
        cursor: 'pointer'
    },
    noSprite: {
        padding: '16px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        color: '#64748b',
        fontSize: '12px',
        textAlign: 'center'
    },
    loading: {
        padding: '16px',
        color: '#64748b',
        fontSize: '12px',
        textAlign: 'center'
    },
    empty: {
        padding: '16px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        color: '#64748b',
        fontSize: '12px',
        textAlign: 'center'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
        gap: '8px',
        maxHeight: '200px',
        overflowY: 'auto',
        padding: '4px'
    },
    assetCard: {
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px',
        padding: '8px',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.2s'
    },
    assetCardSelected: {
        borderColor: '#6366f1',
        background: 'rgba(99, 102, 241, 0.2)'
    },
    assetImage: {
        width: '100%',
        height: '50px',
        objectFit: 'contain'
    },
    assetName: {
        fontSize: '9px',
        color: '#94a3b8',
        marginTop: '4px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    }
}

/**
 * GameObjectDetailView - Edit a single game object
 */
export default function GameObjectDetailView({
    project,
    updateProject,
    objectId,
    onBack
}) {
    const gameObjects = project.gameObjects || []
    const objectIndex = gameObjects.findIndex(obj => obj.id === objectId)
    const gameObject = gameObjects[objectIndex]

    const [localObject, setLocalObject] = useState(gameObject)
    const [newVarKey, setNewVarKey] = useState('')
    const [newVarValue, setNewVarValue] = useState('')
    const [newVarType, setNewVarType] = useState('number')

    // Sync local state with props
    useEffect(() => {
        if (gameObject) {
            setLocalObject(gameObject)
        }
    }, [gameObject])

    if (!gameObject) {
        return (
            <div style={styles.container}>
                <div style={styles.errorState}>
                    <h2>Object Not Found</h2>
                    <p>The game object "{objectId}" doesn't exist.</p>
                    <button onClick={onBack} style={styles.backButton}>← Go Back</button>
                </div>
            </div>
        )
    }

    // Update the object in project
    const saveObject = (updates) => {
        const newLocalObject = { ...localObject, ...updates }
        setLocalObject(newLocalObject)

        const newGameObjects = [...gameObjects]
        newGameObjects[objectIndex] = newLocalObject
        updateProject({ gameObjects: newGameObjects })
    }

    // Add a new variable
    const addVariable = () => {
        if (!newVarKey.trim()) return

        let value = newVarValue
        if (newVarType === 'number') {
            value = parseFloat(newVarValue) || 0
        } else if (newVarType === 'boolean') {
            value = newVarValue === 'true'
        }

        const newVariables = {
            ...localObject.variables,
            [newVarKey]: value
        }
        saveObject({ variables: newVariables })
        setNewVarKey('')
        setNewVarValue('')
    }

    // Delete a variable
    const deleteVariable = (key) => {
        const newVariables = { ...localObject.variables }
        delete newVariables[key]
        saveObject({ variables: newVariables })
    }

    // Update a variable value
    const updateVariable = (key, value, type) => {
        let parsedValue = value
        if (type === 'number') {
            parsedValue = parseFloat(value) || 0
        } else if (type === 'boolean') {
            parsedValue = value === true || value === 'true'
        }

        const newVariables = {
            ...localObject.variables,
            [key]: parsedValue
        }
        saveObject({ variables: newVariables })
    }

    // Rename a variable
    const renameVariable = (oldKey, newKey) => {
        if (!newKey || newKey === oldKey || localObject.variables[newKey] !== undefined) return

        const newVariables = {}
        Object.entries(localObject.variables).forEach(([k, v]) => {
            newVariables[k === oldKey ? newKey : k] = v
        })
        saveObject({ variables: newVariables })
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={onBack} style={styles.backButton}>← Back to List</button>
                    <div>
                        <h1 style={styles.title}>
                            {OBJECT_TYPES.find(t => t.value === localObject.type)?.icon || '📦'} {localObject.id}
                        </h1>
                        <p style={styles.subtitle}>Edit game object properties and variables</p>
                    </div>
                </div>
            </header>

            <div style={styles.content}>
                {/* Left Column - Properties */}
                <div style={styles.propertiesPanel}>
                    <h2 style={styles.sectionTitle}>📋 Properties</h2>

                    {/* ID */}
                    <div style={styles.field}>
                        <label style={styles.label}>Object ID</label>
                        <input
                            type="text"
                            value={localObject.id}
                            onChange={(e) => saveObject({ id: e.target.value })}
                            style={styles.input}
                        />
                    </div>

                    {/* Type */}
                    <div style={styles.field}>
                        <label style={styles.label}>Type</label>
                        <select
                            value={localObject.type}
                            onChange={(e) => saveObject({ type: e.target.value })}
                            style={styles.select}
                        >
                            {OBJECT_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Visual Type */}
                    <div style={styles.field}>
                        <label style={styles.label}>Visual Type</label>
                        <select
                            value={localObject.visualType}
                            onChange={(e) => saveObject({ visualType: e.target.value })}
                            style={styles.select}
                        >
                            {VISUAL_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Shape-specific fields */}
                    {localObject.visualType === 'shape' && (
                        <>
                            <div style={styles.field}>
                                <label style={styles.label}>Shape</label>
                                <select
                                    value={localObject.shape || 'rect'}
                                    onChange={(e) => saveObject({ shape: e.target.value })}
                                    style={styles.select}
                                >
                                    {SHAPE_TYPES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Color</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="color"
                                        value={localObject.color || '#6366f1'}
                                        onChange={(e) => saveObject({ color: e.target.value })}
                                        style={{ width: '48px', height: '36px', border: 'none', borderRadius: '4px' }}
                                    />
                                    <input
                                        type="text"
                                        value={localObject.color || '#6366f1'}
                                        onChange={(e) => saveObject({ color: e.target.value })}
                                        style={{ ...styles.input, flex: 1 }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={styles.field}>
                                    <label style={styles.label}>Width</label>
                                    <input
                                        type="number"
                                        value={localObject.width || 100}
                                        onChange={(e) => saveObject({ width: parseInt(e.target.value) || 100 })}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>Height</label>
                                    <input
                                        type="number"
                                        value={localObject.height || 100}
                                        onChange={(e) => saveObject({ height: parseInt(e.target.value) || 100 })}
                                        style={styles.input}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Sprite-specific fields */}
                    {localObject.visualType === 'sprite' && (
                        <SpritePickerSection
                            localObject={localObject}
                            saveObject={saveObject}
                        />
                    )}
                </div>

                {/* Right Column - Variables */}
                <div style={styles.variablesPanel}>
                    <h2 style={styles.sectionTitle}>
                        🧩 Custom Variables
                        <span style={styles.varCount}>
                            {Object.keys(localObject.variables || {}).length}
                        </span>
                    </h2>

                    {/* Add new variable */}
                    <div style={styles.addVarForm}>
                        <input
                            type="text"
                            placeholder="Variable name"
                            value={newVarKey}
                            onChange={(e) => setNewVarKey(e.target.value)}
                            style={{ ...styles.input, flex: 1 }}
                        />
                        <select
                            value={newVarType}
                            onChange={(e) => setNewVarType(e.target.value)}
                            style={{ ...styles.select, width: '100px' }}
                        >
                            <option value="number">Number</option>
                            <option value="string">String</option>
                            <option value="boolean">Boolean</option>
                        </select>
                        <input
                            type={newVarType === 'number' ? 'number' : 'text'}
                            placeholder="Value"
                            value={newVarValue}
                            onChange={(e) => setNewVarValue(e.target.value)}
                            style={{ ...styles.input, width: '100px' }}
                        />
                        <button onClick={addVariable} style={styles.addVarButton}>
                            + Add
                        </button>
                    </div>

                    {/* Variable list */}
                    <div style={styles.varList}>
                        {Object.entries(localObject.variables || {}).length === 0 ? (
                            <div style={styles.emptyVars}>
                                <p>No variables defined yet.</p>
                                <p style={{ fontSize: '11px', color: '#64748b' }}>
                                    Add variables like "speed", "health", or "damage" to customize this object's behavior.
                                </p>
                            </div>
                        ) : (
                            Object.entries(localObject.variables || {}).map(([key, value]) => {
                                const valueType = typeof value
                                return (
                                    <div key={key} style={styles.varRow}>
                                        <input
                                            type="text"
                                            value={key}
                                            onChange={(e) => renameVariable(key, e.target.value)}
                                            style={{ ...styles.varInput, width: '120px' }}
                                        />
                                        <span style={styles.varEquals}>=</span>
                                        {valueType === 'boolean' ? (
                                            <label style={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={value}
                                                    onChange={(e) => updateVariable(key, e.target.checked, 'boolean')}
                                                />
                                                {value ? 'true' : 'false'}
                                            </label>
                                        ) : (
                                            <input
                                                type={valueType === 'number' ? 'number' : 'text'}
                                                value={value}
                                                onChange={(e) => updateVariable(key, e.target.value, valueType)}
                                                style={{ ...styles.varInput, flex: 1 }}
                                            />
                                        )}
                                        <span style={styles.varType}>{valueType}</span>
                                        <button
                                            onClick={() => deleteVariable(key)}
                                            style={styles.varDeleteButton}
                                        >
                                            ×
                                        </button>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div style={styles.previewSection}>
                <h3 style={styles.previewTitle}>Preview</h3>
                <div style={styles.previewCanvas}>
                    {localObject.visualType === 'shape' ? (
                        <div style={{
                            width: Math.min(localObject.width || 100, 200),
                            height: Math.min(localObject.height || 100, 120),
                            background: localObject.color || '#6366f1',
                            borderRadius: localObject.shape === 'circle' ? '50%' : '4px'
                        }} />
                    ) : (
                        <div style={{ color: '#64748b' }}>🖼️ Sprite Preview</div>
                    )}
                </div>
            </div>
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
    content: {
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        padding: '24px',
        overflowY: 'auto'
    },
    propertiesPanel: {
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '20px'
    },
    variablesPanel: {
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '20px'
    },
    sectionTitle: {
        fontSize: '14px',
        fontWeight: '600',
        margin: '0 0 20px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    varCount: {
        background: 'rgba(139, 92, 246, 0.2)',
        color: '#a78bfa',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '11px'
    },
    field: {
        marginBottom: '16px'
    },
    label: {
        display: 'block',
        fontSize: '11px',
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: '6px'
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px',
        color: '#fff',
        fontSize: '13px'
    },
    select: {
        width: '100%',
        padding: '10px 12px',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px',
        color: '#fff',
        fontSize: '13px'
    },
    comingSoon: {
        textAlign: 'center',
        padding: '24px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        color: '#94a3b8'
    },
    addVarForm: {
        display: 'flex',
        gap: '8px',
        marginBottom: '16px'
    },
    addVarButton: {
        padding: '10px 16px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        border: 'none',
        borderRadius: '6px',
        color: '#fff',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        whiteSpace: 'nowrap'
    },
    varList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    emptyVars: {
        textAlign: 'center',
        padding: '24px',
        color: '#64748b'
    },
    varRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '6px'
    },
    varInput: {
        padding: '6px 10px',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '4px',
        color: '#fff',
        fontSize: '12px'
    },
    varEquals: {
        color: '#64748b',
        fontSize: '14px'
    },
    varType: {
        fontSize: '10px',
        color: '#8b5cf6',
        textTransform: 'uppercase',
        padding: '2px 6px',
        background: 'rgba(139, 92, 246, 0.1)',
        borderRadius: '4px'
    },
    varDeleteButton: {
        background: 'transparent',
        border: 'none',
        color: '#ef4444',
        fontSize: '18px',
        cursor: 'pointer',
        padding: '0 4px'
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#fff',
        fontSize: '12px'
    },
    previewSection: {
        padding: '16px 24px',
        borderTop: '1px solid rgba(255,255,255,0.06)'
    },
    previewTitle: {
        fontSize: '12px',
        color: '#64748b',
        margin: '0 0 12px 0'
    },
    previewCanvas: {
        height: '120px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    errorState: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
    }
}
