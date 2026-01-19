/**
 * ActorList Component
 * 
 * Displays all actors loaded from /data/actors/*.json
 * Shows actor type, variables, and logic sheet status
 */
import React, { useState, useEffect } from 'react';
import { getActors, getLogicSheets } from '../services/api';
import AIGenerateModal from './AIGenerateModal';

// Actor type colors (matching node type colors)
const ACTOR_TYPE_COLORS = {
    ball: '#ef4444',      // Red
    paddle: '#22c55e',    // Green
    powerup: '#eab308',   // Yellow
    enemy: '#f97316',     // Orange
    ui_button: '#3b82f6', // Blue
    generic: '#8b5cf6'    // Purple
};

const ACTOR_TYPE_ICONS = {
    ball: '⚪',
    paddle: '🏓',
    powerup: '⭐',
    enemy: '👾',
    ui_button: '🔘',
    generic: '📦'
};

const ACTOR_TYPES = ['generic', 'ball', 'paddle', 'powerup', 'enemy', 'ui_button'];

export function ActorList({ onSelectActor, selectedActorId, onOpenLogic }) {
    const [actors, setActors] = useState([]);
    const [logicSheets, setLogicSheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newActorId, setNewActorId] = useState('');
    const [newActorType, setNewActorType] = useState('generic');
    const [createError, setCreateError] = useState(null);
    const [showAIModal, setShowAIModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        setError(null);

        try {
            const [actorsResult, logicResult] = await Promise.all([
                getActors(),
                getLogicSheets()
            ]);

            if (actorsResult.success) {
                setActors(actorsResult.actors || []);
            } else {
                setError(actorsResult.error || 'Failed to load actors');
            }

            if (logicResult.success) {
                setLogicSheets(logicResult.logicSheets || []);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateActor() {
        if (!newActorId.trim()) {
            setCreateError('Actor ID is required');
            return;
        }

        try {
            const { createActor } = await import('../services/api');
            const result = await createActor(newActorId.trim(), newActorType);
            if (result.success) {
                setIsCreating(false);
                setNewActorId('');
                setCreateError(null);
                loadData();
            } else {
                setCreateError(result.error);
            }
        } catch (err) {
            setCreateError(err.message);
        }
    }

    function getLogicSheetForActor(actorId) {
        return logicSheets.find(ls => ls.actorId === actorId);
    }

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h3 style={styles.title}>🎭 Actors</h3>
                </div>
                <div style={styles.loading}>Loading actors...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h3 style={styles.title}>🎭 Actors</h3>
                    <button onClick={loadData} style={styles.refreshButton}>↻</button>
                </div>
                <div style={styles.error}>{error}</div>
            </div>
        );
    }

    if (actors.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h3 style={styles.title}>🎭 Actors</h3>
                    <button onClick={loadData} style={styles.refreshButton}>↻</button>
                </div>
                <div style={styles.empty}>
                    No actors found in /data/actors/
                    <br />
                    <small>Create actor files to see them here</small>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={styles.title}>🎭 Actors ({actors.length})</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setShowAIModal(true)}
                        style={{
                            ...styles.addButton,
                            background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
                            border: 'none'
                        }}
                        title="Generate Actor with AI"
                    >
                        ✨ AI
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        style={styles.addButton}
                        title="Create New Actor"
                    >
                        + Create
                    </button>
                    <button onClick={loadData} style={styles.refreshButton} title="Refresh">↻</button>
                </div>
            </div>

            {isCreating && (
                <div style={styles.createForm}>
                    <input
                        type="text"
                        placeholder="Actor ID (e.g. LaserTrap)"
                        value={newActorId}
                        onChange={(e) => setNewActorId(e.target.value)}
                        style={styles.formInput}
                        autoFocus
                    />
                    <select
                        value={newActorType}
                        onChange={(e) => setNewActorType(e.target.value)}
                        style={styles.formSelect}
                    >
                        {ACTOR_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    <div style={styles.formActions}>
                        <button onClick={handleCreateActor} style={styles.saveButton}>Create</button>
                        <button onClick={() => setIsCreating(false)} style={styles.cancelButton}>Cancel</button>
                    </div>
                    {createError && <div style={styles.formError}>{createError}</div>}
                </div>
            )}

            <div style={styles.list}>
                {actors.map(actor => {
                    const logicSheet = getLogicSheetForActor(actor.id);
                    const isSelected = selectedActorId === actor.id;
                    const typeColor = ACTOR_TYPE_COLORS[actor.type] || ACTOR_TYPE_COLORS.generic;
                    const typeIcon = ACTOR_TYPE_ICONS[actor.type] || ACTOR_TYPE_ICONS.generic;

                    return (
                        <div
                            key={actor.id}
                            style={{
                                ...styles.actorCard,
                                borderColor: isSelected ? typeColor : 'rgba(255,255,255,0.05)',
                                backgroundColor: isSelected ? `${typeColor}20` : 'rgba(255,255,255,0.02)',
                                flex: '0 0 auto',
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 14px'
                            }}
                            onClick={() => onSelectActor?.(actor)}
                            title={actor.description || actor.id}
                        >
                            <div style={{ fontSize: '20px' }}>{typeIcon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '13px' }}>{actor.id}</span>
                                    <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: typeColor, color: '#fff', textTransform: 'uppercase' }}>
                                        {actor.type}
                                    </span>
                                </div>
                                {actor.description && (
                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {actor.description}
                                    </div>
                                )}
                            </div>
                            {logicSheet && (
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    🔗 {logicSheet.nodeCount}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {showAIModal && (
                <AIGenerateModal
                    project={{ canvas: { width: 1080, height: 1920, orientation: 'portrait' } }}
                    scene={{ name: 'Global Actors' }}
                    onClose={() => setShowAIModal(false)}
                    onGenerate={(nodes) => {
                        console.log('Generated AI nodes:', nodes);
                        setShowAIModal(false);
                    }}
                />
            )}
        </div>
    );
}


const styles = {
    // ...existing container styles...
    createForm: {
        padding: '12px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    formInput: {
        width: '100%',
        padding: '8px',
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '4px',
        color: '#f1f5f9',
        fontSize: '13px'
    },
    formSelect: {
        width: '100%',
        padding: '8px',
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '4px',
        color: '#f1f5f9',
        fontSize: '13px',
        textTransform: 'capitalize'
    },
    formActions: {
        display: 'flex',
        gap: '8px'
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#3b82f6',
        color: '#fff',
        border: 'none',
        padding: '8px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600'
    },
    cancelButton: {
        flex: 1,
        backgroundColor: 'transparent',
        color: '#94a3b8',
        border: '1px solid #334155',
        padding: '8px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '13px'
    },
    formError: {
        color: '#ef4444',
        fontSize: '11px',
        marginTop: '4px'
    },
    addButton: {
        backgroundColor: '#3b82f6',
        color: '#fff',
        border: 'none',
        padding: '4px 10px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '600',
        transition: 'all 0.2s'
    },
    container: {
        backgroundColor: '#0f172a',
        borderRadius: '8px',
        border: '1px solid #334155',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155'
    },
    title: {
        margin: 0,
        fontSize: '14px',
        fontWeight: '600',
        color: '#f1f5f9'
    },
    refreshButton: {
        background: 'none',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '16px',
        padding: '4px 8px',
        borderRadius: '4px',
        transition: 'all 0.2s'
    },
    list: {
        flex: 1,
        overflow: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignContent: 'start'
    },
    actorCard: {
        padding: '10px',
        borderRadius: '8px',
        cursor: 'pointer',
        border: '2px solid transparent',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    actorHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    actorIcon: {
        fontSize: '16px'
    },
    actorName: {
        flex: 1,
        fontWeight: '700',
        color: '#f1f5f9',
        fontSize: '13px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    actorType: {
        padding: '1px 6px',
        borderRadius: '4px',
        fontSize: '9px',
        fontWeight: '700',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: '0.02em'
    },
    actorMeta: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'auto'
    },
    metaItem: {
        fontSize: '10px',
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        gap: '2px'
    },
    loading: {
        padding: '20px',
        textAlign: 'center',
        color: '#64748b'
    },
    error: {
        padding: '20px',
        textAlign: 'center',
        color: '#ef4444',
        fontSize: '13px'
    },
    empty: {
        padding: '30px 20px',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '13px',
        lineHeight: '1.6'
    }
};

export default ActorList;

