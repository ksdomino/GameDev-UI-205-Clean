/**
 * ActorList Component
 * 
 * Displays all actors loaded from /data/actors/*.json
 * Shows actor type, variables, and logic sheet status
 */
import React, { useState, useEffect } from 'react';
import { getActors, getLogicSheets } from '../services/api';

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

export function ActorList({ onSelectActor, selectedActorId, onOpenLogic }) {
    const [actors, setActors] = useState([]);
    const [logicSheets, setLogicSheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                <button onClick={loadData} style={styles.refreshButton} title="Refresh">↻</button>
            </div>

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
                                borderColor: isSelected ? typeColor : 'transparent',
                                backgroundColor: isSelected ? `${typeColor}20` : '#1e293b'
                            }}
                            onClick={() => onSelectActor?.(actor)}
                        >
                            <div style={styles.actorHeader}>
                                <span style={styles.actorIcon}>{typeIcon}</span>
                                <span style={styles.actorName}>{actor.id}</span>
                                <span style={{ ...styles.actorType, backgroundColor: typeColor }}>
                                    {actor.type}
                                </span>
                            </div>

                            {actor.description && (
                                <div style={styles.actorDescription}>{actor.description}</div>
                            )}

                            <div style={styles.actorMeta}>
                                <span style={styles.metaItem}>
                                    📊 {Object.keys(actor.variables || {}).length} vars
                                </span>
                                {logicSheet && (
                                    <span style={styles.metaItem}>
                                        🔗 {logicSheet.nodeCount} nodes
                                    </span>
                                )}
                                {actor.tags?.length > 0 && (
                                    <span style={styles.metaItem}>
                                        🏷️ {actor.tags.join(', ')}
                                    </span>
                                )}
                            </div>

                            {/* View Logic Button */}
                            {logicSheet && onOpenLogic && (
                                <div style={styles.actorActions}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenLogic(actor.id);
                                        }}
                                        style={styles.viewLogicButton}
                                    >
                                        🔗 View Logic
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


const styles = {
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
        padding: '8px'
    },
    actorCard: {
        padding: '12px',
        borderRadius: '6px',
        marginBottom: '8px',
        cursor: 'pointer',
        border: '2px solid transparent',
        transition: 'all 0.2s'
    },
    actorHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px'
    },
    actorIcon: {
        fontSize: '18px'
    },
    actorName: {
        flex: 1,
        fontWeight: '600',
        color: '#f1f5f9',
        fontSize: '14px'
    },
    actorType: {
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '500',
        color: '#fff',
        textTransform: 'uppercase'
    },
    actorDescription: {
        fontSize: '12px',
        color: '#94a3b8',
        marginBottom: '8px',
        lineHeight: '1.4'
    },
    actorMeta: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
    },
    metaItem: {
        fontSize: '11px',
        color: '#64748b'
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
    },
    actorActions: {
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid #334155'
    },
    viewLogicButton: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        border: 'none',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s'
    }
};

export default ActorList;

