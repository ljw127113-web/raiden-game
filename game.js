// 雷电2风格飞行射击游戏
class RaidenGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 720;
        this.canvas.height = 1280;
        
        // 游戏状态
        this.gameState = 'menu'; // menu, playing, paused, gameOver, nickname
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        
        // 玩家信息
        this.playerName = this.loadPlayerName();
        this.leaderboard = this.loadLeaderboard();
        
        // 升级系统
        this.coins = 0; // 金币数量
        this.lightningLevel = 1; // 闪电等级
        this.lightningUpgradeCost = 10; // 升级费用
        
        // 游戏对象
        this.player = null;
        this.enemies = [];
        this.lightningWhips = [];
        this.bullets = [];
        this.particles = [];
        this.stars = [];
        
        // 输入控制
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.touchX = 0;
        this.touchY = 0;
        this.isMouseDown = false;
        this.isTouchDown = false;
        
        this.setupInput();
        
        // 游戏循环
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 225; // 0.225秒生成一个敌人，约6.7倍数量（三分之二）
        this.bulletSpawnTimer = 0;
        this.bulletSpawnInterval = 100; // 0.1秒发射一颗子弹
        
        this.init();
    }
    
    init() {
        // 创建星空背景
        this.createStars();
        
        // 开始游戏循环
        this.gameLoop();
    }
    
    // 本地存储功能
    loadPlayerName() {
        return localStorage.getItem('raidenPlayerName') || '';
    }
    
    savePlayerName(name) {
        localStorage.setItem('raidenPlayerName', name);
        this.playerName = name;
    }
    
    loadLeaderboard() {
        const saved = localStorage.getItem('raidenLeaderboard');
        return saved ? JSON.parse(saved) : [];
    }
    
    saveLeaderboard() {
        localStorage.setItem('raidenLeaderboard', JSON.stringify(this.leaderboard));
    }
    
    addToLeaderboard(score) {
        if (!this.playerName) return;
        
        const entry = {
            name: this.playerName,
            score: score,
            date: new Date().toLocaleDateString()
        };
        
        this.leaderboard.push(entry);
        this.leaderboard.sort((a, b) => b.score - a.score);
        
        // 只保留前10名
        if (this.leaderboard.length > 10) {
            this.leaderboard = this.leaderboard.slice(0, 10);
        }
        
        this.saveLeaderboard();
    }
    
    getPlayerBestScore() {
        if (!this.playerName) return 0;
        
        const playerEntries = this.leaderboard.filter(entry => entry.name === this.playerName);
        if (playerEntries.length === 0) return 0;
        
        return Math.max(...playerEntries.map(entry => entry.score));
    }
    
    handleNicknameSubmit() {
        const input = document.getElementById('nicknameInput');
        const name = input.value.trim();
        if (name) {
            this.savePlayerName(name);
            this.gameState = 'menu';
            this.hideNicknameInput();
        }
    }
    
    showNicknameInput() {
        const container = document.getElementById('nicknameContainer');
        const input = document.getElementById('nicknameInput');
        if (container && input) {
            container.style.display = 'block';
            input.value = '';
            input.focus();
        }
    }
    
    hideNicknameInput() {
        const container = document.getElementById('nicknameContainer');
        if (container) {
            container.style.display = 'none';
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.coins = 0; // 重置金币
        this.lightningLevel = 1; // 重置闪电等级
        this.lightningUpgradeCost = 10; // 重置升级费用
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
        this.player.update(deltaTime, this.keys, this);
        
        // 更新敌人
        this.updateEnemies(deltaTime);
        
        // 更新闪电鞭
        this.updateLightningWhips(deltaTime);
        
        // 更新子弹
        this.updateBullets(deltaTime);
        
        // 更新粒子效果
        this.updateParticles(deltaTime);
        
        // 生成敌人
        this.spawnEnemies(deltaTime);
        
        // 发射子弹
        this.spawnBullets(deltaTime);
        
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
    
    updateBullets(deltaTime) {
        this.bullets.forEach(bullet => {
            bullet.update(deltaTime);
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
    
    spawnBullets(deltaTime) {
        this.bulletSpawnTimer += deltaTime;
        if (this.bulletSpawnTimer >= this.bulletSpawnInterval) {
            this.bulletSpawnTimer = 0;
            this.spawnBullet();
        }
    }
    
    spawnBullet() {
        const bullet = new Bullet(this.player.x, this.player.y - this.player.height / 2, this);
        this.bullets.push(bullet);
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
        
        // 子弹与敌人碰撞
        this.bullets.forEach((bullet, bulletIndex) => {
            this.enemies.forEach(enemy => {
                if (bullet.active && !enemy.isDead && bullet.checkCollision(enemy)) {
                    enemy.takeDamage(bullet.damage);
                    bullet.active = false; // 子弹击中后消失
                    if (enemy.isDead) {
                        this.score += enemy.scoreValue;
                        this.coins += 1; // 每杀死一个敌人获得1金币
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
                    this.addToLeaderboard(this.score);
                }
            }
        });
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(x, y, 'explosion'));
        }
    }
    
    upgradeLightning() {
        // 升级闪电伤害
        if (this.coins >= this.lightningUpgradeCost) {
            this.coins -= this.lightningUpgradeCost;
            this.lightningLevel++;
            this.lightningUpgradeCost = Math.floor(this.lightningUpgradeCost * 1.2); // 每次升级费用增加20%
        }
    }
    
    getLightningDamage() {
        // 计算当前闪电伤害（基础伤害 * 等级加成）
        const baseDamage = 2;
        const levelMultiplier = 1 + (this.lightningLevel - 1) * 0.3; // 每级增加30%，让升级效果更明显
        return Math.floor(baseDamage * levelMultiplier);
    }
    
    setupInput() {
        // 键盘事件监听
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // 游戏状态控制
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                if (this.gameState === 'menu') {
                    if (this.playerName) {
                        this.startGame();
                    } else {
                        this.gameState = 'nickname';
                        this.showNicknameInput();
                    }
                } else if (this.gameState === 'gameOver') {
                    this.startGame();
                } else if (this.gameState === 'nickname') {
                    this.handleNicknameSubmit();
                }
            }
            
            // ESC键返回主菜单
            if (e.code === 'Escape') {
                if (this.gameState === 'playing' || this.gameState === 'gameOver') {
                    this.gameState = 'menu';
                } else if (this.gameState === 'nickname') {
                    this.gameState = 'menu';
                    this.hideNicknameInput();
                }
            }
            
            // 升级控制
            if (e.code === 'KeyU' && this.gameState === 'playing') {
                this.upgradeLightning();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // 鼠标事件监听
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.handleClick(e.clientX, e.clientY);
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            this.isMouseDown = false;
        });
        
        // 触屏事件监听
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                const rect = this.canvas.getBoundingClientRect();
                this.touchX = e.touches[0].clientX - rect.left;
                this.touchY = e.touches[0].clientY - rect.top;
                this.isTouchDown = true;
                this.handleClick(e.touches[0].clientX, e.touches[0].clientY);
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                const rect = this.canvas.getBoundingClientRect();
                this.touchX = e.touches[0].clientX - rect.left;
                this.touchY = e.touches[0].clientY - rect.top;
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isTouchDown = false;
        });
    }
    
    handleClick(clientX, clientY) {
        if (this.gameState !== 'playing') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const clickY = clientY - rect.top;
        
        // 检查是否点击了升级按钮
        if (this.upgradeButton) {
            if (clickX >= this.upgradeButton.x && 
                clickX <= this.upgradeButton.x + this.upgradeButton.width &&
                clickY >= this.upgradeButton.y && 
                clickY <= this.upgradeButton.y + this.upgradeButton.height) {
                this.upgradeLightning();
            }
        }
    }
    
    cleanup() {
        this.enemies = this.enemies.filter(enemy => !enemy.isDead && enemy.y < this.canvas.height + 100);
        this.lightningWhips = this.lightningWhips.filter(whip => whip.isActive);
        this.bullets = this.bullets.filter(bullet => bullet.active);
        this.particles = this.particles.filter(particle => particle.isActive);
        
        // 清理玩家的闪电鞭引用
        if (this.player.lightningWhip && !this.player.lightningWhip.isActive) {
            this.player.lightningWhip = null;
        }
    }
    
    render() {
        // 清除画布，避免残影
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制星空
        this.renderStars();
        
        // 根据游戏状态渲染不同内容
        if (this.gameState === 'menu') {
            this.renderMenu();
        } else if (this.gameState === 'nickname') {
            this.renderNicknameInput();
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
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 20;
        this.ctx.fillText('雷电2风格射击游戏', this.canvas.width / 2, 150);
        
        // 绘制玩家昵称
        if (this.playerName) {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.shadowBlur = 10;
            this.ctx.fillText(`玩家: ${this.playerName}`, this.canvas.width / 2, 200);
        }
        
        // 绘制排行榜
        this.renderLeaderboard();
        
        // 绘制说明
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('按空格键或回车键开始游戏', this.canvas.width / 2, this.canvas.height - 200);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.shadowBlur = 5;
        this.ctx.fillText('WASD或方向键移动战机', this.canvas.width / 2, this.canvas.height - 170);
        this.ctx.fillText('紫色闪电鞭会自动锁定敌人', this.canvas.width / 2, this.canvas.height - 140);
        this.ctx.fillText('杀死怪物获得金币，按U键升级闪电', this.canvas.width / 2, this.canvas.height - 110);
        this.ctx.fillText('游戏中按ESC键返回主菜单', this.canvas.width / 2, this.canvas.height - 80);
        
        this.ctx.shadowBlur = 0;
    }
    
    renderLeaderboard() {
        const startY = 250;
        const lineHeight = 25;
        
        // 排行榜标题
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('排行榜', this.canvas.width / 2, startY);
        
        // 绘制排行榜背景
        const boardWidth = 400;
        const boardHeight = Math.min(this.leaderboard.length * lineHeight + 20, 200);
        const boardX = (this.canvas.width - boardWidth) / 2;
        const boardY = startY + 30;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(boardX, boardY, boardWidth, boardHeight);
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(boardX, boardY, boardWidth, boardHeight);
        
        // 绘制排行榜内容
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.shadowBlur = 0;
        
        if (this.leaderboard.length === 0) {
            this.ctx.textAlign = 'center';
            this.ctx.fillText('暂无记录', this.canvas.width / 2, boardY + 30);
        } else {
            this.leaderboard.slice(0, 8).forEach((entry, index) => {
                const y = boardY + 20 + index * lineHeight;
                const rank = index + 1;
                const name = entry.name.length > 8 ? entry.name.substring(0, 8) + '...' : entry.name;
                
                // 排名颜色
                if (rank === 1) this.ctx.fillStyle = '#ffd700';
                else if (rank === 2) this.ctx.fillStyle = '#c0c0c0';
                else if (rank === 3) this.ctx.fillStyle = '#cd7f32';
                else this.ctx.fillStyle = '#ffffff';
                
                this.ctx.fillText(`${rank}. ${name}`, boardX + 10, y);
                this.ctx.fillText(entry.score.toString(), boardX + boardWidth - 80, y);
            });
        }
        
        this.ctx.textAlign = 'center';
    }
    
    renderNicknameInput() {
        // 绘制半透明背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制标题
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 20;
        this.ctx.fillText('请输入游戏昵称', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        // 绘制输入框背景
        const inputWidth = 300;
        const inputHeight = 40;
        const inputX = (this.canvas.width - inputWidth) / 2;
        const inputY = this.canvas.height / 2;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(inputX, inputY, inputWidth, inputHeight);
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(inputX, inputY, inputWidth, inputHeight);
        
        // 绘制说明
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.shadowBlur = 5;
        this.ctx.fillText('输入昵称后按回车键确认', this.canvas.width / 2, this.canvas.height / 2 + 80);
        this.ctx.fillText('按ESC键返回主菜单', this.canvas.width / 2, this.canvas.height / 2 + 110);
        
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
        
        this.bullets.forEach(bullet => {
            bullet.render(this.ctx);
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
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#ff0000';
        this.ctx.shadowBlur = 20;
        this.ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 60);
        
        // 绘制玩家昵称
        if (this.playerName) {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.shadowBlur = 10;
            this.ctx.fillText(`玩家: ${this.playerName}`, this.canvas.width / 2, this.canvas.height / 2 - 20);
        }
        
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText(`最终分数: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.shadowBlur = 5;
        this.ctx.fillText('按空格键或回车键重新开始', this.canvas.width / 2, this.canvas.height / 2 + 60);
        this.ctx.fillText('按ESC键返回主菜单', this.canvas.width / 2, this.canvas.height / 2 + 90);
        
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
        
        // 显示桃心形状的生命值
        const lives = this.player ? this.player.lives : 3;
        const hearts = '❤️'.repeat(lives) + '🤍'.repeat(3 - lives);
        document.getElementById('lives').textContent = hearts;
        
        document.getElementById('level').textContent = this.level;
        
        // 更新用户信息显示
        if (this.playerName) {
            const bestScore = this.getPlayerBestScore();
            document.getElementById('playerInfo').textContent = `${this.playerName} | 最好: ${bestScore}`;
        } else {
            document.getElementById('playerInfo').textContent = '';
        }
        
        // 渲染升级UI
        this.renderUpgradeUI();
    }
    
    
    renderUpgradeUI() {
        if (this.gameState !== 'playing') return;
        
        // 计算右上角位置（竖屏模式）
        const uiWidth = 250; // 进一步缩小UI宽度适应竖屏
        const uiHeight = 120; // 增加UI高度以容纳U键提示
        const uiX = this.canvas.width - uiWidth - 10; // 减少边距
        const uiY = 20;
        
        // 绘制升级信息背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(uiX, uiY, uiWidth, uiHeight);
        
        // 绘制边框
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(uiX, uiY, uiWidth, uiHeight);
        
        // 绘制金币信息
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.shadowColor = '#ffff00';
        this.ctx.shadowBlur = 5;
        this.ctx.fillText(`金币: ${this.coins}`, uiX + 8, uiY + 25);
        
        // 绘制闪电等级和伤害信息
        this.ctx.fillStyle = '#ff00ff';
        const lightningDamage = this.getLightningDamage();
        this.ctx.fillText(`闪电等级: ${this.lightningLevel} (伤害: ${lightningDamage})`, uiX + 8, uiY + 50);
        
        // 绘制升级费用和提示
        this.ctx.fillStyle = this.coins >= this.lightningUpgradeCost ? '#00ff00' : '#ff0000';
        this.ctx.fillText(`升级费用: ${this.lightningUpgradeCost}`, uiX + 8, uiY + 75);
        
        // 绘制U键升级提示
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = 'bold 16px Arial'; // 从12px增加到16px
        this.ctx.fillText('按U键升级闪电', uiX + 8, uiY + 95);
        
        // 绘制升级按钮
        const buttonX = uiX + 8;
        const buttonY = uiY + 100;
        const buttonWidth = uiWidth - 16;
        const buttonHeight = 15;
        
        // 按钮背景
        this.ctx.fillStyle = this.coins >= this.lightningUpgradeCost ? '#00aa00' : '#666666';
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // 按钮边框
        this.ctx.strokeStyle = this.coins >= this.lightningUpgradeCost ? '#00ff00' : '#999999';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // 按钮文字
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('点击升级闪电', buttonX + buttonWidth / 2, buttonY + 11);
        
        // 存储按钮位置用于点击检测
        this.upgradeButton = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        this.ctx.shadowBlur = 0;
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
        this.width = 20; // 从28缩小到20
        this.height = 25; // 从35缩小到25
        this.speed = 300;
        this.lives = 3;
        this.maxLives = 3;
        
        // 闪电鞭
        this.lightningWhip = null;
        this.whipCooldown = 0;
        this.whipCooldownTime = 1000; // 1秒冷却时间，避免重复创建
    }
    
    update(deltaTime, keys, game) {
        // 键盘移动控制
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
        
        // 鼠标移动控制
        if (game.isMouseDown) {
            const moveSpeed = this.speed * 2; // 鼠标移动速度更快
            const dx = game.mouseX - this.x;
            const dy = game.mouseY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) { // 避免微小移动
                this.x += (dx / distance) * moveSpeed * deltaTime / 1000;
                this.y += (dy / distance) * moveSpeed * deltaTime / 1000;
            }
        }
        
        // 触屏移动控制
        if (game.isTouchDown) {
            const moveSpeed = this.speed * 2; // 触屏移动速度更快
            const dx = game.touchX - this.x;
            const dy = game.touchY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) { // 避免微小移动
                this.x += (dx / distance) * moveSpeed * deltaTime / 1000;
                this.y += (dy / distance) * moveSpeed * deltaTime / 1000;
            }
        }
        
        // 边界检查
        this.x = Math.max(this.width / 2, Math.min(720 - this.width / 2, this.x));
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
        // 减小碰撞检测范围，使用更小的碰撞半径
        const playerCollisionRadius = this.width * 0.6; // 从1.0减小到0.6
        const otherCollisionRadius = other.width * 0.8; // 敌人碰撞半径也稍微减小
        return distance < (playerCollisionRadius + otherCollisionRadius);
    }
    
    render(ctx) {
        // 绘制太空飞船主体（带发光效果）
        ctx.shadowColor = '#00aaff';
        ctx.shadowBlur = 25;
        
        // 飞船主体 - 菱形设计
        ctx.fillStyle = '#0066aa';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.height / 2); // 顶部
        ctx.lineTo(this.x + this.width / 2, this.y); // 右侧
        ctx.lineTo(this.x, this.y + this.height / 2); // 底部
        ctx.lineTo(this.x - this.width / 2, this.y); // 左侧
        ctx.closePath();
        ctx.fill();
        
        // 飞船主体边缘高光
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 飞船驾驶舱 - 透明玻璃效果
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height / 6, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // 驾驶舱边框
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 飞船机翼 - 扩展设计
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#004488';
        
        // 左机翼
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 2, this.y - 5);
        ctx.lineTo(this.x - this.width / 2 - 15, this.y - 15);
        ctx.lineTo(this.x - this.width / 2 - 10, this.y + 5);
        ctx.lineTo(this.x - this.width / 2, this.y + 5);
        ctx.closePath();
        ctx.fill();
        
        // 右机翼
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y - 5);
        ctx.lineTo(this.x + this.width / 2 + 15, this.y - 15);
        ctx.lineTo(this.x + this.width / 2 + 10, this.y + 5);
        ctx.lineTo(this.x + this.width / 2, this.y + 5);
        ctx.closePath();
        ctx.fill();
        
        // 机翼细节线条
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 飞船引擎 - 双引擎设计
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ff6600';
        const flameHeight = 25 + Math.sin(Date.now() * 0.015) * 10;
        const flameWidth = 8 + Math.sin(Date.now() * 0.02) * 3;
        
        // 左引擎火焰
        ctx.beginPath();
        ctx.ellipse(this.x - 12, this.y + this.height / 2 + flameHeight / 2, flameWidth, flameHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 右引擎火焰
        ctx.beginPath();
        ctx.ellipse(this.x + 12, this.y + this.height / 2 + flameHeight / 2, flameWidth, flameHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 引擎核心 - 蓝色能量
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(this.x - 12, this.y + this.height / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 12, this.y + this.height / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 引擎内层 - 白色核心
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x - 12, this.y + this.height / 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 12, this.y + this.height / 2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 飞船武器系统 - 闪电鞭发射器
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height / 3, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // 武器系统内层
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height / 3, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }
}

// 敌人类
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 35; // 50 * 0.7
        this.height = 42; // 60 * 0.7
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
        this.x = Math.max(this.width / 2, Math.min(720 - this.width / 2, this.x));
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
        
        // 优化后的外星生物主体 - 更圆润的设计
        ctx.fillStyle = '#1a1a3a';
        ctx.beginPath();
        // 使用椭圆形状，更现代化
        ctx.ellipse(this.x + shakeX, this.y + shakeY, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 主体边缘高光
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 添加内部装饰
        ctx.fillStyle = '#2a2a4a';
        ctx.beginPath();
        ctx.ellipse(this.x + shakeX, this.y + shakeY, this.width / 3, this.height / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 优化后的触手 - 更优雅的设计
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#4a4a6a';
        for (let i = 0; i < 4; i++) { // 减少触手数量，更简洁
            const angle = (i * Math.PI * 2) / 4 + this.time * 0.01;
            const tentacleLength = 12 + Math.sin(this.time * 0.05 + i) * 3;
            const tentacleX = this.x + shakeX + Math.cos(angle) * (this.width / 2 + tentacleLength / 2);
            const tentacleY = this.y + shakeY + Math.sin(angle) * (this.height / 2 + tentacleLength / 2);
            
            ctx.beginPath();
            ctx.moveTo(this.x + shakeX + Math.cos(angle) * this.width / 2, 
                      this.y + shakeY + Math.sin(angle) * this.height / 2);
            ctx.lineTo(tentacleX, tentacleY);
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 触手尖端 - 更圆润
            ctx.beginPath();
            ctx.arc(tentacleX, tentacleY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 优化后的眼睛 - 更现代的设计
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#00aaff';
        ctx.beginPath();
        ctx.arc(this.x + shakeX - 8, this.y + shakeY - 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + shakeX + 8, this.y + shakeY - 8, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // 眼睛瞳孔 - 白色
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x + shakeX - 8, this.y + shakeY - 8, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + shakeX + 8, this.y + shakeY - 8, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 优化后的嘴巴 - 更简洁的设计
        ctx.fillStyle = '#5a5a7a';
        ctx.beginPath();
        ctx.ellipse(this.x + shakeX, this.y + shakeY + 8, 6, 3, 0, 0, Math.PI * 2);
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
        this.baseDamage = 2; // 基础闪电伤害
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
        const segments = 120; // 进一步增加段数确保S形更平滑
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
        
        // 检查目标是否在画布范围内（画布大小：720x1280）
        const margin = 50; // 给一些边距
        return this.primaryTarget.x >= -margin && 
               this.primaryTarget.x <= 720 + margin &&
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
            return distance < 400; // 400像素范围内（适应新画布）
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
        
        const dx = this.primaryTarget.x - this.startX;
        const dy = this.primaryTarget.y - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // 创建S形闪电鞭 - 使用多个平滑的贝塞尔曲线段
        this.segments.forEach((segment, index) => {
            const t = index / (this.segments.length - 1);
            
            // 基础直线路径
            const baseX = this.startX + dx * t;
            const baseY = this.startY + dy * t;
            
            // S形弯曲参数 - 调整为蛇形摆动
            const sCurveIntensity = 10; // 进一步减小S形弯曲强度，让摆动更细腻
            const sCurveFrequency = 4.0; // 降低弯曲频率，让摆动更慢
            const sCurvePhase = this.time * 0.8; // 降低相位变化速度，让摆动更慢
            
            // 垂直于连线的方向
            const perpAngle = angle + Math.PI / 2;
            
            // 创建S形弯曲 - 使用正弦波创建平滑的S形
            // 使用更复杂的函数来创建更自然的S形
            const sCurve = Math.sin(t * Math.PI * sCurveFrequency + sCurvePhase) * sCurveIntensity * 
                          (1 - Math.abs(t - 0.5) * 0.3); // 在中间部分增强S形效果
            
            // 添加蛇形摆动效果，增强S形
            const snakeIntensity = 3; // 进一步减小蛇形摆动强度，让摆动更细腻
            const snakeFrequency = 1.2; // 降低蛇形摆动频率，让摆动更慢
            const snakePhase = this.time * snakeFrequency;
            
            // 蛇形摆动，与S形结合 - 创建缓慢的波峰波谷切换
            const snakeSwing = Math.sin(snakePhase + t * Math.PI * 6) * snakeIntensity * (0.1 + 0.2 * t);
            
            // 添加第二层蛇形摆动，增强波峰波谷效果
            const snakeSwing2 = Math.sin(this.time * 1.5 + t * Math.PI * 8 + index * 0.2) * 2 * (0.03 + 0.1 * t);
            
            // 添加细微的随机抖动，模拟闪电的不规则性
            const microJitter = Math.sin(this.time * 1.0 + t * Math.PI * 20 + index * 0.15) * 0.2 * Math.sin(t * Math.PI);
            
            // 应用S形弯曲和多层蛇形摆动
            segment.x = baseX + Math.cos(perpAngle) * (sCurve + snakeSwing + snakeSwing2 + microJitter);
            segment.y = baseY + Math.sin(perpAngle) * (sCurve + snakeSwing + snakeSwing2 + microJitter);
            
            segment.swingOffset = Math.abs(sCurve + snakeSwing + snakeSwing2);
        });
    }
    
    cubicBezier(p0, p1, p2, p3, t) {
        // 三次贝塞尔曲线公式
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;
        
        return uuu * p0 + 3 * uu * t * p1 + 3 * u * tt * p2 + ttt * p3;
    }
    
    checkPathCollisions() {
        // 检查闪电鞭路径上的所有敌人
        this.game.enemies.forEach(enemy => {
            if (!enemy.isDead) {
                // 检查敌人是否在闪电鞭路径附近
                if (this.isEnemyOnPath(enemy)) {
                    // 计算伤害：中间部分伤害*3，终点伤害不变
                    const damage = this.calculateDamageForPosition(enemy);
                    enemy.takeDamage(damage);
                    
                    if (enemy.isDead) {
                        this.game.score += enemy.scoreValue;
                        this.game.coins += 1; // 每杀死一个怪物获得1金币
                        this.game.createExplosion(enemy.x, enemy.y);
                    }
                }
            }
        });
    }
    
    calculateDamageForPosition(enemy) {
        // 计算敌人相对于闪电鞭起点的位置比例
        const dx = enemy.x - this.startX;
        const dy = enemy.y - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 获取当前闪电伤害（包含升级加成）
        const currentDamage = this.game.getLightningDamage();
        
        // 计算到终点的距离
        if (this.primaryTarget) {
            const targetDx = this.primaryTarget.x - this.startX;
            const targetDy = this.primaryTarget.y - this.startY;
            const targetDistance = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
            
            // 计算位置比例 (0 = 起点, 1 = 终点)
            const positionRatio = distance / targetDistance;
            
            // 中间部分(0.2-0.8)伤害*3，起点和终点伤害不变
            if (positionRatio >= 0.2 && positionRatio <= 0.8) {
                return currentDamage * 3; // 中间部分3倍伤害
            } else {
                return currentDamage; // 起点和终点正常伤害
            }
        }
        
        return currentDamage; // 默认伤害
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
        ctx.lineWidth = 18; // 从12增加到18，让闪电更粗
        ctx.shadowColor = '#aa00ff';
        ctx.shadowBlur = 40; // 增加发光效果
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
        ctx.lineWidth = 10; // 从6增加到10
        ctx.shadowBlur = 45; // 增加发光效果
        
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        
        this.segments.forEach(segment => {
            ctx.lineTo(segment.x, segment.y);
        });
        
        ctx.lineTo(this.primaryTarget.x, this.primaryTarget.y);
        ctx.stroke();
        
        // 绘制闪电鞭内层 - 白色核心
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5; // 从3增加到5
        ctx.shadowBlur = 25; // 增加发光效果
        
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

// 子弹类
class Bullet {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 12;
        this.speed = 8;
        this.game = game;
        this.baseDamage = 30; // 基础伤害
        this.damage = this.calculateDamage(); // 根据闪电等级计算伤害
        this.active = true;
    }
    
    calculateDamage() {
        // 子弹伤害随闪电等级增加，但增长速度较慢
        const lightningLevel = this.game ? this.game.lightningLevel : 1;
        const damageMultiplier = 1 + (lightningLevel - 1) * 0.15; // 每级增加15%，比闪电慢一些
        return Math.floor(this.baseDamage * damageMultiplier);
    }
    
    update() {
        this.y -= this.speed;
        
        // 如果子弹超出画布顶部，标记为不活跃
        if (this.y < -this.height) {
            this.active = false;
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        
        // 绘制子弹主体
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        // 添加发光效果
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        ctx.restore();
    }
    
    checkCollision(enemy) {
        if (!this.active || enemy.isDead) return false;
        
        return this.x < enemy.x + enemy.width &&
               this.x + this.width > enemy.x &&
               this.y < enemy.y + enemy.height &&
               this.y + this.height > enemy.y;
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
