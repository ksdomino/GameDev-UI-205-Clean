/**
 * GameDataHub - Unified Game Data Management
 * 
 * Consolidates Game Objects, Actors, Waves, and Upgrades into a single tabbed interface.
 * This replaces the separate Game Objects and Game Data pages.
 * 
 * @context Engine/llms.txt
 */
import React, { useState } from 'react';
import GameDataPanel from './GameDataPanel';
import WaveEditor from './WaveEditor';
import UpgradePoolEditor from './UpgradePoolEditor';
import AIGenerateModal from './AIGenerateModal';
import { createActor, saveActor, saveLogicSheet } from '../services/api';

const PRESETS = [
    {
        id: 'ShieldPowerup',
        label: '🛡️ Shield Power-up',
        type: 'powerup',
        description: 'Temporary invincibility shield for the player.',
        data: {
            variables: {
                duration: { default: 5 },
                scale: { default: 1.2 }
            }
        },
        nodes: [
            { id: '1', type: 'event', name: 'On Touch', x: 100, y: 100 },
            { id: '2', type: 'action', name: 'Apply Buffer', x: 300, y: 100 }
        ]
    },
    {
        id: 'PatrolEnemy',
        label: '👹 Patrol Enemy',
        type: 'enemy',
        description: 'Moves back and forth between two points.',
        data: {
            variables: {
                speed: { default: 150 },
                distance: { default: 400 }
            }
        },
        nodes: [
            { id: '1', type: 'event', name: 'On Tick', x: 100, y: 100 },
            { id: '2', type: 'action', name: 'Move Loop', x: 300, y: 100 }
        ]
    },
    {
        id: 'HomingMissile',
        label: '🚀 Homing Missile',
        type: 'enemy',
        description: 'Tracks and follows the player accurately.',
        data: {
            variables: {
                turnRate: { default: 5 },
                acceleration: { default: 10 }
            }
        },
        nodes: []
    },
    {
        id: 'BossEnemy',
        label: '👹 Boss Enemy',
        type: 'enemy',
        description: 'Large health pool, multiple attack phases, and minions.',
        data: {
            variables: {
                hp: { default: 1000 },
                phase: { default: 1 },
                speed: { default: 50 }
            }
        },
        nodes: [
            { id: '1', type: 'event', name: 'On HP Low', x: 100, y: 100 },
            { id: '2', type: 'action', name: 'Change Phase', x: 300, y: 100 }
        ]
    },
    {
        id: 'HealthPickup',
        label: '❤️ Health Pickup',
        type: 'powerup',
        description: 'Restores a portion of the player health.',
        data: {
            variables: {
                healAmount: { default: 20 }
            }
        },
        nodes: [
            { id: '1', type: 'event', name: 'On Touch', x: 100, y: 100 },
            { id: '2', type: 'action', name: 'Heal Player', x: 300, y: 100 }
        ]
    },
    {
        id: 'SpeedBoost',
        label: '⚡ Speed Boost',
        type: 'powerup',
        description: 'Increases movement speed for a limited time.',
        data: {
            variables: {
                multiplier: { default: 2 },
                duration: { default: 3 }
            }
        },
        nodes: []
    },
    {
        id: 'Coin',
        label: '🪙 Gold Coin',
        type: 'item',
        description: 'Standard currency item to collect.',
        data: {
            variables: {
                value: { default: 10 }
            }
        },
        nodes: [
            { id: '1', type: 'event', name: 'On Collect', x: 100, y: 100 },
            { id: '2', type: 'action', name: 'Add Currency', x: 300, y: 100 }
        ]
    }
];

const TABS = [
    { id: 'actors', label: '👾 Actors' },
    { id: 'presets', label: '📚 Presets' },
    { id: 'waves', label: '🌊 Waves' },
    { id: 'upgrades', label: '⬆️ Upgrades' }
];

export default function GameDataHub({ project, updateProject, onBack, initialActorId }) {
    const [activeTab, setActiveTab] = useState(initialActorId ? 'actors' : 'actors');
    const [showAIModal, setShowAIModal] = useState(false);
    const [importing, setImporting] = useState(null);

    const handleUsePreset = async (preset) => {
        setImporting(preset.id);
        try {
            await createActor(preset.id, preset.type);
            await saveActor(preset.id, preset.data);
            if (preset.nodes?.length) {
                await saveLogicSheet(preset.id, { nodes: preset.nodes, connections: [] });
            }
            alert(`Preset "${preset.label}" added to actors!`);
            setActiveTab('actors');
        } catch (err) {
            console.error(err);
            alert('Failed to import preset: ' + err.message);
        } finally {
            setImporting(null);
        }
    };

    return (
        <div style={styles.container}>
            {/* Compact Header with Home + Tabs */}
            <header style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {onBack && (
                        <button onClick={onBack} style={styles.backButton}>
                            ← Back to Home 🏠
                        </button>
                    )}
                    <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#f1f5f9', margin: 0, paddingLeft: '8px' }}>
                        GAME DATA
                    </h2>
                </div>

                <nav style={styles.tabBar}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                ...styles.tab,
                                ...(activeTab === tab.id ? styles.tabActive : {})
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </header>

            {/* Tab Content */}
            <main style={styles.content}>
                {activeTab === 'actors' && (
                    <GameDataPanel initialActorId={initialActorId} />
                )}
                {activeTab === 'presets' && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
                        <h3 style={{ color: '#f1f5f9' }}>Actor Presets Library</h3>
                        <p>High-quality templates to kickstart your game development.</p>

                        <div style={{
                            marginTop: '32px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '20px',
                            maxWidth: '1000px',
                            margin: '32px auto'
                        }}>
                            {PRESETS.map(preset => (
                                <div key={preset.id} style={{
                                    padding: '24px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    textAlign: 'left',
                                    transition: 'transform 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ fontSize: '32px' }}>{preset.label.split(' ')[0]}</div>
                                        <div style={{ fontSize: '10px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                            {preset.type}
                                        </div>
                                    </div>
                                    <h4 style={{ margin: 0, color: '#fff' }}>{preset.label.split(' ').slice(1).join(' ')}</h4>
                                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, minHeight: '36px' }}>{preset.description}</p>
                                    <button
                                        onClick={() => handleUsePreset(preset)}
                                        disabled={importing === preset.id}
                                        style={{
                                            padding: '10px',
                                            background: importing === preset.id ? '#1e293b' : 'rgba(99, 102, 241, 0.2)',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            borderRadius: '8px',
                                            color: '#a5b4fc',
                                            fontWeight: '600',
                                            cursor: importing === preset.id ? 'wait' : 'pointer',
                                            marginTop: '8px'
                                        }}
                                    >
                                        {importing === preset.id ? '⌛ Importing...' : '✨ Use This Template'}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '30px', marginTop: '20px' }}>
                            <p style={{ fontSize: '12px', marginBottom: '16px' }}>Need something unique?</p>
                            <button
                                onClick={() => setShowAIModal(true)}
                                style={{
                                    padding: '12px 24px',
                                    background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)'
                                }}
                            >
                                ✨ Generate New Preset with AI
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'waves' && (
                    <WaveEditor
                        project={project}
                        updateProject={updateProject}
                        embedded={true}
                    />
                )}
                {activeTab === 'upgrades' && (
                    <UpgradePoolEditor
                        project={project}
                        updateProject={updateProject}
                        embedded={true}
                    />
                )}
            </main>

            {showAIModal && (
                <AIGenerateModal
                    project={project}
                    scene={{ name: 'Game Presets' }}
                    onClose={() => setShowAIModal(false)}
                    onGenerate={(data) => {
                        console.log('Generated Preset:', data);
                        setShowAIModal(false);
                    }}
                />
            )}
        </div>
    );
}

const styles = {
    container: {
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    header: {
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0
    },
    backButton: {
        padding: '8px 14px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        color: '#94a3b8',
        fontSize: '13px',
        cursor: 'pointer'
    },
    tabBar: {
        display: 'flex',
        gap: '6px',
        flex: 1
    },
    tab: {
        padding: '8px 16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '8px',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        transition: 'all 0.2s'
    },
    tabActive: {
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.5)',
        color: '#f1f5f9'
    },
    content: {
        flex: 1,
        overflow: 'auto'
    }
};
