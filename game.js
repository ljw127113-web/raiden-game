// 雷电2风格飞行射击游戏
class RaidenGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 720;
        this.canvas.height = 1280;
        
        // 游戏状态
        this.gameState = 'menu'; // menu, playing, paused, gameOver, nicknameInput, leaderboard
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.playerName = '';
        this.nicknameHistory = []; // 昵称历史记录
        this.leaderboard = [];
        this.localBestScore = 0;
        this.networkLeaderboard = [];
        this.isOnline = false;
        // 网络排行榜配置
        this.networkLeaderboardKey = 'raidenGameNetworkLeaderboard';
        this.demoMode = false; // 设置为false使用真实服务器
        this.serverUrl = 'http://localhost:3000'; // 服务器地址
        
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
        this.setupUI();
        
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
        
        // 加载排行榜数据
        this.loadLeaderboard();
        this.loadLocalBestScore();
        this.loadNicknameHistory();
        
        // 检查网络连接并加载网络排行榜
        this.checkNetworkConnection();
        
        // 开始游戏循环
        this.gameLoop();
    }
    
    startGame() {
        // 如果没有玩家昵称，先显示昵称输入界面
        if (!this.playerName) {
            // 如果有历史昵称，自动使用最后一个
            if (this.nicknameHistory.length > 0) {
                this.playerName = this.nicknameHistory[this.nicknameHistory.length - 1];
                // 加载该昵称的最佳成绩
                this.localBestScore = this.getPlayerBestScore(this.playerName);
                console.log('自动使用上次昵称:', this.playerName, '最佳成绩:', this.localBestScore);
            } else {
                this.showNicknameInput();
                return;
            }
        }
        
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
    
    setupUI() {
        // 昵称输入按钮事件
        document.getElementById('confirmNicknameBtn').addEventListener('click', () => {
            this.confirmNickname();
        });
        
        document.getElementById('cancelNicknameBtn').addEventListener('click', () => {
            this.cancelNickname();
        });
        
        // 排行榜按钮事件
        document.getElementById('hideLeaderboardBtn').addEventListener('click', () => {
            this.hideLeaderboard();
        });
        
        document.getElementById('clearLeaderboardBtn').addEventListener('click', () => {
            this.clearLeaderboard();
        });
        
        document.getElementById('refreshNetworkBtn').addEventListener('click', () => {
            this.loadNetworkLeaderboard();
        });
        
        // 排行榜标签切换
        document.getElementById('localTabBtn').addEventListener('click', () => {
            this.switchLeaderboardTab('local');
        });
        
        document.getElementById('networkTabBtn').addEventListener('click', () => {
            this.switchLeaderboardTab('network');
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
        const bullet = new Bullet(this.player.x, this.player.y - this.player.height / 2);
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
                    // 游戏结束时保存分数到排行榜
                    this.saveScoreToLeaderboard();
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
        const levelMultiplier = 1 + (this.lightningLevel - 1) * 0.1; // 每级增加10%
        return Math.floor(baseDamage * levelMultiplier);
    }
    
    setupInput() {
        // 键盘事件监听
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // 游戏状态控制
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                if (this.gameState === 'menu' || this.gameState === 'gameOver') {
                    this.startGame();
                }
            }
            
            // 升级控制
            if (e.code === 'KeyU' && this.gameState === 'playing') {
                this.upgradeLightning();
            }
            
            // 排行榜控制
            if (e.code === 'KeyL' && (this.gameState === 'menu' || this.gameState === 'gameOver')) {
                console.log('按下了L键，显示排行榜');
                this.showLeaderboard();
            }
            
            // 昵称输入确认
            if (e.code === 'Enter' && this.gameState === 'nicknameInput') {
                this.confirmNickname();
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
        this.ctx.fillText('雷电2风格射击游戏', this.canvas.width / 2, this.canvas.height / 2 - 100);
        
        // 绘制说明
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('按空格键或回车键开始游戏', this.canvas.width / 2, this.canvas.height / 2 - 20);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.shadowBlur = 5;
        this.ctx.fillText('WASD或方向键移动战机', this.canvas.width / 2, this.canvas.height / 2 + 30);
        this.ctx.fillText('紫色闪电鞭会自动锁定敌人', this.canvas.width / 2, this.canvas.height / 2 + 60);
        this.ctx.fillText('杀死怪物获得金币，按U键升级闪电', this.canvas.width / 2, this.canvas.height / 2 + 90);
        this.ctx.fillText('按L键查看排行榜', this.canvas.width / 2, this.canvas.height / 2 + 120);
        
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
        this.ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 30);
        
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText(`最终分数: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.shadowBlur = 5;
        this.ctx.fillText('按空格键或回车键重新开始', this.canvas.width / 2, this.canvas.height / 2 + 60);
        
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
        document.getElementById('localBest').textContent = this.localBestScore;
        document.getElementById('currentPlayer').textContent = this.playerName || '未设置';
        
        // 更新网络状态显示
        const networkStatusText = document.getElementById('networkStatusText');
        if (this.isOnline) {
            if (this.demoMode) {
                networkStatusText.textContent = '演示模式';
                networkStatusText.style.color = '#ffff00';
            } else {
                networkStatusText.textContent = '在线';
                networkStatusText.style.color = '#00ff00';
            }
        } else {
            networkStatusText.textContent = '离线';
            networkStatusText.style.color = '#ff0000';
        }
        
        // 渲染升级UI
        this.renderUpgradeUI();
    }
    
    renderUpgradeUI() {
        if (this.gameState !== 'playing') return;
        
        // 计算右上角位置（竖屏模式）
        const uiWidth = 250; // 进一步缩小UI宽度适应竖屏
        const uiHeight = 100; // 保持UI高度
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
        
        // 绘制闪电等级信息
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.fillText(`闪电等级: ${this.lightningLevel}`, uiX + 8, uiY + 50);
        
        // 绘制升级费用和提示
        this.ctx.fillStyle = this.coins >= this.lightningUpgradeCost ? '#00ff00' : '#ff0000';
        this.ctx.fillText(`升级费用: ${this.lightningUpgradeCost}`, uiX + 8, uiY + 75);
        
        // 绘制升级按钮
        const buttonX = uiX + 8;
        const buttonY = uiY + 80;
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
    
    // 排行榜相关方法
    loadLeaderboard() {
        const saved = localStorage.getItem('raidenGameLeaderboard');
        if (saved) {
            this.leaderboard = JSON.parse(saved);
        } else {
            this.leaderboard = [];
        }
    }
    
    saveLeaderboard() {
        localStorage.setItem('raidenGameLeaderboard', JSON.stringify(this.leaderboard));
    }
    
    saveScoreToLeaderboard() {
        if (this.playerName && this.score > 0) {
            const newEntry = {
                name: this.playerName,
                score: this.score,
                date: new Date().toLocaleDateString()
            };
            
            // 保存到本地排行榜
            this.leaderboard.push(newEntry);
            this.leaderboard.sort((a, b) => b.score - a.score);
            this.leaderboard = this.leaderboard.slice(0, 10);
            this.saveLeaderboard();
            
            // 更新本地最好成绩
            if (this.score > this.localBestScore) {
                this.localBestScore = this.score;
                this.saveLocalBestScore();
            }
            
            // 提交到网络排行榜
            this.submitScoreToNetwork(this.playerName, this.score);
        }
    }
    
    showNicknameInput() {
        this.gameState = 'nicknameInput';
        document.getElementById('nicknameInput').style.display = 'block';
        
        // 渲染昵称历史
        this.renderNicknameHistory();
        
        // 清空输入框
        document.getElementById('nicknameField').value = '';
        
        // 如果有历史昵称，自动填入最后一个
        if (this.nicknameHistory.length > 0) {
            const lastNickname = this.nicknameHistory[this.nicknameHistory.length - 1];
            document.getElementById('nicknameField').value = lastNickname;
        }
        
        document.getElementById('nicknameField').focus();
    }
    
    confirmNickname() {
        const nickname = document.getElementById('nicknameField').value.trim();
        if (nickname.length > 0) {
            this.playerName = nickname;
            
            // 保存昵称到历史记录
            this.addNicknameToHistory(nickname);
            
            // 加载该昵称的最佳成绩
            this.localBestScore = this.getPlayerBestScore(nickname);
            
            document.getElementById('nicknameInput').style.display = 'none';
            this.startGame();
        } else {
            alert('请输入有效的昵称！');
        }
    }
    
    cancelNickname() {
        document.getElementById('nicknameInput').style.display = 'none';
        this.gameState = 'menu';
    }
    
    showLeaderboard() {
        console.log('显示排行榜，当前状态:', this.gameState);
        this.gameState = 'leaderboard';
        const leaderboardElement = document.getElementById('leaderboard');
        if (leaderboardElement) {
            leaderboardElement.style.display = 'block';
            this.currentLeaderboardTab = 'local';
            this.switchLeaderboardTab('local');
        } else {
            console.error('找不到排行榜元素');
        }
    }
    
    hideLeaderboard() {
        document.getElementById('leaderboard').style.display = 'none';
        this.gameState = 'menu';
    }
    
    renderLeaderboard() {
        const listElement = document.getElementById('leaderboardList');
        listElement.innerHTML = '';
        
        if (this.leaderboard.length === 0) {
            listElement.innerHTML = '<li>暂无记录</li>';
            return;
        }
        
        this.leaderboard.forEach((entry, index) => {
            const li = document.createElement('li');
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            li.innerHTML = `${medal} ${entry.name} - ${entry.score}分 (${entry.date})`;
            listElement.appendChild(li);
        });
    }
    
    clearLeaderboard() {
        if (confirm('确定要清空本地排行榜吗？')) {
            this.leaderboard = [];
            this.saveLeaderboard();
            this.renderLeaderboard();
        }
    }
    
    // 本地最好成绩相关方法
    loadLocalBestScore() {
        const saved = localStorage.getItem('raidenGameLocalBest');
        if (saved) {
            this.localBestScore = parseInt(saved) || 0;
        }
    }
    
    saveLocalBestScore() {
        localStorage.setItem('raidenGameLocalBest', this.localBestScore.toString());
        
        // 同时保存按昵称分别的最佳成绩
        if (this.playerName) {
            const playerBestKey = `raidenGameBest_${this.playerName}`;
            localStorage.setItem(playerBestKey, this.localBestScore.toString());
        }
    }
    
    // 获取指定昵称的最佳成绩
    getPlayerBestScore(nickname) {
        const playerBestKey = `raidenGameBest_${nickname}`;
        const saved = localStorage.getItem(playerBestKey);
        return saved ? parseInt(saved) : 0;
    }
    
    // 网络连接相关方法
    async checkNetworkConnection() {
        if (this.demoMode) {
            // 演示模式：模拟网络连接
            this.isOnline = true;
            console.log('✅ 演示模式：模拟网络连接正常');
            this.loadNetworkLeaderboard();
        } else {
            // 真实网络连接
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(`${this.serverUrl}/api/status`, {
                    method: 'GET',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    this.isOnline = true;
                    console.log('✅ 网络连接正常，服务器状态:', data);
                    this.loadNetworkLeaderboard();
                } else {
                    this.isOnline = false;
                    console.log('❌ 网络连接失败，状态码:', response.status);
                }
            } catch (error) {
                this.isOnline = false;
                if (error.name === 'AbortError') {
                    console.log('❌ 连接超时');
                } else {
                    console.log('❌ 无法连接到服务器:', error.message);
                }
            }
        }
    }
    
    async loadNetworkLeaderboard() {
        if (!this.isOnline) return;
        
        if (this.demoMode) {
            // 演示模式：从localStorage加载模拟的网络排行榜
            const saved = localStorage.getItem(this.networkLeaderboardKey);
            if (saved) {
                this.networkLeaderboard = JSON.parse(saved);
            } else {
                // 创建一些演示数据
                this.networkLeaderboard = [
                    { name: '游戏大师', score: 50000, date: '2024-01-15T10:30:00.000Z' },
                    { name: '闪电王', score: 45000, date: '2024-01-14T15:20:00.000Z' },
                    { name: '雷电战士', score: 40000, date: '2024-01-13T09:15:00.000Z' },
                    { name: '飞行高手', score: 35000, date: '2024-01-12T14:45:00.000Z' },
                    { name: '射击专家', score: 30000, date: '2024-01-11T11:30:00.000Z' }
                ];
                this.saveNetworkLeaderboard();
            }
            console.log('📊 演示模式：网络排行榜加载成功');
        } else {
            // 真实网络连接
            try {
                const response = await fetch(`${this.serverUrl}/api/leaderboard?limit=50`);
                const data = await response.json();
                
                if (data.success) {
                    this.networkLeaderboard = data.data;
                    console.log('📊 网络排行榜加载成功，共', data.data.length, '条记录');
                } else {
                    console.error('服务器返回错误:', data.error);
                }
            } catch (error) {
                console.error('加载网络排行榜失败:', error);
            }
        }
    }
    
    async submitScoreToNetwork(name, score) {
        if (!this.isOnline) {
            console.log('离线模式，无法提交到网络排行榜');
            return;
        }
        
        if (this.demoMode) {
            // 演示模式：模拟提交到网络排行榜
            const newEntry = {
                name: name,
                score: score,
                date: new Date().toISOString()
            };
            
            this.networkLeaderboard.push(newEntry);
            this.networkLeaderboard.sort((a, b) => b.score - a.score);
            this.networkLeaderboard = this.networkLeaderboard.slice(0, 50); // 只保留前50名
            
            this.saveNetworkLeaderboard();
            
            const rank = this.networkLeaderboard.findIndex(entry => entry.name === name && entry.score === score) + 1;
            console.log(`🎉 演示模式：分数提交成功！排名: ${rank}`);
        } else {
            // 真实网络连接
            try {
                const response = await fetch(`${this.serverUrl}/api/submit-score`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        score: score
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    console.log(`🎉 分数提交成功！排名: ${data.rank}`);
                    // 重新加载网络排行榜
                    await this.loadNetworkLeaderboard();
                } else {
                    console.error('提交分数失败:', data.error);
                    alert(`提交分数失败: ${data.error}`);
                }
            } catch (error) {
                console.error('提交分数到网络失败:', error);
                alert('网络连接失败，无法提交分数');
            }
        }
    }
    
    saveNetworkLeaderboard() {
        localStorage.setItem(this.networkLeaderboardKey, JSON.stringify(this.networkLeaderboard));
    }
    
    // 昵称历史相关方法
    loadNicknameHistory() {
        const saved = localStorage.getItem('raidenGameNicknameHistory');
        if (saved) {
            this.nicknameHistory = JSON.parse(saved);
        } else {
            this.nicknameHistory = [];
        }
    }
    
    saveNicknameHistory() {
        localStorage.setItem('raidenGameNicknameHistory', JSON.stringify(this.nicknameHistory));
    }
    
    addNicknameToHistory(nickname) {
        // 如果昵称已存在，先移除
        const index = this.nicknameHistory.indexOf(nickname);
        if (index > -1) {
            this.nicknameHistory.splice(index, 1);
        }
        
        // 添加到历史记录末尾
        this.nicknameHistory.push(nickname);
        
        // 只保留最近10个昵称
        if (this.nicknameHistory.length > 10) {
            this.nicknameHistory = this.nicknameHistory.slice(-10);
        }
        
        this.saveNicknameHistory();
    }
    
    renderNicknameHistory() {
        const historyList = document.getElementById('nicknameHistoryList');
        historyList.innerHTML = '';
        
        if (this.nicknameHistory.length === 0) {
            historyList.innerHTML = '<p style="color: #666; font-size: 12px;">暂无历史昵称</p>';
            return;
        }
        
        // 倒序显示，最新的在前面
        const reversedHistory = [...this.nicknameHistory].reverse();
        
        reversedHistory.forEach(nickname => {
            const item = document.createElement('div');
            item.className = 'nickname-history-item';
            item.textContent = nickname;
            item.addEventListener('click', () => {
                this.selectNicknameFromHistory(nickname);
            });
            historyList.appendChild(item);
        });
    }
    
    selectNicknameFromHistory(nickname) {
        // 更新输入框
        document.getElementById('nicknameField').value = nickname;
        
        // 更新选中状态
        const items = document.querySelectorAll('.nickname-history-item');
        items.forEach(item => {
            item.classList.remove('selected');
            if (item.textContent === nickname) {
                item.classList.add('selected');
            }
        });
    }
    
    // 排行榜切换方法
    switchLeaderboardTab(tab) {
        this.currentLeaderboardTab = tab;
        
        // 更新标签按钮状态
        document.getElementById('localTabBtn').classList.toggle('active', tab === 'local');
        document.getElementById('networkTabBtn').classList.toggle('active', tab === 'network');
        
        // 渲染对应的排行榜
        if (tab === 'local') {
            this.renderLeaderboard();
        } else {
            this.renderNetworkLeaderboard();
        }
    }
    
    renderNetworkLeaderboard() {
        const listElement = document.getElementById('leaderboardList');
        listElement.innerHTML = '';
        
        if (!this.isOnline) {
            listElement.innerHTML = '<li>网络连接不可用</li>';
            return;
        }
        
        if (this.networkLeaderboard.length === 0) {
            listElement.innerHTML = '<li>暂无网络记录</li>';
            return;
        }
        
        this.networkLeaderboard.forEach((entry, index) => {
            const li = document.createElement('li');
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            const date = new Date(entry.date).toLocaleDateString();
            li.innerHTML = `${medal} ${entry.name} - ${entry.score}分 (${date})`;
            listElement.appendChild(li);
        });
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
        this.width = 28; // 40 * 0.7
        this.height = 35; // 50 * 0.7
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
        return distance < (this.width / 2 + other.width / 2);
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
        
        // 恐怖外星生物主体 - 不规则多边形
        ctx.fillStyle = '#2a0a0a';
        ctx.beginPath();
        ctx.moveTo(this.x + shakeX, this.y + shakeY - this.height / 2);
        ctx.lineTo(this.x + shakeX + this.width / 3, this.y + shakeY - this.height / 4);
        ctx.lineTo(this.x + shakeX + this.width / 2, this.y + shakeY);
        ctx.lineTo(this.x + shakeX + this.width / 3, this.y + shakeY + this.height / 4);
        ctx.lineTo(this.x + shakeX, this.y + shakeY + this.height / 2);
        ctx.lineTo(this.x + shakeX - this.width / 3, this.y + shakeY + this.height / 4);
        ctx.lineTo(this.x + shakeX - this.width / 2, this.y + shakeY);
        ctx.lineTo(this.x + shakeX - this.width / 3, this.y + shakeY - this.height / 4);
        ctx.closePath();
        ctx.fill();
        
        // 主体边缘高光
        ctx.strokeStyle = '#4a1a1a';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 恐怖触手 - 尖锐的刺状
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#1a0505';
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6 + this.time * 0.02;
            const tentacleLength = 15 + Math.sin(this.time * 0.1 + i) * 5;
            const tentacleX = this.x + shakeX + Math.cos(angle) * (this.width / 2 + tentacleLength / 2);
            const tentacleY = this.y + shakeY + Math.sin(angle) * (this.height / 2 + tentacleLength / 2);
            
            ctx.beginPath();
            ctx.moveTo(this.x + shakeX + Math.cos(angle) * this.width / 2, 
                      this.y + shakeY + Math.sin(angle) * this.height / 2);
            ctx.lineTo(tentacleX, tentacleY);
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // 触手尖端
            ctx.beginPath();
            ctx.arc(tentacleX, tentacleY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 恐怖眼睛 - 红色发光
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x + shakeX - 10, this.y + shakeY - 10, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + shakeX + 10, this.y + shakeY - 10, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 眼睛瞳孔 - 黑色
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(this.x + shakeX - 10, this.y + shakeY - 10, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + shakeX + 10, this.y + shakeY - 10, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 恐怖嘴巴 - 锯齿状
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(this.x + shakeX - 8, this.y + shakeY + 8);
        ctx.lineTo(this.x + shakeX - 4, this.y + shakeY + 12);
        ctx.lineTo(this.x + shakeX, this.y + shakeY + 8);
        ctx.lineTo(this.x + shakeX + 4, this.y + shakeY + 12);
        ctx.lineTo(this.x + shakeX + 8, this.y + shakeY + 8);
        ctx.lineTo(this.x + shakeX + 4, this.y + shakeY + 6);
        ctx.lineTo(this.x + shakeX, this.y + shakeY + 10);
        ctx.lineTo(this.x + shakeX - 4, this.y + shakeY + 6);
        ctx.closePath();
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
        
        // 使用单一平滑的贝塞尔曲线，确保没有锐角和钝角
        // 创建更平滑的控制点，避免分段造成的角度问题
        
        // 计算平滑的控制点，确保整条曲线圆滑
        const controlPoint1X = this.startX + Math.cos(angle + Math.PI / 6) * distance * 0.4;
        const controlPoint1Y = this.startY + Math.sin(angle + Math.PI / 6) * distance * 0.4;
        const controlPoint2X = this.primaryTarget.x - Math.cos(angle - Math.PI / 6) * distance * 0.4;
        const controlPoint2Y = this.primaryTarget.y - Math.sin(angle - Math.PI / 6) * distance * 0.4;
        
        this.segments.forEach((segment, index) => {
            const t = index / (this.segments.length - 1);
            
            // 使用单一的三次贝塞尔曲线，确保整条曲线圆滑
            const x = this.cubicBezier(this.startX, controlPoint1X, controlPoint2X, this.primaryTarget.x, t);
            const y = this.cubicBezier(this.startY, controlPoint1Y, controlPoint2Y, this.primaryTarget.y, t);
            
            // 添加动态摆动效果
            const swingIntensity = 25; // 摆动强度（大幅增加摆动效果）
            const swingFrequency = 0.8; // 摆动频率（加快一倍）
            const swingPhase = this.time * swingFrequency;
            
            // 垂直于连线的方向
            const perpAngle = angle + Math.PI / 2;
            
            // 鞭子摆动效果 - 使用平滑的摆动函数，避免锐角
            const smoothSwing = Math.sin(swingPhase + t * Math.PI * 1.5) * swingIntensity * (0.3 + 0.7 * t); // 平滑摆动，从起点到终点逐渐增强
            
            // 添加细微的随机抖动
            const microJitter = Math.sin(this.time * 0.8 + t * Math.PI * 15 + index * 0.2) * 1 * Math.sin(t * Math.PI);
            const randomJitter = (Math.random() - 0.5) * 0.5 * Math.sin(t * Math.PI);
            
            // 应用摆动和抖动
            segment.x = x + Math.cos(perpAngle) * (smoothSwing + microJitter + randomJitter);
            segment.y = y + Math.sin(perpAngle) * (smoothSwing + microJitter + randomJitter);
            
            segment.swingOffset = Math.abs(smoothSwing);
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

// 子弹类
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 12;
        this.speed = 8;
        this.damage = 10; // 增加子弹伤害到10
        this.active = true;
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
