#!/usr/bin/env node
/**
 * GameDev Studio - Server Status Checker
 * Shows the status of all required servers
 */

import http from 'http';

const SERVERS = [
  { name: 'Engine', port: 5174, url: 'http://localhost:5174', description: 'Game Engine (serves assets)' },
  { name: 'Editor', port: 5175, url: 'http://localhost:5175', description: 'Scene Editor UI' },
  { name: 'Backend', port: 5176, url: 'http://localhost:5176/api/health', description: 'API & File System' }
];

async function checkServer(server) {
  return new Promise((resolve) => {
    const req = http.get(server.url, { timeout: 2000 }, (res) => {
      resolve({ ...server, status: 'running', code: res.statusCode });
    });
    
    req.on('error', () => {
      resolve({ ...server, status: 'stopped' });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ ...server, status: 'timeout' });
    });
  });
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║           🎮 GameDev Studio - Server Status               ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  
  const results = await Promise.all(SERVERS.map(checkServer));
  
  let allRunning = true;
  
  for (const result of results) {
    const icon = result.status === 'running' ? '✅' : '❌';
    const statusText = result.status === 'running' ? 'RUNNING' : 'STOPPED';
    const portPad = result.port.toString().padEnd(5);
    
    console.log(`║  ${icon} ${result.name.padEnd(8)} │ :${portPad} │ ${statusText.padEnd(7)} │ ${result.description.padEnd(22)} ║`);
    
    if (result.status !== 'running') allRunning = false;
  }
  
  console.log('╠═══════════════════════════════════════════════════════════╣');
  
  if (allRunning) {
    console.log('║  🚀 All servers running! Open http://localhost:5175       ║');
  } else {
    console.log('║  ⚠️  Some servers not running. Run: npm start              ║');
  }
  
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  // Commands reference
  console.log('Commands:');
  console.log('  npm start   - Start all servers (in one terminal)');
  console.log('  npm stop    - Stop all servers');
  console.log('  npm status  - Check server status\n');
}

main();
