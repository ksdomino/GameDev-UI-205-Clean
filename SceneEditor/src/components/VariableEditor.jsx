/**
 * VariableEditor - Renders UI controls for actor variables
 * Supports: number (slider), boolean (toggle), color (picker), select (dropdown)
 */
export default function VariableEditor({ variables, onChange }) {
    if (!variables || Object.keys(variables).length === 0) {
        return (
            <div style={styles.empty}>
                No variables defined
            </div>
        )
    }

    // Group variables by their "group" field
    const grouped = {}
    Object.entries(variables).forEach(([key, def]) => {
        const group = def.group || 'General'
        if (!grouped[group]) grouped[group] = []
        grouped[group].push({ key, ...def })
    })

    return (
        <div style={styles.container}>
            {Object.entries(grouped).map(([groupName, vars]) => (
                <div key={groupName} style={styles.group}>
                    <h4 style={styles.groupTitle}>{groupName}</h4>
                    {vars.map(v => (
                        <VariableControl
                            key={v.key}
                            varKey={v.key}
                            definition={v}
                            onChange={onChange}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}

/**
 * Individual variable control - renders appropriate input based on type
 */
function VariableControl({ varKey, definition, onChange }) {
    const { type, default: defaultValue, label, min, max, step, options } = definition
    const displayLabel = label || varKey

    const handleChange = (newValue) => {
        onChange(varKey, newValue)
    }

    // Number: Slider with value display
    if (type === 'number') {
        return (
            <div style={styles.field}>
                <label style={styles.label}>
                    {displayLabel}
                    <span style={styles.value}>{defaultValue}</span>
                </label>
                <input
                    type="range"
                    min={min ?? 0}
                    max={max ?? 100}
                    step={step ?? 1}
                    value={defaultValue}
                    onChange={(e) => handleChange(parseFloat(e.target.value))}
                    style={styles.slider}
                />
                <div style={styles.range}>
                    <span>{min ?? 0}</span>
                    <span>{max ?? 100}</span>
                </div>
            </div>
        )
    }

    // Boolean: Toggle switch
    if (type === 'boolean') {
        return (
            <div style={styles.field}>
                <label style={styles.toggleLabel}>
                    <div
                        style={{
                            ...styles.toggle,
                            background: defaultValue ? '#6366f1' : 'rgba(255,255,255,0.1)'
                        }}
                        onClick={() => handleChange(!defaultValue)}
                    >
                        <div
                            style={{
                                ...styles.toggleKnob,
                                transform: defaultValue ? 'translateX(20px)' : 'translateX(0)'
                            }}
                        />
                    </div>
                    <span>{displayLabel}</span>
                </label>
            </div>
        )
    }

    // Color: Color picker with hex input
    if (type === 'color') {
        return (
            <div style={styles.field}>
                <label style={styles.label}>{displayLabel}</label>
                <div style={styles.colorRow}>
                    <input
                        type="color"
                        value={defaultValue || '#ffffff'}
                        onChange={(e) => handleChange(e.target.value)}
                        style={styles.colorPicker}
                    />
                    <input
                        type="text"
                        value={defaultValue || '#ffffff'}
                        onChange={(e) => handleChange(e.target.value)}
                        style={styles.colorInput}
                    />
                </div>
            </div>
        )
    }

    // Select: Dropdown
    if (type === 'select') {
        return (
            <div style={styles.field}>
                <label style={styles.label}>{displayLabel}</label>
                <select
                    value={defaultValue || ''}
                    onChange={(e) => handleChange(e.target.value)}
                    style={styles.select}
                >
                    {(options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
        )
    }

    // String: Text input (fallback)
    return (
        <div style={styles.field}>
            <label style={styles.label}>{displayLabel}</label>
            <input
                type="text"
                value={defaultValue || ''}
                onChange={(e) => handleChange(e.target.value)}
                style={styles.textInput}
            />
        </div>
    )
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    empty: {
        padding: '20px',
        color: '#64748b',
        textAlign: 'center',
        fontStyle: 'italic',
        fontSize: '12px'
    },
    group: {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '12px'
    },
    groupTitle: {
        fontSize: '11px',
        fontWeight: '600',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
    },
    field: {
        marginBottom: '12px'
    },
    label: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        color: '#94a3b8',
        marginBottom: '6px'
    },
    value: {
        color: '#6366f1',
        fontWeight: '600',
        fontFamily: 'monospace'
    },
    slider: {
        width: '100%',
        height: '6px',
        appearance: 'none',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '3px',
        cursor: 'pointer'
    },
    range: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '10px',
        color: '#475569',
        marginTop: '4px'
    },
    toggleLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '11px',
        color: '#94a3b8',
        cursor: 'pointer'
    },
    toggle: {
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        padding: '2px',
        cursor: 'pointer',
        transition: 'background 0.2s'
    },
    toggleKnob: {
        width: '20px',
        height: '20px',
        borderRadius: '10px',
        background: '#fff',
        transition: 'transform 0.2s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    colorRow: {
        display: 'flex',
        gap: '8px'
    },
    colorPicker: {
        width: '40px',
        height: '32px',
        padding: 0,
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
    },
    colorInput: {
        flex: 1,
        padding: '8px 10px',
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '6px',
        color: '#f8fafc',
        fontSize: '11px',
        fontFamily: 'monospace'
    },
    select: {
        width: '100%',
        padding: '8px 10px',
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '6px',
        color: '#f8fafc',
        fontSize: '11px',
        cursor: 'pointer'
    },
    textInput: {
        width: '100%',
        padding: '8px 10px',
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '6px',
        color: '#f8fafc',
        fontSize: '11px'
    }
}
