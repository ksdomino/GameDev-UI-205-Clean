import { useState, useEffect } from 'react'
import * as api from '../services/api'

/**
 * Project Manager - List, create, and load projects
 * This is the start screen for the GameDev UI
 */
export default function ProjectManager({ backendConnected, onLoadProject, onCreateProject, onRetryConnection }) {
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [newProjectName, setNewProjectName] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  
  // Load projects list
  useEffect(() => {
    if (backendConnected) {
      loadProjects()
    } else {
      setIsLoading(false)
    }
  }, [backendConnected])
  
  const loadProjects = async () => {
    try {
      setIsLoading(true)
      const projectList = await api.listProjects()
      setProjects(projectList)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleCreateProject = () => {
    const name = newProjectName.trim() || 'Untitled Game'
    onCreateProject(name)
    setNewProjectName('')
    setShowNewProject(false)
  }
  
  const handleDeleteProject = async (filename) => {
    if (!confirm(`Delete project "${filename}"? This cannot be undone.`)) return
    
    try {
      await api.deleteProject(filename)
      loadProjects()
    } catch (error) {
      console.error('Failed to delete project:', error)
      alert('Failed to delete project: ' + error.message)
    }
  }
  
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
          margin: '0 auto 24px',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)'
        }}>🎮</div>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '700',
          background: 'linear-gradient(90deg, #fff 0%, #a5b4fc 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px'
        }}>GameDev UI</h1>
        <p style={{ fontSize: '16px', color: '#94a3b8' }}>Create amazing mobile games</p>
      </div>
      
      {/* Server Status */}
      {!backendConnected && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '32px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#fca5a5', marginBottom: '8px' }}>
            Backend Server Not Running
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
            Start the server to save projects to your filesystem:
          </p>
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            padding: '12px 16px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#6ee7b7',
            marginBottom: '16px'
          }}>
            cd SceneEditor && npm run server
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={onRetryConnection}
              style={{
                padding: '10px 20px',
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '8px',
                color: '#a5b4fc',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              🔄 Retry Connection
            </button>
            <button
              onClick={() => onCreateProject('Untitled Game')}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Continue Offline →
            </button>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      {backendConnected && (
        <div style={{
          width: '100%',
          maxWidth: '800px'
        }}>
          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '32px',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => setShowNewProject(true)}
              style={{
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
              }}
            >
              ✨ New Project
            </button>
            <button
              onClick={loadProjects}
              style={{
                padding: '16px 24px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#94a3b8',
                fontSize: '15px',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh
            </button>
          </div>
          
          {/* New Project Modal */}
          {showNewProject && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                Create New Project
              </h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  placeholder="My Awesome Game"
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleCreateProject}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowNewProject(false); setNewProjectName('') }}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Projects List */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📁 Your Projects
              <span style={{ fontSize: '13px', fontWeight: '400', color: '#64748b' }}>
                ({projects.length})
              </span>
            </h2>
            
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📭</div>
                <p style={{ color: '#64748b', marginBottom: '16px' }}>No projects yet</p>
                <button
                  onClick={() => setShowNewProject(true)}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Create Your First Project
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {projects.map((project) => (
                  <div
                    key={project.filename}
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '10px',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => onLoadProject(project.filename)}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                      }}>🎮</div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '600' }}>{project.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {project.sceneCount} scene{project.sceneCount !== 1 ? 's' : ''} • 
                          {project.updatedAt ? ` Updated ${new Date(project.updatedAt).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onLoadProject(project.filename)}
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(99, 102, 241, 0.2)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#a5b4fc',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.filename)}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fca5a5',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Storage Info */}
          <p style={{ 
            textAlign: 'center', 
            fontSize: '12px', 
            color: '#64748b', 
            marginTop: '24px' 
          }}>
            Projects saved to: <code style={{ color: '#94a3b8' }}>SceneEditor/projects/</code>
          </p>
        </div>
      )}
    </div>
  )
}
