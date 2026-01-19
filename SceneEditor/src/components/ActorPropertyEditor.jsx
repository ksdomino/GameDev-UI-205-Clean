import { useState, useEffect } from 'react'
import { ANIMATION_TYPES } from '../data/defaultProject'
import { getActors, getActor } from '../services/api'

/**
 * Actor Property Editor - Edit properties for different actor types
 */
export default function ActorPropertyEditor({
  entity,
  onChange,
  onDelete,
  project,
  scenes,
  subScenes,
  availableAssets = { images: [], sprites: [], backgrounds: [], audio: [] },
  onOpenAssetManager,
  onOpenLogic,
  onOpenAnimation
}) {
  const [actors, setActors] = useState([])
  const [actorTemplate, setActorTemplate] = useState(null)

  useEffect(() => {
    loadActors()
  }, [])

  useEffect(() => {
    if (entity.actorRef) {
      loadActorTemplate(entity.actorRef)
    } else {
      setActorTemplate(null)
    }
  }, [entity.actorRef])

  const loadActors = async () => {
    try {
      const result = await getActors()
      if (result.success) {
        setActors(result.actors || [])
      }
    } catch (err) {
      console.error('Failed to load actors:', err)
    }
  }

  const loadActorTemplate = async (actorId) => {
    try {
      const result = await getActor(actorId)
      if (result.success) {
        setActorTemplate(result.data)
      }
    } catch (err) {
      console.error('Failed to load actor template:', err)
    }
  }

  if (!entity) return null

  const handleChange = (field, value) => {
    onChange({ [field]: value })
  }

  const handleNestedChange = (parent, field, value) => {
    onChange({ [parent]: { ...entity[parent], [field]: value } })
  }

  const handleVariableChange = (key, value) => {
    const newVars = { ...(entity.variables || {}) }
    newVars[key] = value
    onChange({ variables: newVars })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px' }}>
      {/* Common: ID */}
      <Field label="ID">
        <input
          type="text"
          value={entity.id || ''}
          onChange={(e) => handleChange('id', e.target.value)}
          placeholder="unique_id"
          style={styles.input}
        />
      </Field>

      {/* Common: Position & Align */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <Field label="X">
          <input type="number" value={entity.x || 0} onChange={(e) => handleChange('x', parseFloat(e.target.value) || 0)} style={styles.input} />
        </Field>
        <Field label="Y">
          <input type="number" value={entity.y || 0} onChange={(e) => handleChange('y', parseFloat(e.target.value) || 0)} style={styles.input} />
        </Field>
      </div>

      {/* Align Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '4px' }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          <button onClick={() => handleChange('x', (entity.width || 100) / 2)} style={styles.alignBtn} title="Align Left">⇤</button>
          <button onClick={() => handleChange('x', project.canvas.width / 2)} style={styles.alignBtn} title="Align Center">↔</button>
          <button onClick={() => handleChange('x', project.canvas.width - (entity.width || 100) / 2)} style={styles.alignBtn} title="Align Right">⇥</button>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          <button onClick={() => handleChange('y', (entity.height || 100) / 2)} style={styles.alignBtn} title="Align Top">⤒</button>
          <button onClick={() => handleChange('y', project.canvas.height / 2)} style={styles.alignBtn} title="Align Middle">↕</button>
          <button onClick={() => handleChange('y', project.canvas.height - (entity.height || 100) / 2)} style={styles.alignBtn} title="Align Bottom">⤓</button>
        </div>
      </div>

      {/* Global Actor & Interactivity */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '4px' }}>
        <Field label="Global Actor">
          <div style={{ display: 'flex', gap: '6px' }}>
            <select
              value={entity.actorRef || ''}
              onChange={(e) => handleChange('actorRef', e.target.value)}
              style={{ ...styles.input, flex: 1 }}
            >
              <option value="">None (Static Actor)</option>
              {actors.map(actor => (
                <option key={actor.id} value={actor.id}>
                  {actor.id} ({actor.type || 'General'})
                </option>
              ))}
            </select>
            <button
              onClick={loadActors}
              style={{ ...styles.addButton, padding: '4px 8px' }}
              title="Refresh actor list"
            >
              ↻
            </button>
          </div>
        </Field>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer', padding: '4px 0' }}>
          <input
            type="checkbox"
            checked={entity.interactive || false}
            onChange={(e) => handleChange('interactive', e.target.checked)}
            style={{ width: '14px', height: '14px' }}
          />
          <span style={{ fontSize: '11px', color: '#f8fafc', fontWeight: '500' }}>🖐️ Interactive (Captures Clicks)</span>
        </label>
      </div>

      {/* Size (for shapes, buttons, sprites) */}
      {(entity.type === 'shape' || entity.type === 'button' || entity.type === 'sprite') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <Field label="Width">
            <input type="number" value={entity.width || 100} onChange={(e) => handleChange('width', parseFloat(e.target.value) || 100)} style={styles.input} />
          </Field>
          <Field label="Height">
            <input type="number" value={entity.height || 100} onChange={(e) => handleChange('height', parseFloat(e.target.value) || 100)} style={styles.input} />
          </Field>
        </div>
      )}

      {/* Type-specific properties */}
      {entity.type === 'sprite' && (
        <>
          <Field label="Asset">
            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                value={entity.assetId || ''}
                onChange={(e) => handleChange('assetId', e.target.value)}
                style={{ ...styles.input, flex: 1 }}
              >
                <option value="">Select asset...</option>
                <optgroup label="🖼️ Sprites">
                  {availableAssets.sprites?.map(img => (
                    <option key={img.id} value={img.id}>{img.filename}</option>
                  ))}
                </optgroup>
                <optgroup label="🌄 Backgrounds">
                  {availableAssets.backgrounds?.map(img => (
                    <option key={img.id} value={img.id}>{img.filename}</option>
                  ))}
                </optgroup>
                {availableAssets.images?.filter(i =>
                  !availableAssets.sprites?.find(s => s.id === i.id) &&
                  !availableAssets.backgrounds?.find(b => b.id === i.id)
                ).length > 0 && (
                    <optgroup label="📁 Other Images">
                      {availableAssets.images.filter(i =>
                        !availableAssets.sprites?.find(s => s.id === i.id) &&
                        !availableAssets.backgrounds?.find(b => b.id === i.id)
                      ).map(img => (
                        <option key={img.id} value={img.id}>{img.filename}</option>
                      ))}
                    </optgroup>
                  )}
              </select>
              <button
                onClick={onOpenAssetManager}
                style={styles.uploadButton}
                title="Upload assets"
              >
                📦
              </button>
            </div>
          </Field>

          {/* Asset preview if selected */}
          {entity.assetId && (
            <div style={styles.assetPreview}>
              <img
                id={`preview-${entity.id}`}
                src={availableAssets?.images?.find(a => a.id === entity.assetId)?.path
                  ? `http://localhost:5174${availableAssets.images.find(a => a.id === entity.assetId).path}`
                  : `http://localhost:5174/assets/images/${entity.assetId}.png`}
                alt={entity.assetId}
                style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>
          )}

          {/* Fit to Image Size button */}
          {entity.assetId && (
            <button
              onClick={() => {
                const asset = availableAssets?.images?.find(a => a.id === entity.assetId)
                if (!asset) return

                const img = new Image()
                img.onload = () => {
                  onChange({ width: img.width, height: img.height })
                }
                img.src = `http://localhost:5174${asset.path}`
              }}
              style={styles.fitButton}
            >
              📐 Fit to Original Size
            </button>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <Field label="Scale X">
              <input type="number" step="0.1" value={entity.scaleX ?? 1} onChange={(e) => handleChange('scaleX', parseFloat(e.target.value) || 1)} style={styles.input} />
            </Field>
            <Field label="Scale Y">
              <input type="number" step="0.1" value={entity.scaleY ?? 1} onChange={(e) => handleChange('scaleY', parseFloat(e.target.value) || 1)} style={styles.input} />
            </Field>
          </div>
          <Field label="Rotation (deg)">
            <input type="number" value={Math.round((entity.rotation || 0) * 180 / Math.PI)} onChange={(e) => handleChange('rotation', (parseFloat(e.target.value) || 0) * Math.PI / 180)} style={styles.input} />
          </Field>
        </>
      )}

      {entity.type === 'button' && (
        <>
          <Field label="Text">
            <input type="text" value={entity.text || ''} onChange={(e) => handleChange('text', e.target.value)} style={styles.input} />
          </Field>
          <Field label="Color">
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="color" value={entity.color || '#6366f1'} onChange={(e) => handleChange('color', e.target.value)} style={{ width: '40px', height: '28px', padding: 0, border: 'none', borderRadius: '4px' }} />
              <input type="text" value={entity.color || '#6366f1'} onChange={(e) => handleChange('color', e.target.value)} style={{ ...styles.input, flex: 1 }} />
            </div>
          </Field>
          <Field label="On Click">
            <select
              value={entity.onClick?.action || 'none'}
              onChange={(e) => handleNestedChange('onClick', 'action', e.target.value)}
              style={styles.input}
            >
              <option value="none">None</option>
              <option value="switchScene">Switch Scene</option>
              <option value="switchState">Switch State</option>
              <option value="playSound">Play Sound</option>
            </select>
          </Field>
          {entity.onClick?.action === 'switchScene' && (
            <Field label="Target Scene">
              <select
                value={entity.onClick?.target || ''}
                onChange={(e) => handleNestedChange('onClick', 'target', e.target.value)}
                style={styles.input}
              >
                <option value="">Select scene...</option>
                {scenes.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
          )}
          {entity.onClick?.action === 'switchState' && (
            <Field label="Target Sub-Scene">
              <select
                value={entity.onClick?.target || ''}
                onChange={(e) => handleNestedChange('onClick', 'target', e.target.value)}
                style={styles.input}
              >
                <option value="">Select sub-scene...</option>
                {subScenes.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
          )}
        </>
      )}

      {entity.type === 'text' && (
        <>
          <Field label="Content">
            <textarea
              value={entity.content || ''}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={2}
              style={{ ...styles.input, resize: 'vertical' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <Field label="Font Size">
              <input
                type="number"
                value={entity.fontSize || 48}
                onChange={(e) => handleChange('fontSize', parseInt(e.target.value) || 48)}
                style={styles.input}
              />
            </Field>
            <Field label="Weight">
              <select
                value={entity.fontWeight || 'normal'}
                onChange={(e) => handleChange('fontWeight', e.target.value)}
                style={styles.input}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="lighter">Light</option>
              </select>
            </Field>
          </div>

          <Field label="Font Family">
            <select
              value={entity.fontFamily || 'Arial'}
              onChange={(e) => handleChange('fontFamily', e.target.value)}
              style={styles.input}
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Courier New">Courier New</option>
              <option value="Georgia">Georgia</option>
              <option value="system-ui">System UI</option>
            </select>
          </Field>

          <Field label="Legacy Font String (Optional)">
            <input
              type="text"
              value={entity.font || ''}
              onChange={(e) => handleChange('font', e.target.value)}
              placeholder="e.bold 48px Arial"
              style={styles.input}
            />
          </Field>

          <Field label="Color">
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="color" value={entity.color || '#ffffff'} onChange={(e) => handleChange('color', e.target.value)} style={{ width: '40px', height: '28px', padding: 0, border: 'none', borderRadius: '4px' }} />
              <input type="text" value={entity.color || '#ffffff'} onChange={(e) => handleChange('color', e.target.value)} style={{ ...styles.input, flex: 1 }} />
            </div>
          </Field>
          <Field label="Align">
            <select value={entity.textAlign || 'center'} onChange={(e) => handleChange('textAlign', e.target.value)} style={styles.input}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
        </>
      )}

      {entity.type === 'shape' && (
        <>
          <Field label="Shape">
            <select value={entity.shape || 'rect'} onChange={(e) => handleChange('shape', e.target.value)} style={styles.input}>
              <option value="rect">Rectangle</option>
              <option value="circle">Circle</option>
              <option value="line">Line</option>
            </select>
          </Field>
          {entity.shape === 'circle' && (
            <Field label="Radius">
              <input type="number" value={entity.radius || 50} onChange={(e) => handleChange('radius', parseFloat(e.target.value) || 50)} style={styles.input} />
            </Field>
          )}
          <Field label="Color">
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="color" value={entity.color || '#6366f1'} onChange={(e) => handleChange('color', e.target.value)} style={{ width: '40px', height: '28px', padding: 0, border: 'none', borderRadius: '4px' }} />
              <input type="text" value={entity.color || '#6366f1'} onChange={(e) => handleChange('color', e.target.value)} style={{ ...styles.input, flex: 1 }} />
            </div>
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={entity.fill !== false} onChange={(e) => handleChange('fill', e.target.checked)} />
            <span>Fill shape</span>
          </label>
          {!entity.fill && (
            <Field label="Stroke Width">
              <input type="number" value={entity.strokeWidth || 2} onChange={(e) => handleChange('strokeWidth', parseFloat(e.target.value) || 2)} style={styles.input} />
            </Field>
          )}
        </>
      )}

      {entity.type === 'logic' && (
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '24px' }}>⚙️</span>
            <div>
              <div style={{ fontWeight: 'bold', color: '#a5b4fc' }}>Logic Controller</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Invisible engine controller</div>
            </div>
          </div>
          <button
            onClick={() => onOpenLogic(entity.id)}
            style={{
              width: '100%',
              padding: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            🧠 Open Logic Editor
          </button>
        </div>
      )}

      {/* Common: Alpha */}
      <Field label="Opacity">
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={entity.alpha ?? 1}
          onChange={(e) => handleChange('alpha', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <span style={{ fontSize: '10px', color: '#64748b' }}>{Math.round((entity.alpha ?? 1) * 100)}%</span>
      </Field>

      {/* Animation */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: '600', margin: 0 }}>🎭 Animation</h4>
          <button onClick={onOpenAnimation} style={{ ...styles.addButton, padding: '2px 8px', fontSize: '10px' }}>
            🎞️ Open Timeline
          </button>
        </div>
        <Field label="Type">
          <select
            value={entity.animation?.type || 'none'}
            onChange={(e) => handleChange('animation', { ...entity.animation, type: e.target.value, duration: entity.animation?.duration || 0.5 })}
            style={styles.input}
          >
            {ANIMATION_TYPES.map(a => <option key={a.type} value={a.type}>{a.label}</option>)}
          </select>
        </Field>
        {entity.animation?.type && entity.animation.type !== 'none' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
              <Field label="Duration">
                <input type="number" step="0.1" value={entity.animation?.duration || 0.5} onChange={(e) => handleNestedChange('animation', 'duration', parseFloat(e.target.value) || 0.5)} style={styles.input} />
              </Field>
              <Field label="Delay">
                <input type="number" step="0.1" value={entity.animation?.delay || 0} onChange={(e) => handleNestedChange('animation', 'delay', parseFloat(e.target.value) || 0)} style={styles.input} />
              </Field>
            </div>
            {(entity.animation.type === 'slideIn' || entity.animation.type === 'slideOut') && (
              <Field label="Direction">
                <select value={entity.animation.direction || 'left'} onChange={(e) => handleNestedChange('animation', 'direction', e.target.value)} style={styles.input}>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </Field>
            )}
            <Field label="Easing">
              <select value={entity.animation?.easing || 'easeOut'} onChange={(e) => handleNestedChange('animation', 'easing', e.target.value)} style={styles.input}>
                <option value="linear">Linear</option>
                <option value="easeIn">Ease In</option>
                <option value="easeOut">Ease Out</option>
                <option value="easeInOut">Ease In/Out</option>
              </select>
            </Field>
          </>
        )}
      </div>

      {/* Custom Variables */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '4px' }}>
        <h4 style={{ fontSize: '11px', fontWeight: '600', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <span>🧩 {actorTemplate ? 'Overridable Variables' : 'Custom Variables'}</span>
          <button
            onClick={() => {
              const currentVars = entity.variables || {}
              const key = `var_${Object.keys(currentVars).length + 1}`
              onChange({ variables: { ...currentVars, [key]: 0 } })
            }}
            style={{ ...styles.addButton, padding: '2px 6px', fontSize: '10px' }}
          >
            + Add
          </button>
        </h4>

        {/* Inherited Variables (if using Global Actor) */}
        {actorTemplate?.variables && Object.entries(actorTemplate.variables).map(([key, templateVar]) => {
          const isOverridden = entity.variables && entity.variables[key] !== undefined
          const value = isOverridden ? entity.variables[key] : (templateVar.default ?? templateVar)
          const isBoolean = typeof value === 'boolean'
          const isNumber = typeof value === 'number'

          return (
            <div key={`inherited-${key}`} style={{ display: 'flex', gap: '4px', marginBottom: '6px', opacity: isOverridden ? 1 : 0.7 }}>
              <div style={{ width: '80px', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '9px', color: isOverridden ? '#3b82f6' : '#94a3b8', fontWeight: isOverridden ? '600' : '400' }}>
                  {key}
                </span>
                <span style={{ fontSize: '8px', color: '#64748b' }}>{isOverridden ? 'Overridden' : 'Inherited'}</span>
              </div>

              {isBoolean ? (
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => handleVariableChange(key, e.target.checked)}
                  style={{ marginTop: '6px' }}
                />
              ) : isNumber ? (
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleVariableChange(key, parseFloat(e.target.value) || 0)}
                  style={{ ...styles.input, flex: 1, borderColor: isOverridden ? '#3b82f6' : undefined }}
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleVariableChange(key, e.target.value)}
                  style={{ ...styles.input, flex: 1, borderColor: isOverridden ? '#3b82f6' : undefined }}
                />
              )}

              {isOverridden && (
                <button
                  onClick={() => {
                    const newVars = { ...entity.variables }
                    delete newVars[key]
                    onChange({ variables: newVars })
                  }}
                  style={{ ...styles.deleteButton, width: '24px', padding: '0', marginTop: '0', background: 'transparent' }}
                  title="Reset to Inherited"
                >
                  ↺
                </button>
              )}
            </div>
          )
        })}

        {/* Actor-Only Variables */}
        {entity.variables && Object.entries(entity.variables)
          .filter(([key]) => !actorTemplate?.variables?.[key])
          .map(([key, value], i) => (
            <div key={`custom-${i}`} style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
              <input
                type="text"
                value={key}
                onChange={(e) => {
                  const newKey = e.target.value
                  if (newKey && !entity.variables[newKey]) {
                    const newVars = { ...entity.variables }
                    delete newVars[key]
                    newVars[newKey] = value
                    onChange({ variables: newVars })
                  }
                }}
                style={{ ...styles.input, width: '80px' }}
                placeholder="key"
              />
              {typeof value === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => handleVariableChange(key, e.target.checked)}
                  style={{ marginTop: '6px' }}
                />
              ) : typeof value === 'number' ? (
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleVariableChange(key, parseFloat(e.target.value) || 0)}
                  style={{ ...styles.input, flex: 1 }}
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleVariableChange(key, e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                />
              )}
              <button
                onClick={() => {
                  const newVars = { ...entity.variables }
                  delete newVars[key]
                  onChange({ variables: newVars })
                }}
                style={{ ...styles.deleteButton, width: '24px', padding: '0', marginTop: '0' }}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}

        {(!entity.variables || Object.keys(entity.variables).length === 0) && !actorTemplate && (
          <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>
            No custom variables
          </div>
        )}
      </div>

      {/* Delete button */}
      <button onClick={onDelete} style={styles.deleteButton}>
        🗑️ Delete Actor
      </button>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '3px', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const styles = {
  input: {
    width: '100%',
    padding: '8px 10px',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '6px',
    color: '#f8fafc',
    fontSize: '11px',
    transition: 'all 0.2s ease'
  },
  uploadButton: {
    padding: '6px 10px',
    background: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '6px',
    color: '#a5b4fc',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease'
  },
  assetPreview: {
    padding: '12px',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
  },
  fitButton: {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    borderRadius: '6px',
    color: '#4ade80',
    fontSize: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '10px',
    transition: 'all 0.2s ease'
  },
  deleteButton: {
    marginTop: '12px',
    padding: '10px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  addButton: {
    background: 'rgba(99, 102, 241, 0.2)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '4px',
    color: '#a5b4fc',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  alignBtn: {
    flex: 1,
    padding: '4px 0',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    color: '#cbd5e1',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s'
  }
}
