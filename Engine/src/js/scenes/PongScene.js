/**
 * PongScene - Main Pong gameplay scene
 * @fileoverview Complete Pong game with ball, paddles, and scoring
 * @context Engine/llms.txt
 *
 * Data files:
 * - /data/actors/Ball.json, PlayerPaddle.json, AIPaddle.json
 * - /data/logic/Ball.logic.json, PlayerPaddle.logic.json, AIPaddle.logic.json
 * - /data/scenes/L1_Scene_1.scene.json
 * - /data/states/L1_Scene_1.states.json
 */
import { Scene } from './Scene.js';
import { Collision } from '../core/Collision.js';

export class PongScene extends Scene {
  constructor() {
    super('L1_Scene_1');

    // Game state
    this.state = 'PLAYING'; // PLAYING, POINT_SCORED, PLAYER_WINS, AI_WINS
    this.stateTimer = 0;

    // Scores
    this.playerScore = 0;
    this.aiScore = 0;
    this.winScore = 5;

    // Ball (from Ball.json)
    this.ball = {
      x: 540,
      y: 960,
      radius: 25,
      directionX: 1,
      directionY: -1,
      speed: 600,
      baseSpeed: 600,
      speedIncrement: 25,
      maxSpeed: 1200
    };

    // Player paddle (from PlayerPaddle.json)
    this.playerPaddle = {
      x: 540,
      y: 1750,
      width: 200,
      height: 30,
      speed: 1000,
      minX: 100,
      maxX: 980
    };

    // AI paddle (from AIPaddle.json)
    this.aiPaddle = {
      x: 540,
      y: 170,
      width: 200,
      height: 30,
      speed: 450,
      difficulty: 0.7,
      minX: 100,
      maxX: 980
    };

    // Court boundaries
    this.courtLeft = 10;
    this.courtRight = 1070;
    this.courtTop = 0;
    this.courtBottom = 1920;

    // Render objects for layers
    this.renderObjects = {};
  }

  async init() {
    // No assets to load for basic Pong (shapes only)
    console.log('[PongScene] Initialized');
  }

  enter() {
    super.enter();
    this.resetGame();
  }

  exit() {
    super.exit();
  }

  resetGame() {
    this.playerScore = 0;
    this.aiScore = 0;
    this.state = 'PLAYING';
    this.resetBall(1); // Start going up toward AI
  }

  resetBall(directionY = null) {
    this.ball.x = 540;
    this.ball.y = 960;
    this.ball.speed = this.ball.baseSpeed;

    // Random horizontal direction
    this.ball.directionX = Math.random() > 0.5 ? 1 : -1;

    // Use provided direction or alternate based on who scored
    if (directionY !== null) {
      this.ball.directionY = directionY;
    }

    // Add slight angle variation
    this.ball.directionX += (Math.random() - 0.5) * 0.5;

    // Normalize direction
    const mag = Math.sqrt(this.ball.directionX ** 2 + this.ball.directionY ** 2);
    this.ball.directionX /= mag;
    this.ball.directionY /= mag;
  }

  populateLayers() {
    // Background
    this.renderObjects.background = {
      render: (ctx) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1080, 1920);
      }
    };
    this.layerManager.addToLayer(this.renderObjects.background, 'BG_FAR');

    // Center line (dashed)
    this.renderObjects.centerLine = {
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
    this.layerManager.addToLayer(this.renderObjects.centerLine, 'SHAPES');

    // Side walls
    this.renderObjects.walls = {
      render: (ctx) => {
        ctx.fillStyle = '#334155';
        // Left wall
        ctx.fillRect(0, 0, 10, 1920);
        // Right wall
        ctx.fillRect(1070, 0, 10, 1920);
      }
    };
    this.layerManager.addToLayer(this.renderObjects.walls, 'SHAPES');

    // Ball
    this.renderObjects.ball = {
      ball: this.ball,
      render: (ctx) => {
        if (this.state === 'PLAYER_WINS' || this.state === 'AI_WINS') return;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    this.layerManager.addToLayer(this.renderObjects.ball, 'SPRITES');

    // Player paddle (green)
    this.renderObjects.playerPaddle = {
      render: (ctx) => {
        ctx.fillStyle = '#4ade80';
        const p = this.playerPaddle;
        ctx.fillRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
      }
    };
    this.layerManager.addToLayer(this.renderObjects.playerPaddle, 'SPRITES');

    // AI paddle (red)
    this.renderObjects.aiPaddle = {
      render: (ctx) => {
        ctx.fillStyle = '#f87171';
        const p = this.aiPaddle;
        ctx.fillRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
      }
    };
    this.layerManager.addToLayer(this.renderObjects.aiPaddle, 'SPRITES');

    // Score display (background, semi-transparent)
    this.renderObjects.scoreDisplay = {
      render: (ctx) => {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${this.aiScore} - ${this.playerScore}`, 540, 960);
        ctx.restore();
      }
    };
    this.layerManager.addToLayer(this.renderObjects.scoreDisplay, 'TEXT');

    // Game over / win text
    this.renderObjects.gameOverText = {
      render: (ctx) => {
        if (this.state !== 'PLAYER_WINS' && this.state !== 'AI_WINS') return;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Main text
        ctx.font = 'bold 96px Arial';
        if (this.state === 'PLAYER_WINS') {
          ctx.fillStyle = '#4ade80';
          ctx.fillText('YOU WIN!', 540, 800);
        } else {
          ctx.fillStyle = '#f87171';
          ctx.fillText('GAME OVER', 540, 800);
        }

        // Final score
        ctx.font = 'bold 72px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${this.aiScore} - ${this.playerScore}`, 540, 960);

        // Tap to continue
        ctx.font = '36px Arial';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Tap to play again', 540, 1100);

        ctx.restore();
      }
    };
    this.layerManager.addToLayer(this.renderObjects.gameOverText, 'UI_BUTTONS');
  }

  update(deltaTime) {
    if (!this.isActive) return;

    switch (this.state) {
      case 'PLAYING':
        this.updatePlaying(deltaTime);
        break;
      case 'POINT_SCORED':
        this.updatePointScored(deltaTime);
        break;
      case 'PLAYER_WINS':
      case 'AI_WINS':
        this.updateGameOver(deltaTime);
        break;
    }
  }

  updatePlaying(deltaTime) {
    // Update player paddle (follows touch/mouse)
    this.updatePlayerPaddle(deltaTime);

    // Update AI paddle (tracks ball)
    this.updateAIPaddle(deltaTime);

    // Update ball
    this.updateBall(deltaTime);

    // Check collisions
    this.checkCollisions();

    // Check scoring
    this.checkScoring();
  }

  updatePlayerPaddle(deltaTime) {
    const input = this.inputHandler;

    // Follow touch/mouse X position directly
    if (input.mouse.down || input.touches.length > 0) {
      const targetX = input.mouse.x;

      // Smooth movement toward target
      const diff = targetX - this.playerPaddle.x;
      const maxMove = this.playerPaddle.speed * deltaTime;

      if (Math.abs(diff) > maxMove) {
        this.playerPaddle.x += Math.sign(diff) * maxMove;
      } else {
        this.playerPaddle.x = targetX;
      }
    }

    // Clamp to court bounds
    this.playerPaddle.x = Math.max(this.playerPaddle.minX,
                                    Math.min(this.playerPaddle.maxX, this.playerPaddle.x));
  }

  updateAIPaddle(deltaTime) {
    // AI tracks ball X position with difficulty-based reaction
    const targetX = this.ball.x;
    const diff = targetX - this.aiPaddle.x;

    // Only move if ball is in AI's half or moving toward AI
    const shouldTrack = this.ball.y < 960 || this.ball.directionY < 0;

    if (shouldTrack && Math.abs(diff) > 10) {
      const moveSpeed = this.aiPaddle.speed * this.aiPaddle.difficulty * deltaTime;

      if (Math.abs(diff) > moveSpeed) {
        this.aiPaddle.x += Math.sign(diff) * moveSpeed;
      } else {
        this.aiPaddle.x += diff * this.aiPaddle.difficulty;
      }
    }

    // Clamp to court bounds
    this.aiPaddle.x = Math.max(this.aiPaddle.minX,
                                Math.min(this.aiPaddle.maxX, this.aiPaddle.x));
  }

  updateBall(deltaTime) {
    // Move ball
    this.ball.x += this.ball.directionX * this.ball.speed * deltaTime;
    this.ball.y += this.ball.directionY * this.ball.speed * deltaTime;

    // Wall bounce (left/right)
    if (this.ball.x - this.ball.radius < this.courtLeft) {
      this.ball.x = this.courtLeft + this.ball.radius;
      this.ball.directionX *= -1;
      this.playSound('wall');
    }
    if (this.ball.x + this.ball.radius > this.courtRight) {
      this.ball.x = this.courtRight - this.ball.radius;
      this.ball.directionX *= -1;
      this.playSound('wall');
    }
  }

  checkCollisions() {
    // Ball vs Player Paddle
    if (this.ball.directionY > 0) { // Ball moving down
      const paddleRect = {
        x: this.playerPaddle.x - this.playerPaddle.width / 2,
        y: this.playerPaddle.y - this.playerPaddle.height / 2,
        width: this.playerPaddle.width,
        height: this.playerPaddle.height
      };

      if (Collision.circleRect(this.ball, paddleRect)) {
        this.handlePaddleCollision(this.playerPaddle);
      }
    }

    // Ball vs AI Paddle
    if (this.ball.directionY < 0) { // Ball moving up
      const paddleRect = {
        x: this.aiPaddle.x - this.aiPaddle.width / 2,
        y: this.aiPaddle.y - this.aiPaddle.height / 2,
        width: this.aiPaddle.width,
        height: this.aiPaddle.height
      };

      if (Collision.circleRect(this.ball, paddleRect)) {
        this.handlePaddleCollision(this.aiPaddle);
      }
    }
  }

  handlePaddleCollision(paddle) {
    // Reverse Y direction
    this.ball.directionY *= -1;

    // Add angle based on where ball hit paddle
    const hitOffset = (this.ball.x - paddle.x) / (paddle.width / 2);
    this.ball.directionX += hitOffset * 0.5;

    // Normalize direction vector
    const mag = Math.sqrt(this.ball.directionX ** 2 + this.ball.directionY ** 2);
    this.ball.directionX /= mag;
    this.ball.directionY /= mag;

    // Increase speed
    this.ball.speed = Math.min(this.ball.speed + this.ball.speedIncrement, this.ball.maxSpeed);

    // Push ball out of paddle
    if (paddle === this.playerPaddle) {
      this.ball.y = paddle.y - paddle.height / 2 - this.ball.radius;
    } else {
      this.ball.y = paddle.y + paddle.height / 2 + this.ball.radius;
    }

    this.playSound('paddle');
  }

  checkScoring() {
    // Ball passed player (bottom)
    if (this.ball.y - this.ball.radius > this.courtBottom) {
      this.aiScore++;
      this.playSound('score');
      this.onPointScored();
    }

    // Ball passed AI (top)
    if (this.ball.y + this.ball.radius < this.courtTop) {
      this.playerScore++;
      this.playSound('score');
      this.onPointScored();
    }
  }

  onPointScored() {
    // Check for win
    if (this.playerScore >= this.winScore) {
      this.state = 'PLAYER_WINS';
      this.playSound('win');
      return;
    }
    if (this.aiScore >= this.winScore) {
      this.state = 'AI_WINS';
      this.playSound('lose');
      return;
    }

    // Brief pause before next round
    this.state = 'POINT_SCORED';
    this.stateTimer = 0;
  }

  updatePointScored(deltaTime) {
    this.stateTimer += deltaTime;

    if (this.stateTimer >= 1.0) {
      // Reset ball, direction toward whoever just scored
      const dirY = this.ball.y > 960 ? -1 : 1; // Send toward scorer
      this.resetBall(dirY);
      this.state = 'PLAYING';
    }
  }

  updateGameOver(deltaTime) {
    // Wait for tap to restart
    if (this.inputHandler.mouse.pressed) {
      this.resetGame();
    }
  }

  playSound(type) {
    const audio = this.engine?.audioManager;
    if (!audio) return;

    switch (type) {
      case 'paddle':
        audio.playBeep(440, 0.05, 'square');
        break;
      case 'wall':
        audio.playBeep(220, 0.05, 'square');
        break;
      case 'score':
        audio.playBeep(330, 0.15, 'sine');
        break;
      case 'win':
        audio.playBeep(523, 0.1, 'sine');
        setTimeout(() => audio.playBeep(659, 0.1, 'sine'), 100);
        setTimeout(() => audio.playBeep(784, 0.2, 'sine'), 200);
        break;
      case 'lose':
        audio.playBeep(330, 0.1, 'sine');
        setTimeout(() => audio.playBeep(262, 0.1, 'sine'), 100);
        setTimeout(() => audio.playBeep(196, 0.2, 'sine'), 200);
        break;
    }
  }
}
