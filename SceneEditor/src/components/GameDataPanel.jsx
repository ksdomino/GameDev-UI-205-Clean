/**
 * GameDataPanel Component
 * 
 * Main panel showing game data overview loaded from /data/
 * Displays manifest, actors, logic sheets, and validation status
 */
import React, { useState, useEffect } from 'react';
import { getGameData, getActor } from '../services/api';
import ActorList from './ActorList';
import NodeEditor from './NodeEditor';
import VariableEditor from './VariableEditor';

export function GameDataPanel({ onSelectActor }) {
    const [gameData, setGameData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedActorId, setSelectedActorId] = useState(null);
    const [selectedActorData, setSelectedActorData] = useState(null);
    const [showNodeEditor, setShowNodeEditor] = useState(false);
    const [nodeEditorActorId, setNodeEditorActorId] = useState(null);

    useEffect(() => {
        loadGameData();
    }, []);

    async function loadGameData() {
        setLoading(true);
        setError(null);

        try {
            const result = await getGameData();
            if (result.success) {
                setGameData(result);
            } else {
                setError(result.error || 'Failed to load game data');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSelectActor(actor) {
        setSelectedActorId(actor.id);
        onSelectActor?.(actor);
        // Load actor variables data
        const result = await getActor(actor.id);
        if (result.success) {
            setSelectedActorData(result.actor);
        } else {
            // Try loading .variables.json file directly
            try {
                const res = await fetch(`http://localhost:5176/api/actors/${actor.id}`);
                const data = await res.json();
                if (data.success) {
                    setSelectedActorData(data.actor);
                }
            } catch (e) {
                setSelectedActorData(null);
            }
        }
    }

    function handleVariableChange(key, value) {
        if (!selectedActorData) return;
        setSelectedActorData(prev => ({
            ...prev,
            variables: {
                ...prev.variables,
                [key]: {
                    ...prev.variables[key],
                    default: value
                }
            }
        }));
    }

    function openNodeEditor(actorId) {
        setNodeEditorActorId(actorId);
        setShowNodeEditor(true);
    }

    function closeNodeEditor() {
        setShowNodeEditor(false);
        setNodeEditorActorId(null);
    }

    // If NodeEditor is open, show it instead
    if (showNodeEditor && nodeEditorActorId) {
        return (
            <div style={{ height: '100%' }}>
                <NodeEditor actorId={nodeEditorActorId} onClose={closeNodeEditor} />
            </div>
        );
    }

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>
                    <div style={styles.spinner}></div>
                    Loading actors...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.error}>
                    <p>⚠️ {error}</p>
                    <button onClick={loadGameData} style={styles.refreshButton}>↻ Retry</button>
                </div>
            </div>
        );
    }



    return (
        <div style={styles.container}>
            {/* Split View: Actor List + Variable Editor */}
            <div style={styles.splitView}>
                {/* Actor List */}
                <div style={styles.actorListContainer}>
                    <ActorList
                        onSelectActor={handleSelectActor}
                        selectedActorId={selectedActorId}
                        onOpenLogic={openNodeEditor}
                    />
                </div>

                {/* Variable Editor Panel */}
                {selectedActorId && (
                    <div style={styles.variablePanel}>
                        <div style={styles.variableHeader}>
                            <h3 style={styles.variableTitle}>📝 {selectedActorId} Variables</h3>
                            <button
                                onClick={() => { setSelectedActorId(null); setSelectedActorData(null); }}
                                style={styles.closeButton}
                            >×</button>
                        </div>
                        <div style={styles.variableContent}>
                            {selectedActorData?.variables ? (
                                <VariableEditor
                                    variables={selectedActorData.variables}
                                    onChange={handleVariableChange}
                                />
                            ) : (
                                <div style={{ padding: '20px', color: '#64748b', textAlign: 'center' }}>
                                    No variables defined for this actor.<br />
                                    <small>Create a .variables.json file</small>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        backgroundColor: '#0f172a',
        color: '#f1f5f9',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    refreshButton: {
        background: '#334155',
        border: 'none',
        color: '#f1f5f9',
        cursor: 'pointer',
        fontSize: '14px',
        padding: '6px 12px',
        borderRadius: '4px',
        transition: 'all 0.2s',
        marginTop: '10px'
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        color: '#64748b',
        gap: '12px',
        flex: 1
    },
    spinner: {
        width: '24px',
        height: '24px',
        border: '2px solid #334155',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    error: {
        padding: '30px 20px',
        textAlign: 'center',
        color: '#ef4444',
        fontSize: '14px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    },
    splitView: {
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
    },
    actorListContainer: {
        flex: 1,
        padding: '12px',
        overflow: 'hidden',
        minWidth: '280px'
    },
    variablePanel: {
        width: '320px',
        backgroundColor: '#1e293b',
        borderLeft: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    variableHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #334155'
    },
    variableTitle: {
        margin: 0,
        fontSize: '14px',
        fontWeight: '600',
        color: '#f1f5f9'
    },
    closeButton: {
        background: 'none',
        border: 'none',
        color: '#94a3b8',
        fontSize: '20px',
        cursor: 'pointer'
    },
    variableContent: {
        flex: 1,
        overflow: 'auto',
        padding: '12px'
    }
};

export default GameDataPanel;
