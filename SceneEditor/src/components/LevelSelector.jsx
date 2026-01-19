import { useState, useEffect } from 'react'
import { createDefaultScene, generateSceneName } from '../data/defaultProject'

/**
 * LevelSelector - Grid of level cards for navigation
 */
export default function LevelSelector({ project, updateProject, onBack, onEditLevel, onOpenScene, onPushUndo }) {
    const [showAddLevel, setShowAddLevel] = useState(false)
    const [newLevelName, setNewLevelName] = useState('')
    const [deleteConfirm, setDeleteConfirm] = useState(null) // { levelId, levelName } or null
    const [selectedLevel, setSelectedLevel] = useState(null) // Selected level for keyboard deletion

    const levels = project.levels || []

    // Keyboard event listener for Delete/Backspace
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only handle Delete/Backspace when a level is selected and no modal is open
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLevel && !deleteConfirm && !showAddLevel) {
                e.preventDefault()
                const level = levels.find(l => l.id === selectedLevel)
                if (level) {
                    setDeleteConfirm({ levelId: level.id, levelName: level.name, levelNumber: level.number })
                }
            }
            // Escape to deselect
            if (e.key === 'Escape') {
                setSelectedLevel(null)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedLevel, deleteConfirm, showAddLevel, levels])

    // Get scene index by name
    const getSceneIndex = (sceneName) => {
        return project.scenes?.findIndex(s => s.name === sceneName) ?? -1
    }

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

    // Handle delete button click - show confirmation modal
    const handleDeleteClick = (e, level) => {
        e.stopPropagation()
        e.preventDefault()
        setDeleteConfirm({ levelId: level.id, levelName: level.name, levelNumber: level.number })
    }

    // Confirm delete
    const handleDeleteConfirm = () => {
        if (!deleteConfirm) return

        // Store for undo before deleting
        const levelToDelete = levels.find(l => l.id === deleteConfirm.levelId)
        if (levelToDelete && onPushUndo) {
            onPushUndo('level', levelToDelete)
        }

        updateProject({
            levels: levels.filter(l => l.id !== deleteConfirm.levelId)
        })
        setDeleteConfirm(null)
    }

    // Cancel delete
    const handleDeleteCancel = () => {
        setDeleteConfirm(null)
    }

    // Add a scene to a specific level
    const addSceneToLevel = (levelIndex) => {
        const level = levels[levelIndex]
        const nextNum = (level.sceneNames?.length || 0) + 1
        const sceneName = generateSceneName(level.number, nextNum)
        const newScene = createDefaultScene(sceneName, false)

        const updatedLevels = levels.map((lvl, i) =>
            i === levelIndex
                ? { ...lvl, sceneNames: [...(lvl.sceneNames || []), sceneName] }
                : lvl
        )

        updateProject({
            levels: updatedLevels,
            scenes: [...(project.scenes || []), newScene]
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
                    <button onClick={onBack} style={styles.backButton}>← Back to Home 🏠</button>
                    <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Levels - Select or Add a Level</h1>
                </div>
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
                        onClick={() => setSelectedLevel(level.id === selectedLevel ? null : level.id)}
                        style={{
                            background: selectedLevel === level.id
                                ? 'rgba(99, 102, 241, 0.15)'
                                : 'rgba(255,255,255,0.03)',
                            border: selectedLevel === level.id
                                ? '2px solid rgba(99, 102, 241, 0.6)'
                                : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                    >
                        {/* Level Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                background: level.number === 0
                                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                fontWeight: '700',
                                color: '#fff'
                            }}>
                                {level.number}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: '600' }}>
                                    {level.name} (Level {level.number})
                                </div>
                            </div>
                            <button
                                onClick={(e) => handleDeleteClick(e, level)}
                                style={styles.deleteButton}
                                title="Delete level"
                            >
                                <div style={styles.deleteBox}>✕</div>
                            </button>
                        </div>

                        {/* Scenes Table */}
                        <div style={{
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '8px',
                            overflow: 'hidden'
                        }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {level.sceneNames?.map(sceneName => {
                                        const sceneIndex = getSceneIndex(sceneName)
                                        return (
                                            <tr key={sceneName} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{
                                                    padding: '8px 12px',
                                                    fontSize: '12px',
                                                    color: '#a5b4fc'
                                                }}>
                                                    {sceneName}
                                                </td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => sceneIndex >= 0 && onOpenScene(sceneIndex)}
                                                        style={styles.editSceneButton}
                                                        disabled={sceneIndex < 0}
                                                    >
                                                        Edit Scene
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {(!level.sceneNames || level.sceneNames.length === 0) && (
                                        <tr>
                                            <td colSpan={2} style={{
                                                padding: '12px',
                                                fontSize: '11px',
                                                color: '#64748b',
                                                textAlign: 'center'
                                            }}>
                                                No scenes yet
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Add Scene Button */}
                        <button
                            onClick={() => addSceneToLevel(index)}
                            style={styles.addSceneButton}
                        >
                            + Add Scene
                        </button>

                        {/* Edit List as Nodes Button */}
                        <button
                            onClick={() => onEditLevel(index)}
                            style={styles.editNodesButton}
                        >
                            Edit List as Nodes
                        </button>
                    </div>
                ))}

                {/* Add Level Card */}
                <div
                    onClick={() => setShowAddLevel(true)}
                    style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '2px dashed rgba(255,255,255,0.15)',
                        borderRadius: '12px',
                        padding: '40px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        minHeight: '150px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'
                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                    }}
                >
                    <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: '600',
                        color: '#fff'
                    }}>
                        +
                    </div>
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                        Add Level
                    </span>
                </div>
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

            {/* Delete Level Confirmation Modal */}
            {deleteConfirm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                    onClick={handleDeleteCancel}
                >
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #1e1e3f 0%, #2a2a4a 100%)',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '400px',
                            width: '90%',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
                            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#fff' }}>
                                Delete Level?
                            </h3>
                            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>
                                Are you sure you want to delete <strong style={{ color: '#fca5a5' }}>"{deleteConfirm.levelName}" (Level {deleteConfirm.levelNumber})</strong>?
                                <br />
                                <span style={{ color: '#94a3b8' }}>Scenes inside will remain in the project.</span>
                                <br />
                                <span style={{ color: '#ef4444' }}>This cannot be undone.</span>
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={handleDeleteCancel}
                                style={{
                                    padding: '12px 24px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                style={{
                                    padding: '12px 24px',
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
                                }}
                            >
                                Delete Level
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
    editNodesButton: {
        width: '100%',
        padding: '10px 12px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        border: 'none',
        borderRadius: '6px',
        color: '#fff',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    editSceneButton: {
        padding: '4px 10px',
        background: 'rgba(99, 102, 241, 0.3)',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        borderRadius: '4px',
        color: '#a5b4fc',
        fontSize: '10px',
        cursor: 'pointer'
    },
    addSceneButton: {
        width: '100%',
        padding: '8px 12px',
        background: 'rgba(16, 185, 129, 0.15)',
        border: '1px dashed rgba(16, 185, 129, 0.4)',
        borderRadius: '6px',
        color: '#6ee7b7',
        fontSize: '11px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    deleteButton: {
        padding: '0',
        background: 'none',
        border: 'none',
        cursor: 'pointer'
    },
    deleteBox: {
        width: '24px',
        height: '24px',
        background: '#ef4444',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '12px',
        transition: 'all 0.2s'
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
