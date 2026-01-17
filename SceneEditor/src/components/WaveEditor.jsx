import { useState } from 'react';

/**
 * WaveEditor - Visual editor for designing enemy spawn waves
 * 
 * Allows designers to create and configure wave sequences for rogue-lite games.
 * Integrates with WaveSpawner.js in the Engine.
 */
export default function WaveEditor({ project, updateProject, onBack, embedded = false }) {
    const [waves, setWaves] = useState(project?.waves || []);
    const [selectedWaveIndex, setSelectedWaveIndex] = useState(0);
    const [editingWave, setEditingWave] = useState(null);

    // Create a new wave
    const addWave = () => {
        const newWave = {
            id: `wave_${Date.now()}`,
            name: `Wave ${waves.length + 1}`,
            delay: 0,
            spawnCount: 5,
            spawnInterval: 1000,
            enemyType: 'basic',
            positions: 'random',
            customPositions: []
        };
        const updated = [...waves, newWave];
        setWaves(updated);
        setSelectedWaveIndex(updated.length - 1);
        saveWaves(updated);
    };

    // Delete a wave
    const deleteWave = (index) => {
        const updated = waves.filter((_, i) => i !== index);
        setWaves(updated);
        setSelectedWaveIndex(Math.max(0, index - 1));
        saveWaves(updated);
    };

    // Update a wave property
    const updateWave = (index, key, value) => {
        const updated = [...waves];
        updated[index] = { ...updated[index], [key]: value };
        setWaves(updated);
        saveWaves(updated);
    };

    // Save waves to project
    const saveWaves = (waveData) => {
        if (updateProject) {
            updateProject({ waves: waveData });
        }
    };

    // Move wave up/down in sequence
    const moveWave = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= waves.length) return;

        const updated = [...waves];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        setWaves(updated);
        setSelectedWaveIndex(newIndex);
        saveWaves(updated);
    };

    const selectedWave = waves[selectedWaveIndex] || null;

    return (
        <div style={{
            display: 'flex',
            height: embedded ? '100%' : '100vh',
            background: '#0f172a',
            color: '#e2e8f0'
        }}>
            {/* Left Panel: Wave List */}
            <div style={{
                width: '250px',
                borderRight: '1px solid #334155',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    {!embedded && onBack && (
                        <button
                            onClick={onBack}
                            style={{ background: '#334155', color: '#e2e8f0', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            ← Back
                        </button>
                    )}
                    <h2 style={{ margin: 0, fontSize: '18px' }}>🌊 Wave Editor</h2>
                </div>


                <button
                    onClick={addWave}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: '#22c55e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginBottom: '16px',
                        fontWeight: 'bold'
                    }}
                >
                    + Add Wave
                </button>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {waves.map((wave, index) => (
                        <div
                            key={wave.id}
                            onClick={() => setSelectedWaveIndex(index)}
                            style={{
                                padding: '12px',
                                marginBottom: '8px',
                                background: selectedWaveIndex === index ? '#3b82f6' : '#1e293b',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{wave.name}</div>
                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                    {wave.spawnCount}x {wave.enemyType}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={(e) => { e.stopPropagation(); moveWave(index, -1); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>↑</button>
                                <button onClick={(e) => { e.stopPropagation(); moveWave(index, 1); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>↓</button>
                            </div>
                        </div>
                    ))}
                    {waves.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                            No waves yet. Click "Add Wave" to start.
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Wave Properties */}
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                {selectedWave ? (
                    <>
                        <h2 style={{ marginTop: 0 }}>Edit: {selectedWave.name}</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '600px' }}>
                            {/* Wave Name */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Wave Name</label>
                                <input
                                    type="text"
                                    value={selectedWave.name}
                                    onChange={(e) => updateWave(selectedWaveIndex, 'name', e.target.value)}
                                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0' }}
                                />
                            </div>

                            {/* Enemy Type */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Enemy Type</label>
                                <select
                                    value={selectedWave.enemyType}
                                    onChange={(e) => updateWave(selectedWaveIndex, 'enemyType', e.target.value)}
                                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0' }}
                                >
                                    <option value="basic">Basic Enemy</option>
                                    <option value="fast">Fast Enemy</option>
                                    <option value="tank">Tank Enemy</option>
                                    <option value="boss">Boss</option>
                                </select>
                            </div>

                            {/* Delay */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Start Delay (ms)</label>
                                <input
                                    type="number"
                                    value={selectedWave.delay}
                                    onChange={(e) => updateWave(selectedWaveIndex, 'delay', parseInt(e.target.value) || 0)}
                                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0' }}
                                />
                            </div>

                            {/* Spawn Count */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Spawn Count</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={selectedWave.spawnCount}
                                    onChange={(e) => updateWave(selectedWaveIndex, 'spawnCount', parseInt(e.target.value) || 1)}
                                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0' }}
                                />
                            </div>

                            {/* Spawn Interval */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Spawn Interval (ms)</label>
                                <input
                                    type="number"
                                    min="100"
                                    step="100"
                                    value={selectedWave.spawnInterval}
                                    onChange={(e) => updateWave(selectedWaveIndex, 'spawnInterval', parseInt(e.target.value) || 500)}
                                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0' }}
                                />
                            </div>

                            {/* Position Mode */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Spawn Positions</label>
                                <select
                                    value={selectedWave.positions}
                                    onChange={(e) => updateWave(selectedWaveIndex, 'positions', e.target.value)}
                                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0' }}
                                >
                                    <option value="random">Random</option>
                                    <option value="top">Top Edge</option>
                                    <option value="sides">Both Sides</option>
                                    <option value="custom">Custom Positions</option>
                                </select>
                            </div>
                        </div>

                        {/* Wave Preview */}
                        <div style={{ marginTop: '24px', padding: '16px', background: '#1e293b', borderRadius: '8px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Wave Summary</h3>
                            <p style={{ margin: 0, color: '#94a3b8' }}>
                                Spawns <strong>{selectedWave.spawnCount}</strong> {selectedWave.enemyType} enemies,
                                starting after <strong>{selectedWave.delay}ms</strong>,
                                with <strong>{selectedWave.spawnInterval}ms</strong> between each spawn.
                                Total duration: <strong>{selectedWave.delay + (selectedWave.spawnCount * selectedWave.spawnInterval)}ms</strong>
                            </p>
                        </div>

                        {/* Delete Button */}
                        <button
                            onClick={() => deleteWave(selectedWaveIndex)}
                            style={{
                                marginTop: '24px',
                                padding: '10px 20px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Delete Wave
                        </button>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', color: '#64748b', marginTop: '100px' }}>
                        <h2>No Wave Selected</h2>
                        <p>Select a wave from the list or create a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
