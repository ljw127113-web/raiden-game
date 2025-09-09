// 雷电2风格飞行射击游戏
class RaidenGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 2560;
        this.canvas.height = 1280;
        
        // 游戏状态
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        
        // 游戏对象
        this.player = null;
        this.enemies = [];
        this.lightningWhips = [];
        this.particles = [];
        this.stars = [];
        
        // 输入控制
        this.keys = {};
        this.setupInput();
        
        // 游戏循环
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 225; // 0.225秒生成一个敌人，约6.7倍数量（三分之二）
        
        this.init();
    }
    
    init() {
        // 创建星空背景
        this.createStars();
        
        // 开始游戏循环
        this.gameLoop();
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.enemies = [];
        this.lightningWhips = [];
        this.particles = [];
        
        // 创建玩家战机
        this.player = new Player(this.canvas.width / 2, this.canvas.height - 100);
        
        // 为玩家添加闪电鞭发射功能
        this.player.fireLightningWhip = () => {
            // 检查是否有敌人
            const hasEnemies = this.enemies.some(enemy => !enemy.isDead);
            
            if (hasEnemies && !this.player.lightningWhip) {
                const whip = new LightningWhip(this.player.x, this.player.y, this);
                this.player.lightningWhip = whip;
                this.lightningWhips.push(whip);
            }
        };
    }
    
    createStars() {
        for (let i = 0; i < 200; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 2 + 1,
                opacity: Math.random() * 0.8 + 0.2
            });
        }
    }
    
    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // 处理菜单和游戏状态切换
            if (e.code === 'Space' || e.code === 'Enter') {
                if (this.gameState === 'menu') {
                    this.startGame();
                } else if (this.gameState === 'gameOver') {
                    this.startGame();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    update(deltaTime) {
        // 更新星空（所有状态都需要）
        this.updateStars(deltaTime);
        
        if (this.gameState !== 'playing') return;
        
        // 更新玩家
        this.player.update(deltaTime, this.keys);
        
        // 更新敌人
        this.updateEnemies(deltaTime);
        
        // 更新闪电鞭
        this.updateLightningWhips(deltaTime);
        
        // 更新粒子效果
        this.updateParticles(deltaTime);
        
        // 生成敌人
        this.spawnEnemies(deltaTime);
        
        // 碰撞检测
        this.checkCollisions();
        
        // 清理死亡对象
        this.cleanup();
    }
    
    updateEnemies(deltaTime) {
        this.enemies.forEach(enemy => {
            enemy.update(deltaTime);
        });
    }
    
    updateLightningWhips(deltaTime) {
        this.lightningWhips.forEach(whip => {
            whip.update(deltaTime);
        });
    }
    
    updateParticles(deltaTime) {
        this.particles.forEach(particle => {
            particle.update(deltaTime);
        });
    }
    
    updateStars(deltaTime) {
        this.stars.forEach(star => {
            star.y += star.speed;
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }
        });
    }
    
    spawnEnemies(deltaTime) {
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.enemySpawnTimer = 0;
            this.spawnEnemy();
        }
    }
    
    spawnEnemy() {
        const x = Math.random() * (this.canvas.width - 100) + 50;
        const enemy = new Enemy(x, -50);
        this.enemies.push(enemy);
    }
    
    checkCollisions() {
        // 闪电鞭与敌人碰撞
        this.lightningWhips.forEach(whip => {
            this.enemies.forEach(enemy => {
                if (whip.isConnectedTo(enemy) && !enemy.isDead) {
                    enemy.takeDamage(whip.damage);
                    if (enemy.isDead) {
                        this.score += enemy.scoreValue;
                        this.createExplosion(enemy.x, enemy.y);
                    }
                }
            });
        });
        
        // 玩家与敌人碰撞
        this.enemies.forEach(enemy => {
            if (!enemy.isDead && this.player.checkCollision(enemy)) {
                this.player.takeDamage(1);
                enemy.takeDamage(999);
                this.createExplosion(enemy.x, enemy.y);
                if (this.player.lives <= 0) {
                    this.gameState = 'gameOver';
                }
            }
        });
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(x, y, 'explosion'));
        }
    }
    
    cleanup() {
        this.enemies = this.enemies.filter(enemy => !enemy.isDead && enemy.y < this.canvas.height + 100);
        this.lightningWhips = this.lightningWhips.filter(whip => whip.isActive);
        this.particles = this.particles.filter(particle => particle.isActive);
        
        // 清理玩家的闪电鞭引用
        if (this.player.lightningWhip && !this.player.lightningWhip.isActive) {
            this.player.lightningWhip = null;
        }
    }
    
    render() {
        // 创建拖尾效果
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制星空
        this.renderStars();
        
        // 根据游戏状态渲染不同内容
        if (this.gameState === 'menu') {
            this.renderMenu();
        } else if (this.gameState === 'playing') {
            this.renderGame();
        } else if (this.gameState === 'gameOver') {
            this.renderGame();
            this.renderGameOver();
        }
        
        // 更新UI
        this.updateUI();
    }
    
    renderMenu() {
        // 绘制标题
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 80px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 20;
        this.ctx.fillText('雷电2风格射击游戏', this.canvas.width / 2, this.canvas.height / 2 - 100);
        
        // 绘制说明
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = 'bold 40px Arial';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('按空格键或回车键开始游戏', this.canvas.width / 2, this.canvas.height / 2 + 50);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 30px Arial';
        this.ctx.shadowBlur = 5;
        this.ctx.fillText('WASD或方向键移动战机', this.canvas.width / 2, this.canvas.height / 2 + 120);
        this.ctx.fillText('紫色闪电鞭会自动锁定敌人', this.canvas.width / 2, this.canvas.height / 2 + 170);
        
        this.ctx.shadowBlur = 0;
    }
    
    renderGame() {
        // 绘制游戏对象
        if (this.player) {
            this.player.render(this.ctx);
        }
        
        this.enemies.forEach(enemy => {
            if (!enemy.isDead) {
                enemy.render(this.ctx);
            }
        });
        
        this.lightningWhips.forEach(whip => {
            whip.render(this.ctx);
        });
        
        this.particles.forEach(particle => {
            particle.render(this.ctx);
        });
    }
    
    renderGameOver() {
        // 绘制半透明背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制游戏结束文字
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = 'bold 80px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#ff0000';
        this.ctx.shadowBlur = 20;
        this.ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = 'bold 40px Arial';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText(`最终分数: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 50);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 30px Arial';
        this.ctx.shadowBlur = 5;
        this.ctx.fillText('按空格键或回车键重新开始', this.canvas.width / 2, this.canvas.height / 2 + 120);
        
        this.ctx.shadowBlur = 0;
    }
    
    renderStars() {
        this.ctx.fillStyle = 'white';
        this.stars.forEach(star => {
            this.ctx.globalAlpha = star.opacity;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        });
        this.ctx.globalAlpha = 1;
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.player ? this.player.lives : 3;
        document.getElementById('level').textContent = this.level;
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// 玩家战机类
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 50;
        this.speed = 300;
        this.lives = 3;
        this.maxLives = 3;
        
        // 闪电鞭
        this.lightningWhip = null;
        this.whipCooldown = 0;
        this.whipCooldownTime = 1000; // 1秒冷却时间，避免重复创建
    }
    
    update(deltaTime, keys) {
        // 移动控制
        if (keys['KeyA'] || keys['ArrowLeft']) {
            this.x -= this.speed * deltaTime / 1000;
        }
        if (keys['KeyD'] || keys['ArrowRight']) {
            this.x += this.speed * deltaTime / 1000;
        }
        if (keys['KeyW'] || keys['ArrowUp']) {
            this.y -= this.speed * deltaTime / 1000;
        }
        if (keys['KeyS'] || keys['ArrowDown']) {
            this.y += this.speed * deltaTime / 1000;
        }
        
        // 边界检查
        this.x = Math.max(this.width / 2, Math.min(2560 - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(1280 - this.height / 2, this.y));
        
        // 闪电鞭冷却
        if (this.whipCooldown > 0) {
            this.whipCooldown -= deltaTime;
        }
        
        // 自动发射闪电鞭（只在没有闪电鞭时创建）
        if (this.whipCooldown <= 0 && !this.lightningWhip) {
            if (this.fireLightningWhip) {
                this.fireLightningWhip();
            }
            this.whipCooldown = this.whipCooldownTime;
        }
    }
    
    fireLightningWhip() {
        // 这里会在游戏主循环中处理闪电鞭的创建
    }
    
    takeDamage(damage) {
        this.lives -= damage;
        if (this.lives < 0) this.lives = 0;
    }
    
    checkCollision(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.width / 2 + other.width / 2);
    }
    
    render(ctx) {
        // 绘制太空战机主体（带发光效果）
        ctx.shadowColor = '#00aaff';
        ctx.shadowBlur = 20;
        
        // 战机主体 - 流线型设计
        ctx.fillStyle = '#00aaff';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.height / 2);
        ctx.lineTo(this.x - this.width / 2, this.y - this.height / 4);
        ctx.lineTo(this.x - this.width / 3, this.y + this.height / 4);
        ctx.lineTo(this.x - this.width / 4, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width / 4, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width / 3, this.y + this.height / 4);
        ctx.lineTo(this.x + this.width / 2, this.y - this.height / 4);
        ctx.closePath();
        ctx.fill();
        
        // 战机驾驶舱
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height / 6, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // 战机机翼细节
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#0088cc';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 6, this.width / 4, 4);
        ctx.fillRect(this.x + this.width / 4, this.y - this.height / 6, this.width / 4, 4);
        
        // 绘制引擎火焰（动态效果）
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ff4400';
        const flameHeight = 20 + Math.sin(Date.now() * 0.01) * 8;
        ctx.beginPath();
        ctx.ellipse(this.x - 8, this.y + this.height / 2, 6, flameHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(this.x + 8, this.y + this.height / 2, 6, flameHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 引擎核心
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x - 8, this.y + this.height / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 8, this.y + this.height / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }
}

// 敌人类
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 60;
        this.speed = 100;
        this.health = 500;
        this.maxHealth = 500;
        this.isDead = false;
        this.scoreValue = 100;
        
        // 移动模式
        this.movePattern = Math.random() > 0.5 ? 'straight' : 'zigzag';
        this.zigzagOffset = 0;
        this.zigzagSpeed = 2;
        
        // 动画时间
        this.time = 0;
        
        // 受击特效
        this.hitEffect = 0;
        this.hitEffectDuration = 200; // 受击特效持续200毫秒
        this.hitParticles = []; // 受击粒子效果
    }
    
    update(deltaTime) {
        if (this.isDead) return;
        
        // 更新动画时间
        this.time += deltaTime / 1000;
        
        // 更新受击特效
        if (this.hitEffect > 0) {
            this.hitEffect -= deltaTime;
        }
        
        // 更新受击粒子
        this.hitParticles = this.hitParticles.filter(particle => {
            particle.x += particle.vx * deltaTime / 1000;
            particle.y += particle.vy * deltaTime / 1000;
            particle.life -= deltaTime;
            return particle.life > 0;
        });
        
        // 基础向下移动
        this.y += this.speed * deltaTime / 1000;
        
        // 移动模式
        if (this.movePattern === 'zigzag') {
            this.zigzagOffset += this.zigzagSpeed * deltaTime / 1000;
            this.x += Math.sin(this.zigzagOffset) * 50 * deltaTime / 1000;
        }
        
        // 边界检查
        this.x = Math.max(this.width / 2, Math.min(2560 - this.width / 2, this.x));
    }
    
    takeDamage(damage) {
        this.health -= damage;
        this.hitEffect = this.hitEffectDuration; // 触发受击特效
        
        // 创建受击粒子效果
        for (let i = 0; i < 5; i++) {
            this.hitParticles.push({
                x: this.x + (Math.random() - 0.5) * this.width,
                y: this.y + (Math.random() - 0.5) * this.height,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 300 + Math.random() * 200,
                maxLife: 500,
                size: 2 + Math.random() * 3,
                color: `hsl(${Math.random() * 40 + 260}, 100%, 70%)`
            });
        }
        
        if (this.health <= 0) {
            this.isDead = true;
        }
    }
    
    render(ctx) {
        if (this.isDead) return;
        
        // 受击特效 - 发光效果（不改变颜色）
        if (this.hitEffect > 0) {
            const flashIntensity = this.hitEffect / this.hitEffectDuration;
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 25 * flashIntensity;
        } else {
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 15;
        }
        
        // 受击时的震动效果
        let shakeX = 0;
        let shakeY = 0;
        if (this.hitEffect > 0) {
            const shakeIntensity = (this.hitEffect / this.hitEffectDuration) * 3;
            shakeX = (Math.random() - 0.5) * shakeIntensity;
            shakeY = (Math.random() - 0.5) * shakeIntensity;
        }
        
        // 外星生物主体 - 有机形状（保持原色）
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.ellipse(this.x + shakeX, this.y + shakeY, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 外星生物触手
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#cc3333';
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI * 2) / 4 + this.time * 0.01;
            const tentacleX = this.x + shakeX + Math.cos(angle) * (this.width / 2 + 8);
            const tentacleY = this.y + shakeY + Math.sin(angle) * (this.height / 2 + 8);
            
            ctx.beginPath();
            ctx.ellipse(tentacleX, tentacleY, 4, 12, angle, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 外星生物眼睛
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x + shakeX - 8, this.y + shakeY - 8, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + shakeX + 8, this.y + shakeY - 8, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // 眼睛瞳孔
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(this.x + shakeX - 8, this.y + shakeY - 8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + shakeX + 8, this.y + shakeY - 8, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // 外星生物嘴巴
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(this.x + shakeX, this.y + shakeY + 5, 8, 0, Math.PI);
        ctx.fill();
        
        // 绘制生命值条
        const barWidth = this.width;
        const barHeight = 4;
        const healthPercent = this.health / this.maxHealth;
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.height / 2 - 15, barWidth, barHeight);
        
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.height / 2 - 15, barWidth * healthPercent, barHeight);
        
        // 渲染受击粒子效果
        this.hitParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = particle.color;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        
        ctx.shadowBlur = 0;
    }
}

// 闪电鞭类 - 单条闪电左右摆动攻击路径上的敌人
class LightningWhip {
    constructor(startX, startY, game) {
        this.startX = startX;
        this.startY = startY;
        this.game = game;
        this.damage = 2; // 闪电伤害翻倍
        this.isActive = true;
        this.segments = [];
        this.time = 0;
        this.lifeTime = 0;
        this.maxLifeTime = 60000; // 闪电鞭持续60秒，直到目标死亡
        this.primaryTarget = null; // 主要目标
        this.attackedEnemies = new Set(); // 已经攻击过的敌人
        this.createSegments();
    }
    
    createSegments() {
        const segments = 80; // 增加段数确保更平滑的摆动
        for (let i = 0; i < segments; i++) {
            this.segments.push({
                x: 0,
                y: 0,
                swingOffset: 0
            });
        }
    }
    
    update(deltaTime) {
        this.lifeTime += deltaTime;
        
        if (this.lifeTime > this.maxLifeTime) {
            this.isActive = false;
            return;
        }
        
        this.time += deltaTime / 50; // 更快的动画速度
        
        // 更新起点位置跟随主角
        this.startX = this.game.player.x;
        this.startY = this.game.player.y;
        
        // 寻找主要目标（最近的敌人）
        this.findPrimaryTarget();
        
        // 更新闪电鞭段
        this.updateSegments();
        
        // 检查闪电鞭路径上的敌人
        this.checkPathCollisions();
        
        // 如果主要目标死亡，闪电鞭消失
        if (this.primaryTarget && this.primaryTarget.isDead) {
            this.isActive = false; // 闪电鞭消失
        }
    }
    
    isTargetInCanvas() {
        if (!this.primaryTarget) return false;
        
        // 检查目标是否在画布范围内（画布大小：2560x1280）
        const margin = 50; // 给一些边距
        return this.primaryTarget.x >= -margin && 
               this.primaryTarget.x <= 2560 + margin &&
               this.primaryTarget.y >= -margin && 
               this.primaryTarget.y <= 1280 + margin;
    }
    
    findPrimaryTarget() {
        // 如果已经有目标且目标还活着且在画布内，不更换目标
        if (this.primaryTarget && !this.primaryTarget.isDead && this.isTargetInCanvas()) {
            return;
        }
        
        // 随机选择一个敌人作为目标
        const availableEnemies = this.game.enemies.filter(enemy => {
            if (enemy.isDead) return false;
            const dx = this.startX - enemy.x;
            const dy = this.startY - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < 800; // 800像素范围内
        });
        
        if (availableEnemies.length > 0) {
            // 随机选择一个敌人
            const randomIndex = Math.floor(Math.random() * availableEnemies.length);
            this.primaryTarget = availableEnemies[randomIndex];
        } else {
            this.primaryTarget = null;
        }
    }
    
    updateSegments() {
        if (!this.primaryTarget) return;
        
        // 计算到主要目标的基础路径
        const dx = this.primaryTarget.x - this.startX;
        const dy = this.primaryTarget.y - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // 更新闪电鞭段 - 整条闪电都是弯曲的
        this.segments.forEach((segment, index) => {
            const progress = index / (this.segments.length - 1);
            
            // 基础位置（直线到主要目标）
            const baseX = this.startX + dx * progress;
            const baseY = this.startY + dy * progress;
            
            // 创建整条闪电的弯曲效果
            // 使用S型曲线确保起点和终点都有弯曲
            const curveIntensity = 30; // 进一步减小弯曲强度
            const swingFrequency = 0.3; // 摆动频率
            const swingPhase = this.time * swingFrequency;
            
            // 垂直于连线的方向
            const perpAngle = angle + Math.PI / 2;
            
            // 创建S型弯曲 - 确保起点和终点都有弯曲
            // 使用三次函数创建S型曲线
            const sCurve = Math.sin(progress * Math.PI) * curveIntensity;
            
            // 主要摆动 - 整条闪电都有摆动
            const mainSwing = Math.sin(swingPhase + progress * Math.PI * 4) * sCurve;
            
            // 添加快速摆动 - 使用更高频率的正弦波
            const fastSwing = Math.sin(swingPhase * 2.5 + progress * Math.PI * 6) * sCurve * 0.4;
            
            // 添加波浪效果 - 让整条闪电都有波浪
            const waveEffect = Math.sin(swingPhase * 1.5 + progress * Math.PI * 8) * sCurve * 0.2;
            
            // 添加随机摆动 - 让摆动更随机
            const randomSwing = Math.sin(swingPhase * 3.7 + progress * Math.PI * 12 + index * 0.1) * sCurve * 0.3;
            
            // 添加混沌摆动 - 使用更复杂的随机算法
            const chaosSwing = Math.sin(swingPhase * 5.2 + progress * Math.PI * 15 + this.time * 0.1) * sCurve * 0.2;
            
            // 组合所有效果，确保整条闪电都是弯曲的
            const totalSwing = mainSwing + fastSwing + waveEffect + randomSwing + chaosSwing;
            
            // 转换为世界坐标
            segment.x = baseX + Math.cos(perpAngle) * totalSwing;
            segment.y = baseY + Math.sin(perpAngle) * totalSwing;
            
            // 添加细微的随机抖动，让摆动更随机
            const microJitter = Math.sin(this.time * 0.8 + progress * Math.PI * 15 + index * 0.2) * 4 * Math.sin(progress * Math.PI);
            const randomJitter = (Math.random() - 0.5) * 2 * Math.sin(progress * Math.PI);
            segment.x += Math.cos(perpAngle + Math.PI / 2) * (microJitter + randomJitter);
            segment.y += Math.sin(perpAngle + Math.PI / 2) * (microJitter + randomJitter);
            
            segment.swingOffset = Math.abs(totalSwing);
        });
    }
    
    checkPathCollisions() {
        // 检查闪电鞭路径上的所有敌人
        this.game.enemies.forEach(enemy => {
            if (!enemy.isDead) {
                // 检查敌人是否在闪电鞭路径附近
                if (this.isEnemyOnPath(enemy)) {
                    // 整条闪电都有伤害，不限制攻击次数
                    enemy.takeDamage(this.damage);
                    
                    if (enemy.isDead) {
                        this.game.score += enemy.scoreValue;
                        this.game.createExplosion(enemy.x, enemy.y);
                    }
                }
            }
        });
    }
    
    isEnemyOnPath(enemy) {
        // 检查敌人是否在闪电鞭路径的某个段附近
        for (let i = 0; i < this.segments.length - 1; i++) {
            const segment1 = this.segments[i];
            const segment2 = this.segments[i + 1];
            
            // 计算敌人到线段的最短距离
            const distance = this.pointToLineDistance(
                enemy.x, enemy.y,
                segment1.x, segment1.y,
                segment2.x, segment2.y
            );
            
            // 如果距离小于闪电鞭的宽度，则认为被击中
            if (distance < 50) { // 增加伤害范围
                return true;
            }
        }
        return false;
    }
    
    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    isConnectedTo(target) {
        return this.attackedEnemies.has(target) && this.isActive;
    }
    
    render(ctx) {
        if (!this.isActive || !this.primaryTarget) return;
        
        // 绘制闪电鞭主体 - 紫色
        ctx.strokeStyle = '#aa00ff';
        ctx.lineWidth = 8;
        ctx.shadowColor = '#aa00ff';
        ctx.shadowBlur = 25;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        
        this.segments.forEach(segment => {
            ctx.lineTo(segment.x, segment.y);
        });
        
        ctx.lineTo(this.primaryTarget.x, this.primaryTarget.y);
        ctx.stroke();
        
        // 绘制闪电鞭核心 - 更亮的紫色
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 30;
        
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        
        this.segments.forEach(segment => {
            ctx.lineTo(segment.x, segment.y);
        });
        
        ctx.lineTo(this.primaryTarget.x, this.primaryTarget.y);
        ctx.stroke();
        
        // 绘制闪电鞭内层 - 白色核心
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        
        this.segments.forEach(segment => {
            ctx.lineTo(segment.x, segment.y);
        });
        
        ctx.lineTo(this.primaryTarget.x, this.primaryTarget.y);
        ctx.stroke();
        
        // 绘制连接点 - 发光圆点
        ctx.fillStyle = '#ff00ff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.primaryTarget.x, this.primaryTarget.y, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制连接点内层
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.primaryTarget.x, this.primaryTarget.y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }
}

// 粒子效果类
class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.isActive = true;
        this.life = 1.0;
        this.maxLife = 1.0;
        
        if (type === 'explosion') {
            this.vx = (Math.random() - 0.5) * 200;
            this.vy = (Math.random() - 0.5) * 200;
            this.size = Math.random() * 5 + 2;
            this.color = `hsl(${Math.random() * 60 + 10}, 100%, 50%)`;
        }
    }
    
    update(deltaTime) {
        this.x += this.vx * deltaTime / 1000;
        this.y += this.vy * deltaTime / 1000;
        this.life -= deltaTime / 1000;
        
        if (this.life <= 0) {
            this.isActive = false;
        }
    }
    
    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// 启动游戏
window.addEventListener('load', () => {
    const game = new RaidenGame();
});
