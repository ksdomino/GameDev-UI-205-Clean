/**
 * PongTitleScene - Title screen for Pong game
 * @fileoverview Title screen with Play button
 * @context Engine/llms.txt
 *
 * Data file: /data/scenes/Title_Scene_1.scene.json
 */
import { Scene } from './Scene.js';
import { Button } from '../entities/Button.js';

export class PongTitleScene extends Scene {
  constructor() {
    super('Title_Scene_1');
    this.playButton = null;
  }

  async init() {
    console.log('[PongTitleScene] Initialized');
  }

  enter() {
    super.enter();
  }

  exit() {
    super.exit();
  }

  populateLayers() {
    // Background
    const background = {
      render: (ctx) => {
        // Dark gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
        gradient.addColorStop(0, '#1e3a5f');
        gradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1080, 1920);
      }
    };
    this.layerManager.addToLayer(background, 'BG_FAR');

    // Decorative center line
    const centerLine = {
      render: (ctx) => {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 4;
        ctx.setLineDash([40, 30]);
        ctx.beginPath();
        ctx.moveTo(0, 960);
        ctx.lineTo(1080, 960);
        ctx.stroke();
        ctx.restore();
      }
    };
    this.layerManager.addToLayer(centerLine, 'SHAPES');

    // Title text
    const titleText = {
      render: (ctx) => {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 144px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PONG', 540, 600);
        ctx.restore();
      }
    };
    this.layerManager.addToLayer(titleText, 'TEXT');

    // Subtitle
    const subtitleText = {
      render: (ctx) => {
        ctx.save();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Tap to move your paddle', 540, 750);
        ctx.restore();
      }
    };
    this.layerManager.addToLayer(subtitleText, 'TEXT');

    // Play button
    this.playButton = new Button(
      340,  // x (top-left, will center at 540)
      1140, // y
      400,  // width
      120,  // height
      'PLAY',
      '#4ade80',
      1,
      () => this.onPlayPressed()
    );
    this.layerManager.addToLayer(this.playButton, 'UI_BUTTONS');

    // Instructions
    const instructions = {
      render: (ctx) => {
        ctx.save();
        ctx.fillStyle = '#64748b';
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('First to 5 wins!', 540, 1400);
        ctx.restore();
      }
    };
    this.layerManager.addToLayer(instructions, 'TEXT');
  }

  update(deltaTime) {
    if (!this.isActive) return;

    // Check for button click
    if (this.inputHandler.mouse.pressed) {
      const { x, y } = this.inputHandler.mouse;
      if (this.playButton) {
        this.playButton.checkClick(x, y);
      }
    }
  }

  onPlayPressed() {
    // Play sound
    if (this.engine?.audioManager) {
      this.engine.audioManager.playBeep(440, 0.1, 'sine');
    }

    // Switch to game scene
    this.sceneManager.switchTo('L1_Scene_1');
  }
}
