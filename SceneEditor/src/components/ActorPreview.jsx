import React, { useState, useEffect, useRef } from 'react';

/**
 * ActorPreview - Simplified mobile view for a single actor
 */
export default function ActorPreview({ actor, zoom = 1, onZoomIn, onZoomOut }) {
    const containerRef = useRef(null);
    const scale = 0.25 * zoom;
    const canvasWidth = 1080 * scale;
    const canvasHeight = 1920 * scale;

    if (!actor) {
        return (
            <div style={styles.empty}>
                <div style={{ fontSize: '48px', opacity: 0.2, marginBottom: '16px' }}>📱</div>
                Select an actor to see preview
            </div>
        );
    }

    // Logic Icon mapping (simplified for preview)
    const ICON_MAPPING = {
        ball: '⚪',
        paddle: '🏓',
        powerup: '⭐',
        enemy: '👾',
        ui_button: '🔘',
        generic: '📦'
    };

    return (
        <div style={styles.container}>
            <div style={styles.previewContainer}>
                <div style={{
                    width: `${canvasWidth}px`,
                    height: `${canvasHeight}px`,
                    background: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)',
                    borderRadius: '12px',
                    border: '2px solid #444',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    transition: 'all 0.3s ease'
                }}>
                    {/* Grid */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                        backgroundSize: `${27 * zoom}px ${27 * zoom}px`
                    }} />

                    {/* Actor representation */}
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <div style={{
                            fontSize: `${48 * zoom}px`,
                            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))'
                        }}>
                            {ICON_MAPPING[actor.type] || '📦'}
                        </div>
                        <div style={{
                            color: '#fff',
                            fontSize: `${12 * zoom}px`,
                            fontWeight: '600',
                            textAlign: 'center',
                            textShadow: '0 2px 4px rgba(0,0,0,1)'
                        }}>
                            {actor.id}
                        </div>
                    </div>
                </div>
            </div>

            {/* Zoom Controls */}
            <div style={styles.controls}>
                <button onClick={onZoomOut} style={styles.controlBtn}>➖</button>
                <span style={{ fontSize: '11px', color: '#94a3b8', width: '40px', textAlign: 'center' }}>
                    {Math.round(zoom * 100)}%
                </span>
                <button onClick={onZoomIn} style={styles.controlBtn}>➕</button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(0,0,0,0.2)',
        height: '100%'
    },
    previewContainer: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
    },
    empty: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        fontSize: '14px'
    },
    controls: {
        marginTop: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(0,0,0,0.4)',
        padding: '6px 12px',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.05)'
    },
    controlBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        padding: '4px',
        opacity: 0.7,
        color: '#fff'
    }
};
