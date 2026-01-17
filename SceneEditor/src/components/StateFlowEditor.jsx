import { useState } from 'react';

/**
 * StateFlowEditor - Visual editor for Actor State Machines
 * 
 * Allows designers to create and configure finite state machines visually.
 * States are nodes, transitions are connections between them.
 */
export default function StateFlowEditor({ project, updateProject, actorId, onBack }) {
    const [states, setStates] = useState(
        project?.gameObjects?.find(o => o.id === actorId)?.stateMachine?.states || []
    );
    const [selectedStateId, setSelectedStateId] = useState(null);
    const [draggedState, setDraggedState] = useState(null);

    // Get actor
    const actor = project?.gameObjects?.find(o => o.id === actorId);
    const stateMachine = actor?.stateMachine || { initial: 'idle', states: [] };

    // Create a new state
    const addState = () => {
        const newState = {
            id: `state_${Date.now()}`,
            name: 'New State',
            x: 200 + states.length * 50,
            y: 200,
            transitions: [],
            onEnter: '',
            onUpdate: '',
            onExit: ''
        };
        const updated = [...states, newState];
        setStates(updated);
        setSelectedStateId(newState.id);
        saveStateMachine(updated);
    };

    // Delete a state
    const deleteState = (id) => {
        // Remove state and any transitions pointing to it
        const updated = states
            .filter(s => s.id !== id)
            .map(s => ({
                ...s,
                transitions: s.transitions.filter(t => t.target !== id)
            }));
        setStates(updated);
        setSelectedStateId(null);
        saveStateMachine(updated);
    };

    // Update a state property
    const updateState = (id, key, value) => {
        const updated = states.map(s =>
            s.id === id ? { ...s, [key]: value } : s
        );
        setStates(updated);
        saveStateMachine(updated);
    };

    // Add transition between states
    const addTransition = (fromId, toId) => {
        const updated = states.map(s => {
            if (s.id === fromId) {
                const exists = s.transitions.some(t => t.target === toId);
                if (!exists) {
                    return {
                        ...s,
                        transitions: [...s.transitions, { target: toId, condition: '' }]
                    };
                }
            }
            return s;
        });
        setStates(updated);
        saveStateMachine(updated);
    };

    // Remove transition
    const removeTransition = (fromId, toId) => {
        const updated = states.map(s => {
            if (s.id === fromId) {
                return {
                    ...s,
                    transitions: s.transitions.filter(t => t.target !== toId)
                };
            }
            return s;
        });
        setStates(updated);
        saveStateMachine(updated);
    };

    // Save state machine to actor
    const saveStateMachine = (stateData) => {
        if (!updateProject || !actor) return;

        const updatedObjects = project.gameObjects.map(o =>
            o.id === actorId
                ? { ...o, stateMachine: { ...stateMachine, states: stateData } }
                : o
        );
        updateProject({ gameObjects: updatedObjects });
    };

    // Set initial state
    const setInitialState = (stateId) => {
        if (!updateProject || !actor) return;

        const updatedObjects = project.gameObjects.map(o =>
            o.id === actorId
                ? { ...o, stateMachine: { ...stateMachine, initial: stateId } }
                : o
        );
        updateProject({ gameObjects: updatedObjects });
    };

    const selectedState = states.find(s => s.id === selectedStateId);

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            background: '#0f172a',
            color: '#e2e8f0'
        }}>
            {/* Left: Canvas */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    display: 'flex',
                    gap: 8
                }}>
                    <button
                        onClick={onBack}
                        style={{ background: '#334155', color: '#e2e8f0', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        ← Back
                    </button>
                    <button
                        onClick={addState}
                        style={{ background: '#22c55e', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        + Add State
                    </button>
                </div>

                <h2 style={{ position: 'absolute', top: 16, right: 16, margin: 0 }}>
                    State Machine: {actor?.name || 'Unknown'}
                </h2>

                {/* Draw transitions */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    {states.flatMap(state =>
                        state.transitions.map(t => {
                            const target = states.find(s => s.id === t.target);
                            if (!target) return null;
                            return (
                                <line
                                    key={`${state.id}-${t.target}`}
                                    x1={state.x + 60}
                                    y1={state.y + 25}
                                    x2={target.x + 60}
                                    y2={target.y + 25}
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    markerEnd="url(#arrow)"
                                />
                            );
                        })
                    )}
                    <defs>
                        <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
                        </marker>
                    </defs>
                </svg>

                {/* State nodes */}
                {states.map(state => (
                    <div
                        key={state.id}
                        onClick={() => setSelectedStateId(state.id)}
                        style={{
                            position: 'absolute',
                            left: state.x,
                            top: state.y,
                            width: 120,
                            padding: '10px',
                            background: selectedStateId === state.id ? '#3b82f6' : '#1e293b',
                            border: stateMachine.initial === state.id ? '2px solid #22c55e' : '1px solid #334155',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{ fontWeight: 'bold' }}>{state.name}</div>
                        {stateMachine.initial === state.id && (
                            <div style={{ fontSize: '10px', color: '#22c55e' }}>INITIAL</div>
                        )}
                    </div>
                ))}

                {states.length === 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#64748b',
                        textAlign: 'center'
                    }}>
                        <h3>No States</h3>
                        <p>Click "Add State" to create your first state.</p>
                    </div>
                )}
            </div>

            {/* Right: Properties */}
            <div style={{
                width: '300px',
                borderLeft: '1px solid #334155',
                padding: '16px',
                overflowY: 'auto'
            }}>
                {selectedState ? (
                    <>
                        <h3 style={{ marginTop: 0 }}>State Properties</h3>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Name</label>
                            <input
                                type="text"
                                value={selectedState.name}
                                onChange={(e) => updateState(selectedState.id, 'name', e.target.value)}
                                style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0' }}
                            />
                        </div>

                        <button
                            onClick={() => setInitialState(selectedState.id)}
                            disabled={stateMachine.initial === selectedState.id}
                            style={{
                                width: '100%',
                                padding: '8px',
                                background: stateMachine.initial === selectedState.id ? '#334155' : '#22c55e',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: stateMachine.initial === selectedState.id ? 'default' : 'pointer',
                                marginBottom: '16px'
                            }}
                        >
                            {stateMachine.initial === selectedState.id ? '✓ Initial State' : 'Set as Initial'}
                        </button>

                        <h4>Transitions</h4>
                        {selectedState.transitions.length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '14px' }}>No transitions</p>
                        ) : (
                            selectedState.transitions.map(t => {
                                const targetState = states.find(s => s.id === t.target);
                                return (
                                    <div key={t.target} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '8px', background: '#1e293b', borderRadius: '4px' }}>
                                        <span>→ {targetState?.name || 'Unknown'}</span>
                                        <button onClick={() => removeTransition(selectedState.id, t.target)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                                    </div>
                                );
                            })
                        )}

                        {/* Add transition */}
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    addTransition(selectedState.id, e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#e2e8f0', marginTop: '8px' }}
                        >
                            <option value="">+ Add Transition...</option>
                            {states
                                .filter(s => s.id !== selectedState.id && !selectedState.transitions.some(t => t.target === s.id))
                                .map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))
                            }
                        </select>

                        <button
                            onClick={() => deleteState(selectedState.id)}
                            style={{
                                width: '100%',
                                marginTop: '24px',
                                padding: '10px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Delete State
                        </button>
                    </>
                ) : (
                    <div style={{ color: '#64748b', textAlign: 'center', marginTop: '50px' }}>
                        <p>Select a state to edit</p>
                    </div>
                )}
            </div>
        </div>
    );
}
