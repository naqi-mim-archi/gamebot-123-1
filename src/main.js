const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const GRAVITY = 0.25;
const JUMP_STRENGTH = -5.5;
const PIPE_SPEED = 2.5;
const PIPE_SPAWN_RATE = 1500; // ms
const PIPE_WIDTH = 60;
const PIPE_GAP = 160;
const BIRD_SIZE = 34;

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let highScore = localStorage.getItem('flappyHighScore') || 0;
let lastPipeTime = 0;
let pipes = [];
let particles = [];
let shakeTimer = 0;

// Bird Object
const bird = {
    x: 50,
    y: 0,
    vy: 0,
    radius: 14,
    rotation: 0,
    reset() {
        this.y = canvas.height / 2;
        this.vy = 0;
        this.rotation = 0;
        this.x = canvas.width * 0.25;
    },
    update() {
        if (gameState === 'PLAYING' || gameState === 'GAMEOVER') {
            this.vy += GRAVITY;
            this.y += this.vy;
            
            // Rotation effect
            let targetRotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.vy / 10)));
            this.rotation += (targetRotation - this.rotation) * 0.1;
        }

        if (gameState === 'PLAYING') {
            if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
                triggerGameOver();
            }
        }
    },
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Draw Bird Body
        ctx.fillStyle = '#f4d03f';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(6, -4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(8, -4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(18, 4);
        ctx.lineTo(10, 8);
        ctx.fill();

        ctx.restore();
    },
    jump() {
        if (gameState === 'PLAYING') {
            this.vy = JUMP_STRENGTH;
            spawnParticles(this.x, this.y, '#fff', 5);
        }
    }
};

function spawnPipe() {
    const minPipeHeight = 50;
    const maxPipeHeight = canvas.height - PIPE_GAP - minPipeHeight;
    const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
    
    pipes.push({
        x: canvas.width,
        top: topHeight,
        passed: false
    });
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1,
            color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1;
}

function triggerGameOver() {
    if (gameState === 'GAMEOVER') return;
    gameState = 'GAMEOVER';
    shakeTimer = 20;
    spawnParticles(bird.x, bird.y, '#f1c40f', 20);
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyHighScore', highScore);
    }
}

function resetGame() {
    gameState = 'PLAYING';
    score = 0;
    pipes = [];
    particles = [];
    bird.reset();
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    bird.reset();
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') handleInput();
});
window.addEventListener('mousedown', handleInput);
window.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
}, { passive: false });

function handleInput() {
    if (gameState === 'START') resetGame();
    else if (gameState === 'PLAYING') bird.jump();
    else if (gameState === 'GAMEOVER') resetGame();
}

function update(time) {
    if (shakeTimer > 0) shakeTimer--;

    if (gameState === 'PLAYING') {
        if (time - lastPipeTime > PIPE_SPAWN_RATE) {
            spawnPipe();
            lastPipeTime = time;
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            const p = pipes[i];
            p.x -= PIPE_SPEED;

            // Collision detection
            if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + PIPE_WIDTH) {
                if (bird.y - bird.radius < p.top || bird.y + bird.radius > p.top + PIPE_GAP) {
                    triggerGameOver();
                }
            }

            // Score counting
            if (!p.passed && p.x + PIPE_WIDTH < bird.x) {
                p.passed = true;
                score++;
            }

            // Remove offscreen pipes
            if (p.x + PIPE_WIDTH < 0) pipes.splice(i, 1);
        }
    }

    bird.update();
    updateParticles();
}

function draw() {
    ctx.save();
    if (shakeTimer > 0) {
        ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5);
    }

    // Background
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pipes
    pipes.forEach(p => {
        ctx.fillStyle = '#2ecc71';
        // Top pipe
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.top);
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 4;
        ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.top);
        
        // Bottom pipe
        ctx.fillRect(p.x, p.top + PIPE_GAP, PIPE_WIDTH, canvas.height - (p.top + PIPE_GAP));
        ctx.strokeRect(p.x, p.top + PIPE_GAP, PIPE_WIDTH, canvas.height - (p.top + PIPE_GAP));
        
        // Pipe caps
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(p.x - 5, p.top - 20, PIPE_WIDTH + 10, 20);
        ctx.fillRect(p.x - 5, p.top + PIPE_GAP, PIPE_WIDTH + 10, 20);
    });

    drawParticles();
    bird.draw();

    // UI
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';

    if (gameState === 'START') {
        ctx.font = '40px Arial';
        ctx.fillText('FLAPPY JUICE', canvas.width / 2, canvas.height / 2 - 50);
        ctx.strokeText('FLAPPY JUICE', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '20px Arial';
        ctx.fillText('CLICK OR SPACE TO START', canvas.width / 2, canvas.height / 2 + 20);
    } else if (gameState === 'PLAYING') {
        ctx.font = '60px Arial';
        ctx.fillText(score, canvas.width / 2, 80);
        ctx.strokeText(score, canvas.width / 2, 80);
    } else if (gameState === 'GAMEOVER') {
        ctx.font = '40px Arial';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
        ctx.strokeText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '25px Arial';
        ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2);
        ctx.fillText(`BEST: ${highScore}`, canvas.width / 2, canvas.height / 2 + 40);
        ctx.font = '18px Arial';
        ctx.fillText('CLICK TO TRY AGAIN', canvas.width / 2, canvas.height / 2 + 90);
    }

    ctx.restore();
}

function loop(time) {
    update(time);
    draw();
    requestAnimationFrame(loop);
}

// Initialize
resize();
requestAnimationFrame(loop);