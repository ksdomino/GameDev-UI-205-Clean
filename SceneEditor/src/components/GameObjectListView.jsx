import { useState } from 'react'

/**
 * Game Object Types for filtering
 */
const OBJECT_TYPES = [
    { value: 'all', label: 'All Types', icon: '🎮' },
    { value: 'ball', label: 'Ball', icon: '⚪' },
    { value: 'paddle', label: 'Paddle', icon: '🏓' },
    { value: 'player', label: 'Player', icon: '👤' },
    { value: 'enemy', label: 'Enemy', icon: '👾' },
    { value: 'projectile', label: 'Projectile', icon: '💥' },
    { value: 'pickup', label: 'Pickup', icon: '⭐' },
    { value: 'obstacle', label: 'Obstacle', icon: '🧱' },
    { value: 'other', label: 'Other', icon: '📦' }
]

/**
 * Create a new default game object
 */
export const createDefaultGameObject = (id = null) => ({
    id: id || `object_${Date.now()}`,
    type: 'other',
    visualType: 'shape', // 'shape', 'sprite', 'animatedSprite'
    shape: 'rect',
    color: '#6366f1',
    width: 100,
    height: 100,
    variables: {}
})

/**
 * GameObjectListView - List all game objects with filtering
 */
export default function GameObjectListView({
    project,
    updateProject,
    onOpenDetail,
    onBack
}) {
    const [filterType, setFilterType] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')

    const gameObjects = project.gameObjects || []

    // Filter objects
    const filteredObjects = gameObjects.filter(obj => {
        const matchesType = filterType === 'all' || obj.type === filterType
        const matchesSearch = !searchQuery ||
            obj.id.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesType && matchesSearch
    })

    // Add new game object
    const addGameObject = () => {
        const newObject = createDefaultGameObject()
        updateProject({
            gameObjects: [...gameObjects, newObject]
        })
        // Open detail view for the new object
        onOpenDetail(newObject.id)
    }

    // Delete game object
    const deleteGameObject = (id) => {
        if (confirm(`Delete "${id}"? This cannot be undone.`)) {
            updateProject({
                gameObjects: gameObjects.filter(obj => obj.id !== id)
            })
        }
    }

    // Get icon for object type
    const getTypeIcon = (type) => {
        const found = OBJECT_TYPES.find(t => t.value === type)
        return found ? found.icon : '📦'
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={onBack} style={styles.backButton}>← Back</button>
                    <div>
                        <h1 style={styles.title}>🎮 Game Objects</h1>
                        <p style={styles.subtitle}>
                            {gameObjects.length} objects • Reusable entities for your game
                        </p>
                    </div>
                </div>
                <button onClick={addGameObject} style={styles.addButton}>
                    + New Game Object
                </button>
            </header>

            {/* Filters */}
            <div style={styles.filterBar}>
                <input
                    type="text"
                    placeholder="Search objects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={styles.searchInput}
                />
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={styles.filterSelect}
                >
                    {OBJECT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                            {type.icon} {type.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Object List */}
            <div style={styles.listContainer}>
                {filteredObjects.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>🎮</div>
                        <h3 style={styles.emptyTitle}>No Game Objects Yet</h3>
                        <p style={styles.emptyText}>
                            Create reusable entities like Ball, Paddle, or Enemy that you can use across scenes.
                        </p>
                        <button onClick={addGameObject} style={styles.addButton}>
                            + Create Your First Object
                        </button>
                    </div>
                ) : (
                    <div style={styles.objectGrid}>
                        {filteredObjects.map(obj => (
                            <div
                                key={obj.id}
                                style={styles.objectCard}
                                onClick={() => onOpenDetail(obj.id)}
                            >
                                {/* Preview */}
                                <div style={styles.objectPreview}>
                                    {obj.visualType === 'shape' ? (
                                        <div style={{
                                            width: obj.shape === 'circle' ? 60 : Math.min(60, obj.width / 2),
                                            height: obj.shape === 'circle' ? 60 : Math.min(40, obj.height / 2),
                                            background: obj.color || '#6366f1',
                                            borderRadius: obj.shape === 'circle' ? '50%' : '4px'
                                        }} />
                                    ) : (
                                        <span style={{ fontSize: '32px' }}>🖼️</span>
                                    )}
                                </div>

                                {/* Info */}
                                <div style={styles.objectInfo}>
                                    <div style={styles.objectName}>{obj.id}</div>
                                    <div style={styles.objectMeta}>
                                        <span>{getTypeIcon(obj.type)} {obj.type}</span>
                                        <span style={styles.varCount}>
                                            {Object.keys(obj.variables || {}).length} vars
                                        </span>
                                    </div>
                                </div>

                                {/* Delete button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteGameObject(obj.id)
                                    }}
                                    style={styles.deleteButton}
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                )}
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
    addButton: {
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    filterBar: {
        padding: '12px 24px',
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
    },
    searchInput: {
        flex: 1,
        padding: '10px 14px',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '13px'
    },
    filterSelect: {
        padding: '10px 14px',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '13px',
        minWidth: '150px'
    },
    listContainer: {
        flex: 1,
        padding: '24px',
        overflowY: 'auto'
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
        margin: '0 0 24px 0',
        maxWidth: '400px'
    },
    objectGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
    },
    objectCard: {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative'
    },
    objectPreview: {
        width: '64px',
        height: '64px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    objectInfo: {
        flex: 1
    },
    objectName: {
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '4px'
    },
    objectMeta: {
        fontSize: '12px',
        color: '#64748b',
        display: 'flex',
        gap: '12px'
    },
    varCount: {
        color: '#8b5cf6'
    },
    deleteButton: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: 'transparent',
        border: 'none',
        fontSize: '14px',
        cursor: 'pointer',
        opacity: 0.5,
        padding: '4px'
    }
}
