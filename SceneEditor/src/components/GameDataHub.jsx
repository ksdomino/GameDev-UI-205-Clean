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
    { id: 'actors', label: '👾 Actors', description: 'Entity definitions & logic' },
    { id: 'waves', label: '🌊 Waves', description: 'Enemy spawn patterns' },
    { id: 'upgrades', label: '⬆️ Upgrades', description: 'Rogue-lite upgrades' }
];

export default function GameDataHub({ project, updateProject, onBack }) {
    const [activeTab, setActiveTab] = useState('actors');

    return (
        <div style={styles.container}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    {onBack && (
                        <button onClick={onBack} style={styles.backButton}>
                            🏠 Home
                        </button>
                    )}
                    <div style={styles.titleArea}>
                        <h1 style={styles.title}>📊 Game Data</h1>
                        <p style={styles.subtitle}>Manage actors, waves, and upgrades</p>
                    </div>
                </div>
            </header>

            {/* Tab Bar */}
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
                        <span style={styles.tabLabel}>{tab.label}</span>
                        <span style={styles.tabDescription}>{tab.description}</span>
                    </button>
                ))}
            </nav>

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
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
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
    titleArea: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
    },
    title: {
        margin: 0,
        fontSize: '20px',
        fontWeight: '700',
        color: '#f1f5f9'
    },
    subtitle: {
        margin: 0,
        fontSize: '12px',
        color: '#64748b'
    },
    tabBar: {
        display: 'flex',
        gap: '8px',
        padding: '0 24px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0
    },
    tab: {
        padding: '12px 20px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        color: '#94a3b8',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '4px',
        transition: 'all 0.2s'
    },
    tabActive: {
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        color: '#f1f5f9'
    },
    tabLabel: {
        fontSize: '14px',
        fontWeight: '600'
    },
    tabDescription: {
        fontSize: '11px',
        opacity: 0.7
    },
    content: {
        flex: 1,
        overflow: 'auto'
    }
};
