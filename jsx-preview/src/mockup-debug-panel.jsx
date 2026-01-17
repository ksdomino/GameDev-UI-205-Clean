import React, { useState, useEffect } from 'react';

// Debug Panel Mockup - 1920x1080 Landscape Layout
export default function DebugPanelMockup() {
  const [fps, setFps] = useState(60);
  const [selectedLayer, setSelectedLayer] = useState('SPRITES');
  const [expandedEntity, setExpandedEntity] = useState('player');
  const [entityProps, setEntityProps] = useState({ x: 240, y: 360, alpha: 1 });
  
  // Simulate FPS fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setFps(Math.floor(58 + Math.random() * 4));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  
  const fpsHistory = Array(30).fill(0).map((_, i) => 55 + Math.sin(i * 0.3) * 5 + Math.random() * 3);
  
  const layers = [
    { name: 'BG_FAR', count: 2 },
    { name: 'BG_NEAR', count: 0 },
    { name: 'VIDEO_IMAGE', count: 0 },
    { name: 'SHAPES', count: 12, warning: true },
    { name: 'SPRITES', count: 28, warning: true },
    { name: 'TEXT', count: 3 },
    { name: 'UI_BUTTONS', count: 2 }
  ];
  
  const entities = [
    { name: 'player', type: 'Sprite', x: 240, y: 360 },
    { name: 'enemy_01', type: 'Sprite', x: 580, y: 200 },
    { name: 'enemy_02', type: 'Sprite', x: 120, y: 450 },
    { name: 'bullet_pool', type: 'ObjectPool', count: 20 }
  ];

  return (
    <div style={{
      width: '1920px',
      height: '1080px',
      background: 'linear-gradient(180deg, #0c0c1d 0%, #1a1a2e 100%)',
      fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
      color: '#e2e8f0',
      display: 'grid',
      gridTemplateColumns: '1fr 420px',
      gap: '0',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Left Panel - Debug Info (1500px) */}
      <div style={{
        padding: '20px 24px',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: 'auto auto 1fr',
        gap: '16px',
        alignContent: 'start'
      }}>
        {/* Header - spans all columns */}
        <div style={{
          gridColumn: 'span 3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)'
            }}>🐛</div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#fff' }}>Debug Panel</h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Real-time Game Inspector</p>
            </div>
          </div>
          
          {/* Scene Selector in header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>SCENE:</label>
            <select style={{
              padding: '10px 16px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              minWidth: '180px'
            }}>
              <option>QuizIntroScene</option>
              <option>TitleScene</option>
              <option>GameScene</option>
              <option>GameOverScene</option>
            </select>
          </div>
        </div>
        
        {/* Performance Section - Column 1 */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px' }}>📊</span>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Performance</span>
          </div>
          
          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              borderRadius: '8px',
              padding: '10px',
              textAlign: 'center',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#10b981' }}>{fps}</div>
              <div style={{ fontSize: '10px', color: '#6ee7b7' }}>FPS</div>
            </div>
            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              borderRadius: '8px',
              padding: '10px',
              textAlign: 'center',
              border: '1px solid rgba(245, 158, 11, 0.2)'
            }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#f59e0b' }}>45</div>
              <div style={{ fontSize: '10px', color: '#fcd34d' }}>Entities</div>
            </div>
            <div style={{
              background: 'rgba(99, 102, 241, 0.15)',
              borderRadius: '8px',
              padding: '10px',
              textAlign: 'center',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#818cf8' }}>23</div>
              <div style={{ fontSize: '10px', color: '#a5b4fc' }}>MB</div>
            </div>
          </div>
          
          {/* FPS Graph */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '6px',
            padding: '8px',
            height: '50px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '2px'
          }}>
            {fpsHistory.map((v, i) => (
              <div key={i} style={{
                flex: 1,
                height: `${(v / 60) * 100}%`,
                background: v > 55 
                  ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
                  : v > 45
                    ? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)',
                borderRadius: '2px',
                transition: 'height 0.2s'
              }} />
            ))}
          </div>
        </div>
        
        {/* Layers Section - Column 2 */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px' }}>🎬</span>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Layers</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {layers.map(layer => (
              <div
                key={layer.name}
                onClick={() => setSelectedLayer(layer.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  background: selectedLayer === layer.name 
                    ? 'rgba(99, 102, 241, 0.2)' 
                    : 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: selectedLayer === layer.name
                    ? '1px solid rgba(99, 102, 241, 0.4)'
                    : '1px solid transparent',
                  transition: 'all 0.15s'
                }}
              >
                <input 
                  type="checkbox" 
                  defaultChecked 
                  style={{ width: '14px', height: '14px' }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '11px',
                  flex: 1,
                  color: selectedLayer === layer.name ? '#fff' : '#94a3b8'
                }}>
                  {layer.name}
                </span>
                <span style={{
                  fontSize: '10px',
                  color: layer.warning ? '#f59e0b' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}>
                  ({layer.count})
                  {layer.warning && <span>⚠️</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Assets Section - Column 3 */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px' }}>📦</span>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Loaded Assets</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { icon: '🖼️', name: 'player.png', info: '512×512', color: '#3b82f6' },
              { icon: '🖼️', name: 'enemies.png', info: '1024×1024', color: '#8b5cf6' },
              { icon: '🔊', name: 'bgm.mp3', info: '3:24', color: '#10b981', playing: true }
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
                  width: '28px',
                  height: '28px',
                  background: `${asset.color}30`,
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>{asset.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.name}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{asset.info}</div>
                </div>
                <button style={{
                  padding: '4px 8px',
                  background: asset.playing ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: asset.playing ? '#fca5a5' : '#94a3b8',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}>
                  {asset.playing ? 'Stop' : 'Unload'}
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Entities Section - spans all 3 columns */}
        <div style={{
          gridColumn: 'span 3',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px' }}>🎮</span>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>
              Entities <span style={{ color: '#64748b', fontWeight: '400' }}>({selectedLayer})</span>
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {entities.map(entity => (
              <div key={entity.name} style={{
                background: expandedEntity === entity.name ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                border: expandedEntity === entity.name ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                overflow: 'hidden'
              }}>
                <div
                  onClick={() => setExpandedEntity(expandedEntity === entity.name ? null : entity.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '10px', color: '#64748b' }}>
                    {expandedEntity === entity.name ? '▼' : '▶'}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '500', flex: 1 }}>{entity.name}</span>
                  <span style={{ 
                    fontSize: '10px', 
                    color: '#818cf8',
                    background: 'rgba(99, 102, 241, 0.2)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {entity.type}
                  </span>
                </div>
                
                {expandedEntity === entity.name && (
                  <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    padding: '10px 12px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px'
                  }}>
                    <div>
                      <label style={{ fontSize: '9px', color: '#64748b' }}>x</label>
                      <input
                        type="number"
                        value={entityProps.x}
                        onChange={(e) => setEntityProps({...entityProps, x: +e.target.value})}
                        style={{
                          display: 'block',
                          width: '100%',
                          marginTop: '2px',
                          padding: '6px 8px',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '11px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '9px', color: '#64748b' }}>y</label>
                      <input
                        type="number"
                        value={entityProps.y}
                        onChange={(e) => setEntityProps({...entityProps, y: +e.target.value})}
                        style={{
                          display: 'block',
                          width: '100%',
                          marginTop: '2px',
                          padding: '6px 8px',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '11px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '9px', color: '#64748b' }}>rotation</label>
                      <input
                        type="number"
                        defaultValue="0"
                        style={{
                          display: 'block',
                          width: '100%',
                          marginTop: '2px',
                          padding: '6px 8px',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '11px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '9px', color: '#64748b' }}>alpha</label>
                      <input
                        type="number"
                        step="0.1"
                        value={entityProps.alpha}
                        onChange={(e) => setEntityProps({...entityProps, alpha: +e.target.value})}
                        style={{
                          display: 'block',
                          width: '100%',
                          marginTop: '2px',
                          padding: '6px 8px',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '11px'
                        }}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '4px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                        <input type="checkbox" defaultChecked /> visible
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                        <input type="checkbox" defaultChecked /> active
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Right Panel - Game Preview (420px) */}
      <div style={{
        background: '#0a0a14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ marginBottom: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500', letterSpacing: '0.5px' }}>
            GAME PREVIEW
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            480 × 720 (half scale)
          </div>
        </div>
        
        {/* Mock Game Canvas - fits in 420px width */}
        <div style={{
          width: '360px',
          height: '540px',
          background: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)',
          borderRadius: '12px',
          border: '2px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Mock game content */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎮</div>
            <div style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#fff',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)'
            }}>Quiz Game</div>
            <div style={{
              fontSize: '13px',
              color: '#94a3b8',
              marginTop: '6px'
            }}>TITLE_SPLASH</div>
          </div>
          
          {/* Mock player sprite indicator */}
          <div style={{
            position: 'absolute',
            left: `${(entityProps.x / 1080) * 360}px`,
            top: `${(entityProps.y / 1920) * 540}px`,
            width: '36px',
            height: '36px',
            border: '2px dashed #10b981',
            borderRadius: '4px',
            transition: 'all 0.2s'
          }}>
            <div style={{
              position: 'absolute',
              top: '-18px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '8px',
              color: '#10b981',
              whiteSpace: 'nowrap',
              background: 'rgba(0,0,0,0.8)',
              padding: '2px 5px',
              borderRadius: '3px'
            }}>player</div>
          </div>
        </div>
        
        <button style={{
          marginTop: '16px',
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '6px',
          color: '#94a3b8',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>👁️</span> Toggle Preview
        </button>
        
        {/* Info box */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          maxWidth: '340px'
        }}>
          <div style={{ fontSize: '12px', color: '#fcd34d', fontWeight: '600', marginBottom: '4px' }}>
            💡 Live Editing
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
            Change entity properties on the left panel and watch them update in real-time!
          </div>
        </div>
      </div>
    </div>
  );
}
