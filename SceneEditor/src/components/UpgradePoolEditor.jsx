import { useState } from 'react';

/**
 * UpgradePoolEditor - Visual editor for defining upgrade choices
 * 
 * Allows designers to create upgrade pools for rogue-lite level-up systems.
 * Integrates with UpgradeModal.js in the Engine.
 */
export default function UpgradePoolEditor({ project, updateProject, onBack, embedded = false }) {
    const [upgrades, setUpgrades] = useState(project?.upgrades || []);
    const [selectedUpgradeId, setSelectedUpgradeId] = useState(null);

    // Create a new upgrade
    const addUpgrade = () => {
        const newUpgrade = {
            id: `upgrade_${Date.now()}`,
            name: 'New Upgrade',
            description: 'Description here',
            type: 'stat', // stat, ability, passive
            stat: 'health',
            value: 10,
            maxStacks: 1,
            rarity: 'common', // common, rare, epic, legendary
            icon: null
        };
        const updated = [...upgrades, newUpgrade];
        setUpgrades(updated);
        setSelectedUpgradeId(newUpgrade.id);
        saveUpgrades(updated);
    };

    // Delete an upgrade
    const deleteUpgrade = (id) => {
        const updated = upgrades.filter(u => u.id !== id);
        setUpgrades(updated);
        setSelectedUpgradeId(null);
        saveUpgrades(updated);
    };

    // Update an upgrade property
    const updateUpgrade = (id, key, value) => {
        const updated = upgrades.map(u =>
            u.id === id ? { ...u, [key]: value } : u
        );
        setUpgrades(updated);
        saveUpgrades(updated);
    };

    // Save upgrades to project
    const saveUpgrades = (upgradeData) => {
        if (updateProject) {
            updateProject({ upgrades: upgradeData });
        }
    };

    const selectedUpgrade = upgrades.find(u => u.id === selectedUpgradeId) || null;

    const rarityColors = {
        common: '#9ca3af',
        rare: '#3b82f6',
        epic: '#a855f7',
        legendary: '#f59e0b'
    };

    return (
        <div style={{
            display: 'flex',
            height: embedded ? '100%' : '100vh',
            background: '#0f172a',
            color: '#e2e8f0'
        }}>
            {/* Left Panel: Upgrade List */}
            <div style={{
                width: '280px',
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
                    <h2 style={{ margin: 0, fontSize: '16px' }}>⬆️ Upgrade Pool</h2>
                </div>


                <button
                    onClick={addUpgrade}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: '#a855f7',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginBottom: '16px',
                        fontWeight: 'bold'
                    }}
                >
                    + Add Upgrade
                </button>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {upgrades.map(upgrade => (
                        <div
                            key={upgrade.id}
                            onClick={() => setSelectedUpgradeId(upgrade.id)}
                            style={{
                                padding: '12px',
                                marginBottom: '8px',
                                background: selectedUpgradeId === upgrade.id ? '#3b82f6' : '#1e293b',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                borderLeft: `4px solid ${rarityColors[upgrade.rarity] || '#9ca3af'}`
                            }}
                        >
                            <div style={{ fontWeight: 'bold' }}>{upgrade.name}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {upgrade.type} • {upgrade.rarity}
                            </div>
                        </div>
                    ))}
                    {upgrades.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                            No upgrades yet. Click "Add Upgrade" to start.
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Upgrade Properties */}
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                {selectedUpgrade ? (
                    <>
                        <h2 style={{ marginTop: 0 }}>
                            <span style={{
                                display: 'inline-block',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: rarityColors[selectedUpgrade.rarity],
                                marginRight: '10px'
                            }} />
                            {selectedUpgrade.name}
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '600px' }}>
                            {/* Name */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Name</label>
                                <input
                                    type="text"
                                    value={selectedUpgrade.name}
                                    onChange={(e) => updateUpgrade(selectedUpgrade.id, 'name', e.target.value)}
                                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0' }}
                                />
                            </div>

                            {/* Rarity */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Rarity</label>
                                <select
                                    value={selectedUpgrade.rarity}
                                    onChange={(e) => updateUpgrade(selectedUpgrade.id, 'rarity', e.target.value)}
                                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0' }}
                                >
                                    <option value="common">Common</option>
                                    <option value="rare">Rare</option>
                                    <option value="epic">Epic</option>
                                    <option value="legendary">Legendary</option>
                                </select>
                            </div>

                            {/* Type */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Type</label>
                                <select
                                    value={selectedUpgrade.type}
                                    onChange={(e) => updateUpgrade(selectedUpgrade.id, 'type', e.target.value)}
                                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0' }}
                                >
                                    <option value="stat">Stat Boost</option>
                                    <option value="ability">Active Ability</option>
                                    <option value="passive">Passive Effect</option>
                                </select>
                            </div>

                            {/* Stat (for stat type) */}
                            {selectedUpgrade.type === 'stat' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Stat</label>
                                    <select
                                        value={selectedUpgrade.stat}
                                        onChange={(e) => updateUpgrade(selectedUpgrade.id, 'stat', e.target.value)}
                                        style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0' }}
                                    >
                                        <option value="health">Health</option>
                                        <option value="damage">Damage</option>
                                        <option value="speed">Speed</option>
                                        <option value="attackSpeed">Attack Speed</option>
                                        <option value="armor">Armor</option>
                                        <option value="critChance">Crit Chance</option>
                                        <option value="magnet">Pickup Range</option>
                                    </select>
                                </div>
                            )}

                            {/* Value */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Value</label>
                                <input
                                    type="number"
                                    value={selectedUpgrade.value}
                                    onChange={(e) => updateUpgrade(selectedUpgrade.id, 'value', parseFloat(e.target.value) || 0)}
                                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0' }}
                                />
                            </div>

                            {/* Max Stacks */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Max Stacks</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={selectedUpgrade.maxStacks}
                                    onChange={(e) => updateUpgrade(selectedUpgrade.id, 'maxStacks', parseInt(e.target.value) || 1)}
                                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0' }}
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div style={{ marginTop: '16px', maxWidth: '600px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Description</label>
                            <textarea
                                value={selectedUpgrade.description}
                                onChange={(e) => updateUpgrade(selectedUpgrade.id, 'description', e.target.value)}
                                rows={3}
                                style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0', resize: 'vertical' }}
                            />
                        </div>

                        {/* Preview Card */}
                        <div style={{
                            marginTop: '24px',
                            padding: '20px',
                            background: '#1e293b',
                            borderRadius: '8px',
                            borderLeft: `4px solid ${rarityColors[selectedUpgrade.rarity]}`,
                            maxWidth: '300px'
                        }}>
                            <h3 style={{ marginTop: 0, marginBottom: '8px' }}>{selectedUpgrade.name}</h3>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>{selectedUpgrade.description}</p>
                            {selectedUpgrade.type === 'stat' && (
                                <p style={{ margin: '8px 0 0', color: '#4ade80', fontWeight: 'bold' }}>
                                    +{selectedUpgrade.value} {selectedUpgrade.stat}
                                </p>
                            )}
                        </div>

                        {/* Delete Button */}
                        <button
                            onClick={() => deleteUpgrade(selectedUpgrade.id)}
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
                            Delete Upgrade
                        </button>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', color: '#64748b', marginTop: '100px' }}>
                        <h2>No Upgrade Selected</h2>
                        <p>Select an upgrade from the list or create a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
