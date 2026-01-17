import { useState } from 'react'
import { createDefaultScene, generateSceneName } from '../data/defaultProject'

/**
 * LevelSelector - Grid of level cards for navigation
 */
export default function LevelSelector({ project, updateProject, onBack, onEditLevel }) {
    const [showAddLevel, setShowAddLevel] = useState(false)
    const [newLevelName, setNewLevelName] = useState('')

    const levels = project.levels || []

    // Add a new level with auto-created first scene
    const addLevel = () => {
        if (!newLevelName.trim()) return

        const levelNumber = levels.length
        const firstSceneName = generateSceneName(levelNumber, 1)

        // Create the new level
        const newLevel = {
            id: `level_${levelNumber}`,
            name: newLevelName.trim(),
            number: levelNumber,
            description: '',
            sceneNames: [firstSceneName]
        }

        // Create the first scene for this level
        const newScene = createDefaultScene(firstSceneName, false)

        updateProject({
            levels: [...levels, newLevel],
            scenes: [...(project.scenes || []), newScene]
        })

        setNewLevelName('')
        setShowAddLevel(false)
    }

    // Delete a level
    const deleteLevel = (levelId) => {
        if (!confirm('Delete this level? Scenes inside will remain in the project.')) return

        updateProject({
            levels: levels.filter(l => l.id !== levelId)
        })
    }

    return (
        <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(180deg, #0c0c1d 0%, #1a1a2e 100%)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <header style={{
                padding: '12px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={onBack} style={styles.backButton}>🏠 Home</button>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>🎮 Levels</h1>
                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                            {levels.length} levels in {project.name}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowAddLevel(true)}
                    style={styles.addButton}
                >
                    + Add Level
                </button>
            </header>

            {/* Level Grid */}
            <div style={{
                flex: 1,
                padding: '20px',
                overflow: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
                alignContent: 'start'
            }}>
                {levels.map((level, index) => (
                    <div
                        key={level.id}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                        }}
                        onClick={() => onEditLevel(index)}
                    >
                        {/* Level Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: level.number === 0
                                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                                fontWeight: '700',
                                color: '#fff'
                            }}>
                                {level.number}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '16px', fontWeight: '600' }}>{level.name}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    {level.sceneNames?.length || 0} scenes
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {level.description && (
                            <p style={{
                                fontSize: '12px',
                                color: '#94a3b8',
                                margin: 0,
                                lineHeight: 1.4
                            }}>
                                {level.description}
                            </p>
                        )}

                        {/* Scene list */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            marginTop: 'auto'
                        }}>
                            {level.sceneNames?.map(sceneName => (
                                <span
                                    key={sceneName}
                                    style={{
                                        padding: '4px 8px',
                                        background: 'rgba(99, 102, 241, 0.2)',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        color: '#a5b4fc'
                                    }}
                                >
                                    {sceneName}
                                </span>
                            ))}
                        </div>

                        {/* Actions */}
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: '8px',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            paddingTop: '12px'
                        }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); onEditLevel(index) }}
                                style={styles.editButton}
                            >
                                ✏️ Edit Scenes
                            </button>
                            {level.number > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteLevel(level.id) }}
                                    style={styles.deleteButton}
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {/* Empty state */}
                {levels.length === 0 && (
                    <div style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#64748b'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🎮</div>
                        <p style={{ fontSize: '14px' }}>No levels yet. Click "Add Level" to get started!</p>
                    </div>
                )}
            </div>

            {/* Add Level Modal */}
            {showAddLevel && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#1a1a2e',
                        borderRadius: '12px',
                        padding: '24px',
                        width: '400px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>Add New Level</h2>

                        <input
                            type="text"
                            value={newLevelName}
                            onChange={(e) => setNewLevelName(e.target.value)}
                            placeholder="Level name (e.g., Medium, Hard, Boss)"
                            style={styles.input}
                            autoFocus
                        />

                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <button onClick={() => setShowAddLevel(false)} style={styles.cancelButton}>
                                Cancel
                            </button>
                            <button onClick={addLevel} style={styles.confirmButton}>
                                Add Level
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    backButton: {
        padding: '8px 14px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        color: '#94a3b8',
        fontSize: '12px',
        cursor: 'pointer'
    },
    addButton: {
        padding: '8px 16px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    editButton: {
        flex: 1,
        padding: '8px 12px',
        background: 'rgba(99, 102, 241, 0.2)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '6px',
        color: '#a5b4fc',
        fontSize: '11px',
        cursor: 'pointer'
    },
    deleteButton: {
        padding: '8px 12px',
        background: 'rgba(239, 68, 68, 0.2)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '6px',
        color: '#fca5a5',
        fontSize: '11px',
        cursor: 'pointer'
    },
    input: {
        width: '100%',
        padding: '12px',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        boxSizing: 'border-box'
    },
    cancelButton: {
        flex: 1,
        padding: '10px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        color: '#94a3b8',
        fontSize: '13px',
        cursor: 'pointer'
    },
    confirmButton: {
        flex: 1,
        padding: '10px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer'
    }
}
