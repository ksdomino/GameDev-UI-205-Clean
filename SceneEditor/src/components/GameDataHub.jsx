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

const TABS = [
    { id: 'actors', label: '👾 Actors' },
    { id: 'waves', label: '🌊 Waves' },
    { id: 'upgrades', label: '⬆️ Upgrades' }
];

export default function GameDataHub({ project, updateProject, onBack }) {
    const [activeTab, setActiveTab] = useState('actors');

    return (
        <div style={styles.container}>
            {/* Compact Header with Home + Tabs */}
            <header style={styles.header}>
                {onBack && (
                    <button onClick={onBack} style={styles.backButton}>
                        ← Back to Home 🏠
                    </button>
                )}
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
                    <GameDataPanel />
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
