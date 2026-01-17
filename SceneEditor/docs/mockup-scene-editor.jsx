import React, { useState } from 'react';

// Scene Editor Mockup - 1920x1080 Landscape Layout
export default function SceneEditorMockup() {
  const [selectedState, setSelectedState] = useState(0);
  const [sceneName, setSceneName] = useState('QuizIntroScene');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const states = [
    { name: 'TITLE_SPLASH', start: 0, duration: 2, color: '#6366f1' },
    { name: 'INSTRUCTIONS', start: 2, duration: 3, color: '#8b5cf6' },
    { name: 'COUNTDOWN', start: 5, duration: 3, color: '#a855f7' }
  ];
  
  const layers = ['BG_FAR', 'BG_NEAR', 'VIDEO_IMAGE', 'SHAPES', 'SPRITES', 'TEXT', 'UI_BUTTONS'];
  
  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 2000);
  };

  return (
    <div style={{
      width: '1920px',
      height: '1080px',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
      color: '#e2e8f0',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Ambient glow effects */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      
      {/* Success Toast */}
      {showSuccess && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '14px 20px',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 100,
          animation: 'slideIn 0.3s ease'
        }}>
          <span style={{ fontSize: '18px' }}>✅</span>
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>Scene Generated!</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>QuizIntroScene.json saved to /Engine/src/js/scenes/</div>
          </div>
        </div>
      )}
      
      {/* Header Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
          }}>🎬</div>
          <div>
            <h1 style={{
              fontSize: '22px',
              fontWeight: '700',
              margin: 0,
              background: 'linear-gradient(90deg, #fff 0%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Canvas Engine Scene Editor</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              AI-Powered Game Development Tool
            </p>
          </div>
        </div>
        
        {/* Scene Name Input - in header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>SCENE:</label>
          <input
            type="text"
            value={sceneName}
            onChange={(e) => setSceneName(e.target.value)}
            style={{
              padding: '10px 16px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              fontFamily: '"SF Mono", "Fira Code", monospace',
              width: '220px'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{
            padding: '10px 18px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#e2e8f0',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)'
          }}>📂 Load Scene</button>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              padding: '10px 20px',
              background: isGenerating 
                ? 'rgba(99, 102, 241, 0.5)' 
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: isGenerating ? 'wait' : 'pointer',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
            {isGenerating ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚙️</span>
                Generating...
              </>
            ) : (
              <>✨ Generate Scene</>
            )}
          </button>
        </div>
      </div>
      
      {/* Timeline Section */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        zIndex: 10,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>📅</span>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Timeline</span>
          </div>
          <button style={{
            padding: '6px 14px',
            background: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '6px',
            color: '#a5b4fc',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer'
          }}>+ Add State</button>
        </div>
        
        {/* Time ruler */}
        <div style={{
          display: 'flex',
          marginBottom: '8px',
          paddingLeft: '4px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '6px'
        }}>
          {[0,1,2,3,4,5,6,7,8,9,10].map(t => (
            <div key={t} style={{
              flex: 1,
              fontSize: '10px',
              color: '#64748b',
              fontWeight: '500',
              fontFamily: 'monospace'
            }}>{t}s</div>
          ))}
        </div>
        
        {/* State bars */}
        <div style={{ position: 'relative', height: '55px' }}>
          {states.map((state, i) => (
            <div
              key={i}
              onClick={() => setSelectedState(i)}
              style={{
                position: 'absolute',
                left: `${(state.start / 10) * 100}%`,
                width: `${(state.duration / 10) * 100}%`,
                height: '50px',
                background: selectedState === i 
                  ? `linear-gradient(135deg, ${state.color} 0%, ${state.color}dd 100%)`
                  : `linear-gradient(135deg, ${state.color}99 0%, ${state.color}66 100%)`,
                borderRadius: '8px',
                padding: '10px 14px',
                cursor: 'pointer',
                border: selectedState === i ? '2px solid #fff' : '2px solid transparent',
                boxShadow: selectedState === i ? `0 4px 20px ${state.color}66` : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '600' }}>{state.name}</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>
                {state.start}s - {state.start + state.duration}s
              </div>
              {/* Resize handle */}
              <div style={{
                position: 'absolute',
                right: '0',
                top: '0',
                bottom: '0',
                width: '10px',
                cursor: 'ew-resize',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '0 8px 8px 0'
              }} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Content - Three columns */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr', 
        gap: '16px', 
        position: 'relative', 
        zIndex: 10,
        flex: 1,
        minHeight: 0
      }}>
        
        {/* State Editor - Column 1 */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '16px' }}>⚙️</span>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>State: {states[selectedState].name}</span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500' }}>NAME</label>
              <input
                value={states[selectedState].name}
                readOnly
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: '4px',
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'monospace'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500' }}>DURATION</label>
              <input
                value={`${states[selectedState].duration}s`}
                readOnly
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: '4px',
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>
          
          <div style={{ marginTop: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}>
              <input type="checkbox" defaultChecked={selectedState > 0} style={{ width: '16px', height: '16px' }} />
              <span style={{ fontSize: '12px' }}>Clear layers when entering</span>
            </label>
          </div>
          
          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500' }}>TRANSITION</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              {['Timer', 'Button', 'Input'].map((t, i) => (
                <label key={t} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  background: i === 0 ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: i === 0 ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                  fontSize: '12px'
                }}>
                  <input type="radio" name="transition" defaultChecked={i === 0} />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Transition details */}
          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500' }}>NEXT STATE/SCENE</label>
            <select style={{
              display: 'block',
              width: '100%',
              marginTop: '4px',
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '13px'
            }}>
              <option>→ INSTRUCTIONS (next state)</option>
              <option>→ GameScene (switch scene)</option>
            </select>
          </div>
        </div>
        
        {/* Layer Assignment - Column 2 */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '16px' }}>🎬</span>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Layer Assignment</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'auto', flex: 1 }}>
            {layers.map((layer, i) => (
              <div key={layer} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                background: i === 0 && selectedState === 0 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0,0,0,0.2)',
                borderRadius: '6px',
                border: i === 0 && selectedState === 0 ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent'
              }}>
                <span style={{ 
                  fontSize: '10px', 
                  color: '#94a3b8', 
                  width: '80px',
                  fontFamily: 'monospace',
                  flexShrink: 0
                }}>{layer}</span>
                <select style={{
                  flex: 1,
                  padding: '6px 10px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '5px',
                  color: '#fff',
                  fontSize: '12px',
                  minWidth: 0
                }}>
                  <option>None</option>
                  {i === 0 && selectedState === 0 && <option selected>bg_logo.png</option>}
                  {i === 5 && selectedState === 1 && <option selected>instruction_text.png</option>}
                  {i === 6 && selectedState === 1 && <option selected>Button: "Start Quiz"</option>}
                </select>
              </div>
            ))}
          </div>
        </div>
        
        {/* Assets - Column 3 */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>📦</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Assets</span>
            </div>
            <button style={{
              padding: '5px 12px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '5px',
              color: '#6ee7b7',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer'
            }}>↑ Upload</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto', flex: 1 }}>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>🖼️ IMAGES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { name: 'bg_logo.png', size: '1080×1920', po2: true },
                  { name: 'instruction_text.png', size: '900×400', po2: false },
                  { name: 'player.png', size: '512×512', po2: true }
                ].map(asset => (
                  <div key={asset.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px'
                  }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      flexShrink: 0
                    }}>🖼️</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</div>
                      <div style={{ fontSize: '10px', color: asset.po2 ? '#64748b' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {asset.size}
                        {!asset.po2 && <span title="Not Power of Two">⚠️</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>🔊 AUDIO</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { name: 'click.mp3', duration: '0.3s' },
                  { name: 'bgm.mp3', duration: '3:24' }
                ].map(asset => (
                  <div key={asset.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px'
                  }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      flexShrink: 0
                    }}>🔊</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: '500' }}>{asset.name}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{asset.duration}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer info */}
      <div style={{
        padding: '12px 20px',
        background: 'rgba(99, 102, 241, 0.1)',
        borderRadius: '10px',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        position: 'relative',
        zIndex: 10,
        flexShrink: 0
      }}>
        <span style={{ fontSize: '22px' }}>🤖</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#a5b4fc' }}>
            Powered by Claude AI • JSON-Driven Architecture
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            Click "Generate Scene" to create a Scene JSON config. Cost: ~$0.03 per scene.
          </div>
        </div>
        <div style={{ 
          fontSize: '11px', 
          color: '#6ee7b7',
          background: 'rgba(16, 185, 129, 0.2)',
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          Target: 1920×1080 Landscape
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
