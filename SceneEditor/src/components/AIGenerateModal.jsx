import { useState, useEffect } from 'react'
import { LAYERS, createDefaultSubScene } from '../data/defaultProject'

/**
 * AI Generate Modal - Use Claude API to generate scene content
 */
export default function AIGenerateModal({ project, scene, subScene, onClose, onGenerate, onGenerateSubScene }) {
  const [provider, setProvider] = useState('claude') // 'claude', 'gemini', 'openai'
  const [apiKey, setApiKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [mode, setMode] = useState('entities') // 'entities', 'subScene', 'full-scene'
  const [prompt, setPrompt] = useState('')
  const [targetLayer, setTargetLayer] = useState('SPRITES')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // Load API keys from localStorage
  useEffect(() => {
    setApiKey(localStorage.getItem('claude-api-key') || '')
    setGeminiKey(localStorage.getItem('gemini-api-key') || '')
    setOpenaiKey(localStorage.getItem('openai-api-key') || '')
    setProvider(localStorage.getItem('ai-provider') || 'claude')
  }, [])

  // Save API key
  const saveKey = (type, key) => {
    switch (type) {
      case 'claude': setApiKey(key); localStorage.setItem('claude-api-key', key); break
      case 'gemini': setGeminiKey(key); localStorage.setItem('gemini-api-key', key); break
      case 'openai': setOpenaiKey(key); localStorage.setItem('openai-api-key', key); break
      case 'provider': setProvider(key); localStorage.setItem('ai-provider', key); break
    }
  }

  // Generate prompt examples based on mode
  const getPromptPlaceholder = () => {
    switch (mode) {
      case 'entities':
        return 'E.g., "Create a title screen with the game name centered, a play button below it, and a settings gear icon in the corner"'
      case 'subScene':
        return 'E.g., "Create an intro animation sub-scene that fades in a logo for 2 seconds, then shows the title with a pulse animation"'
      case 'full-scene':
        return 'E.g., "Create a complete title scene with intro animation, main menu with play/settings/credits buttons, and transitions to the game scene"'
      default:
        return 'Describe what you want to create...'
    }
  }

  // Build comprehensive system prompt with llms.txt context and rules
  const buildSystemPrompt = () => {
    const canvasInfo = `Canvas: ${project.canvas.width}x${project.canvas.height} (${project.canvas.orientation})`
    const layerInfo = `Available layers (bottom to top): ${LAYERS.map(l => l.name).join(', ')}`

    // Get available assets info
    const sceneAssets = scene?.assets || { images: [], audio: [] }
    const assetsInfo = sceneAssets.images.length > 0
      ? `Available assets: ${sceneAssets.images.map(a => a.id || a).join(', ')}`
      : 'No assets uploaded yet - use placeholder assetIds'

    return `You are a game scene generator for the Canvas Engine - a high-performance vanilla JavaScript HTML5 Canvas game engine for 2D mobile games.

# ENGINE CONTEXT
${canvasInfo}
Target: Mobile (iOS/Android via Capacitor)
Coordinate System: Origin at top-left (0,0), x increases right, y increases down
${layerInfo}
${assetsInfo}

# LAYER SYSTEM (Render Order Bottom to Top)
| Layer | Z-Index | Purpose |
|-------|---------|---------|
| BG_FAR | 0 | Far backgrounds, sky, distant elements |
| BG_NEAR | 1 | Near backgrounds, parallax elements |
| VIDEO_IMAGE | 2 | Full-screen images, video frames |
| SHAPES | 3 | Primitive shapes, particles, effects |
| SPRITES | 4 | Game characters, items, objects |
| TEXT | 5 | UI text, labels, scores, messages |
| UI_BUTTONS | 6 | Touch buttons (always on top) |

# ACTOR JSON SCHEMAS

1. SPRITE (for images/characters)
{
  "type": "sprite",
  "id": "unique_id",
  "assetId": "image_asset_id",
  "x": ${project.canvas.width / 2}, "y": ${project.canvas.height / 2},
  "width": 200, "height": 200,
  "rotation": 0,
  "alpha": 1,
  "scaleX": 1, "scaleY": 1,
  "visible": true,
  "animation": { "type": "fadeIn", "duration": 0.5 }
}

2. BUTTON (for clickable UI)
{
  "type": "button",
  "id": "unique_id",
  "text": "BUTTON TEXT",
  "x": ${project.canvas.width / 2}, "y": ${project.canvas.height / 2},
  "width": 300, "height": 100,
  "color": "#6366f1",
  "alpha": 1,
  "onClick": { "action": "switchScene", "target": "GameScene" }
}
onClick actions: "switchScene", "switchState", "playSound", "none"

3. TEXT (for labels/messages)
{
  "type": "text",
  "id": "unique_id",
  "content": "Hello World",
  "x": ${project.canvas.width / 2}, "y": 400,
  "font": "48px Arial",
  "color": "#ffffff",
  "textAlign": "center",
  "alpha": 1
}
Font examples: "bold 72px Arial", "48px Impact", "32px Helvetica"

4. SHAPE (for primitives)
{
  "type": "shape",
  "id": "unique_id",
  "shape": "rect",
  "x": 100, "y": 100,
  "width": 200, "height": 200,
  "color": "#ff0000",
  "fill": true,
  "strokeWidth": 2,
  "alpha": 1
}
Shape types: "rect", "circle", "line"

# ANIMATION OPTIONS
{
  "animation": {
    "type": "fadeIn|fadeOut|slideIn|slideOut|scale|pulse",
    "duration": 0.5,
    "delay": 0,
    "direction": "top|bottom|left|right",
    "easing": "linear|easeIn|easeOut|easeInOut"
  }
}

# SUB-SCENE STRUCTURE (for subScene/full-scene modes)
{
  "name": "SUB_SCENE_NAME",
  "duration": 2.0,
  "clearLayers": false,
  "layers": {
    "BG_FAR": [/* actors */],
    "SPRITES": [/* actors */],
    "TEXT": [/* actors */],
    "UI_BUTTONS": [/* actors */]
  },
  "transition": {
    "type": "timer|button|none",
    "duration": 2.0,
    "nextSubScene": "NEXT_SUB_SCENE_NAME",
    "nextScene": null
  }
}

# CRITICAL RULES
1. x,y are CENTER of entity (not top-left)
2. Canvas center: x=${project.canvas.width / 2}, y=${project.canvas.height / 2}
3. Respond with ONLY valid JSON - no markdown, no explanation
4. Use unique IDs (e.g., "title_text", "play_button", "bg_sprite")
5. For mode "entities": return array []
6. For mode "subScene": return single object {}
7. For mode "full-scene": return array of sub-scenes []
8. Button width: typically 200-400px, height: 80-120px
9. Title text: usually y=300-500 (upper third of screen)
10. Main buttons: usually y=800-1400 (middle/lower screen)

# MOBILE GAME BEST PRACTICES
- Keep buttons large (min 100px height) for touch
- Use high contrast colors for text
- Center important content horizontally (x=${project.canvas.width / 2})
- Leave margins from edges (avoid x < 50 or x > ${project.canvas.width - 50})
- Space elements vertically by at least 150px
- Use clear, action-oriented button text ("PLAY", "START", "CONTINUE")`
  }

  // Call Gemini API
  const callGeminiAPI = async () => {
    if (!geminiKey) throw new Error('Please enter your Gemini API key')

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${buildSystemPrompt()}\n\nUser Request: Generate ${mode === 'entities' ? 'actors' : mode === 'subScene' ? 'a sub-scene' : 'sub-scenes'} for: ${prompt}\n\nCurrent scene: ${scene.name}\nCurrent sub-scene: ${subScene?.name || 'none'}\n${mode === 'entities' ? `Target layer: ${targetLayer}` : ''}\n\nRespond with only the JSON, no explanation.`
          }]
        }]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || `Gemini Status: ${response.status}`)
    }

    const data = await response.json()
    return data.candidates[0].content.parts[0].text
  }

  // Call OpenAI API
  const callOpenAIAPI = async () => {
    if (!openaiKey) throw new Error('Please enter your OpenAI API key')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          {
            role: 'user',
            content: `Generate ${mode === 'entities' ? 'actors' : mode === 'subScene' ? 'a sub-scene' : 'sub-scenes'} for: ${prompt}\n\nCurrent scene: ${scene.name}\nCurrent sub-scene: ${subScene?.name || 'none'}\n${mode === 'entities' ? `Target layer: ${targetLayer}` : ''}`
          }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || `OpenAI Status: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  // Main Generate Handler
  const generate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt describing what to generate')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      let content = ''
      if (provider === 'claude') {
        if (!apiKey) throw new Error('Please enter your Claude API key')
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            system: buildSystemPrompt(),
            messages: [{
              role: 'user',
              content: `Generate ${mode === 'entities' ? 'actors' : mode === 'subScene' ? 'a sub-scene' : 'sub-scenes'} for: ${prompt}\n\nCurrent scene: ${scene.name}\nCurrent sub-scene: ${subScene?.name || 'none'}\n${mode === 'entities' ? `Target layer: ${targetLayer}` : ''}\n\nRespond with only JSON.`
            }]
          })
        })
        if (!response.ok) throw new Error(`Claude Error: ${response.status}`)
        const data = await response.json()
        content = data.content[0].text
      } else if (provider === 'gemini') {
        content = await callGeminiAPI()
      } else if (provider === 'openai') {
        content = await callOpenAIAPI()
      }

      // Parse JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from response. Try a different prompt.')
      }

      const parsed = JSON.parse(jsonMatch[0])
      setResult(parsed)

    } catch (err) {
      console.error('AI API error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Apply the generated result
  const applyResult = () => {
    if (!result) return

    if (mode === 'entities') {
      // result is an array of entities
      onGenerate(Array.isArray(result) ? result : [result], targetLayer)
    } else if (mode === 'subScene') {
      // result is a sub-scene object
      onGenerateSubScene(result)
    } else if (mode === 'full-scene') {
      // result is an array of sub-scenes - add them one by one
      const subScenes = Array.isArray(result) ? result : [result]
      subScenes.forEach(s => onGenerateSubScene(s))
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>✨ AI Content Generator</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Harness LLMs to build your game world
            </p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>



        {/* Mode Selection */}
        <div style={styles.section}>
          <label style={styles.label}>What to Generate</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'entities', label: '🎭 Actors', desc: 'Add to current sub-scene' },
              { id: 'subScene', label: '📍 Sub-Scene', desc: 'Create a new sub-scene' },
              { id: 'full-scene', label: '🌍 Full Scene', desc: 'Complete sequence' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  ...styles.modeButton,
                  background: mode === m.id ? 'rgba(99, 102, 241, 0.3)' : 'rgba(0,0,0,0.2)',
                  borderColor: mode === m.id ? '#6366f1' : 'rgba(255,255,255,0.1)'
                }}
              >
                <div style={{ fontSize: '14px' }}>{m.label}</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Target Layer (for entities mode) */}
        {mode === 'entities' && (
          <div style={styles.section}>
            <label style={styles.label}>Target Layer</label>
            <select
              value={targetLayer}
              onChange={(e) => setTargetLayer(e.target.value)}
              style={styles.input}
            >
              {LAYERS.map(l => (
                <option key={l.name} value={l.name}>{l.icon} {l.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Prompt */}
        <div style={styles.section}>
          <label style={styles.label}>Describe What You Want</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={getPromptPlaceholder()}
            rows={4}
            style={{ ...styles.input, resize: 'vertical' }}
          />
        </div>

        {/* AI Provider Selection */}
        <div style={styles.section}>
          <label style={styles.label}>AI Provider</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'claude', label: '💜 Claude', desc: 'Anthropic' },
              { id: 'gemini', label: '💙 Gemini', desc: 'Google' },
              { id: 'openai', label: '💚 OpenAI', desc: 'GPT-4o' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => saveKey('provider', p.id)}
                style={{
                  ...styles.modeButton,
                  background: provider === p.id ? 'rgba(99, 102, 241, 0.3)' : 'rgba(0,0,0,0.2)',
                  borderColor: provider === p.id ? '#6366f1' : 'rgba(255,255,255,0.1)',
                  padding: '8px 4px'
                }}
              >
                <div style={{ fontSize: '13px' }}>{p.label}</div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Third Party API Keys */}
        <div style={{ ...styles.section, background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.05)' }}>
          <label style={{ ...styles.label, fontSize: '9px', opacity: 0.6 }}>API Keys (Stored Locally)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => saveKey('gemini', e.target.value)}
              placeholder="Gemini API Key"
              style={{ ...styles.input, padding: '6px 10px', fontSize: '11px', borderColor: provider === 'gemini' && !geminiKey ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
            />
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => saveKey('openai', e.target.value)}
              placeholder="OpenAI API Key"
              style={{ ...styles.input, padding: '6px 10px', fontSize: '11px', borderColor: provider === 'openai' && !openaiKey ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
            />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => saveKey('claude', e.target.value)}
              placeholder="Claude API Key"
              style={{ ...styles.input, padding: '6px 10px', fontSize: '11px', borderColor: provider === 'claude' && !apiKey ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
            />
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generate}
          disabled={isLoading || !prompt.trim()}
          style={{
            ...styles.generateButton,
            opacity: isLoading || !prompt.trim() ? 0.5 : 1
          }}
        >
          {isLoading ? '⏳ Generating...' : '✨ Generate'}
        </button>

        {/* Error */}
        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {/* Result Preview */}
        {result && (
          <div style={styles.section}>
            <label style={styles.label}>Generated Result</label>
            <div style={styles.resultPreview}>
              <pre style={{ margin: 0, fontSize: '10px', maxHeight: '200px', overflow: 'auto' }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={applyResult} style={styles.applyButton}>
                ✓ Apply to {mode === 'entities' ? targetLayer : 'Sub-Scene'}
              </button>
              <button onClick={() => setResult(null)} style={styles.cancelButton}>
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Tips */}
        <div style={styles.tips}>
          <h4 style={{ margin: '0 0 8px', fontSize: '12px' }}>💡 Tips</h4>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#94a3b8', lineHeight: '1.6' }}>
            <li>Be specific about positions (center, top-left, etc.)</li>
            <li>Mention colors, sizes, and animations you want</li>
            <li>Reference existing scene/sub-scene names for transitions</li>
            <li>For game-specific entities, describe their behavior</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    width: '560px',
    maxHeight: '90vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'auto',
    padding: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px'
  },
  closeButton: {
    width: '32px',
    height: '32px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '16px',
    cursor: 'pointer'
  },
  section: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '6px',
    textTransform: 'uppercase'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px'
  },
  linkButton: {
    padding: '10px 16px',
    background: 'rgba(99, 102, 241, 0.2)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '8px',
    color: '#a5b4fc',
    fontSize: '12px',
    textDecoration: 'none',
    whiteSpace: 'nowrap'
  },
  modeButton: {
    flex: 1,
    padding: '12px',
    border: '1px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    color: '#fff'
  },
  generateButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '16px'
  },
  error: {
    padding: '12px',
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '12px',
    marginBottom: '16px'
  },
  resultPreview: {
    padding: '12px',
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '8px',
    fontFamily: 'monospace',
    color: '#6ee7b7'
  },
  applyButton: {
    flex: 1,
    padding: '10px 16px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  cancelButton: {
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer'
  },
  tips: {
    padding: '16px',
    background: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: '8px'
  }
}
