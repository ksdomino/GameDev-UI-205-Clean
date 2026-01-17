/**
 * GameDataPanel Component
 * 
 * Main panel showing game data overview loaded from /data/
 * Displays manifest, actors, logic sheets, and validation status
 */
import React, { useState, useEffect } from 'react';
import { getGameData } from '../services/api';
import ActorList from './ActorList';
import NodeEditor from './NodeEditor';

export function GameDataPanel({ onSelectActor }) {
    const [gameData, setGameData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedActorId, setSelectedActorId] = useState(null);
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

    function handleSelectActor(actor) {
        setSelectedActorId(actor.id);
        onSelectActor?.(actor);
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
                <div style={styles.header}>
                    <h2 style={styles.title}>📊 Game Data</h2>
                </div>
                <div style={styles.loading}>
                    <div style={styles.spinner}></div>
                    Loading game data from /data/...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h2 style={styles.title}>📊 Game Data</h2>
                    <button onClick={loadGameData} style={styles.refreshButton}>↻ Refresh</button>
                </div>
                <div style={styles.error}>
                    <p>⚠️ {error}</p>
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>
                        Make sure /data/ files exist in Engine folder
                    </p>
                </div>
            </div>
        );
    }

    const summary = gameData?.summary || {};
    const manifest = gameData?.data?.manifest;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>📊 Game Data</h2>
                <button onClick={loadGameData} style={styles.refreshButton}>↻</button>
            </div>

            {/* Game Info */}
            {manifest && (
                <div style={styles.gameInfo}>
                    <h3 style={styles.gameName}>{manifest.gameName || 'Untitled Game'}</h3>
                    {manifest.description && (
                        <p style={styles.gameDescription}>{manifest.description}</p>
                    )}
                    <div style={styles.gameVersion}>v{manifest.version || '0.0.0'}</div>
                </div>
            )}

            {/* Summary Stats */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{summary.actorCount || 0}</div>
                    <div style={styles.statLabel}>Actors</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{summary.logicSheetCount || 0}</div>
                    <div style={styles.statLabel}>Logic Sheets</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{summary.sceneCount || 0}</div>
                    <div style={styles.statLabel}>Scenes</div>
                </div>
                <div style={{ ...styles.statCard, backgroundColor: summary.isValidated ? '#166534' : '#7f1d1d' }}>
                    <div style={styles.statValue}>{summary.isValidated ? '✓' : '✗'}</div>
                    <div style={styles.statLabel}>Validated</div>
                </div>
            </div>

            {/* Actor List with Logic Button */}
            <div style={styles.actorListContainer}>
                <ActorList
                    onSelectActor={handleSelectActor}
                    selectedActorId={selectedActorId}
                    onOpenLogic={openNodeEditor}
                />
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
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155'
    },
    title: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600'
    },
    refreshButton: {
        background: '#334155',
        border: 'none',
        color: '#f1f5f9',
        cursor: 'pointer',
        fontSize: '14px',
        padding: '6px 12px',
        borderRadius: '4px',
        transition: 'all 0.2s'
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        color: '#64748b',
        gap: '12px'
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
        fontSize: '14px'
    },
    gameInfo: {
        padding: '16px 20px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155'
    },
    gameName: {
        margin: '0 0 4px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#f1f5f9'
    },
    gameDescription: {
        margin: '0 0 8px 0',
        fontSize: '13px',
        color: '#94a3b8'
    },
    gameVersion: {
        fontSize: '11px',
        color: '#64748b',
        backgroundColor: '#0f172a',
        padding: '2px 8px',
        borderRadius: '4px',
        display: 'inline-block'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        padding: '12px 20px'
    },
    statCard: {
        backgroundColor: '#1e293b',
        padding: '12px 8px',
        borderRadius: '6px',
        textAlign: 'center'
    },
    statValue: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#f1f5f9'
    },
    statLabel: {
        fontSize: '10px',
        color: '#64748b',
        textTransform: 'uppercase',
        marginTop: '4px'
    },
    actorListContainer: {
        flex: 1,
        padding: '0 12px 12px',
        overflow: 'hidden'
    }
};

export default GameDataPanel;
