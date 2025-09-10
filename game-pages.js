// 雷电2风格飞行射击游戏 - GitHub Pages版本
class RaidenGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 720;
        this.canvas.height = 1280;
        
        // 游戏状态
        this.gameState = 'menu';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.playerName = '';
        this.nicknameHistory = [];
        this.leaderboard = [];
        this.localBestScore = 0;
        this.networkLeaderboard = [];
        this.isOnline = true; // GitHub Pages版本始终在线
        this.demoMode = true; // 强制演示模式
        
        // 升级系统
        this.coins = 0;
        this.lightningLevel = 1;
        this.lightningUpgradeCost = 10;
        
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
        this.enemySpawnInterval = 225;
        this.bulletSpawnTimer = 0;
        this.bulletSpawnInterval = 100;
        
        this.init();
    }
    
    init() {
        this.createStars();
        this.loadLeaderboard();
        this.loadLocalBestScore();
        this.loadNicknameHistory();
        this.loadNetworkLeaderboard();
        this.gameLoop();
    }
    
    startGame() {
        if (!this.playerName) {
            if (this.nicknameHistory.length > 0) {
                this.playerName = this.nicknameHistory[this.nicknameHistory.length - 1];
                this.localBestScore = this.getPlayerBestScore(this.playerName);
            } else {
                this.showNicknameInput();
                return;
            }
        }
        
        this.gameState = 'playing';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.coins = 0;
        this.lightningLevel = 1;
        this.lightningUpgradeCost = 10;
        this.enemies = [];
        this.lightningWhips = [];
        this.particles = [];
        
        this.player = new Player(this.canvas.width / 2, this.canvas.height - 100);
        
        this.player.fireLightningWhip = () => {
            const hasEnemies = this.enemies.some(enemy => !enemy.isDead);
            if (hasEnemies && !this.player.lightningWhip) {
                const whip = new LightningWhip(this.player.x, this.player.y, this);
                this.player.lightningWhip = whip;
                this.lightningWhips.push(whip);
            }
        };
    }
    
    // 简化的网络功能 - 仅使用localStorage
    loadNetworkLeaderboard() {
        const saved = localStorage.getItem('raidenGameNetworkLeaderboard');
        if (saved) {
            this.networkLeaderboard = JSON.parse(saved);
        } else {
            this.networkLeaderboard = [
                { name: 'GitHub玩家1', score: 50000, date: '2024-01-15T10:30:00.000Z' },
                { name: 'GitHub玩家2', score: 45000, date: '2024-01-14T15:20:00.000Z' },
                { name: 'GitHub玩家3', score: 40000, date: '2024-01-13T09:15:00.000Z' },
                { name: 'GitHub玩家4', score: 35000, date: '2024-01-12T14:45:00.000Z' },
                { name: 'GitHub玩家5', score: 30000, date: '2024-01-11T11:30:00.000Z' }
            ];
            this.saveNetworkLeaderboard();
        }
    }
    
    submitScoreToNetwork(name, score) {
        const newEntry = {
            name: name,
            score: score,
            date: new Date().toISOString()
        };
        
        this.networkLeaderboard.push(newEntry);
        this.networkLeaderboard.sort((a, b) => b.score - a.score);
        this.networkLeaderboard = this.networkLeaderboard.slice(0, 50);
        
        this.saveNetworkLeaderboard();
        
        const rank = this.networkLeaderboard.findIndex(entry => entry.name === name && entry.score === score) + 1;
        console.log(`🎉 分数提交成功！排名: ${rank}`);
    }
    
    saveNetworkLeaderboard() {
        localStorage.setItem('raidenGameNetworkLeaderboard', JSON.stringify(this.networkLeaderboard));
    }
    
    // 其他方法保持不变...
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
            
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                if (this.gameState === 'menu' || this.gameState === 'gameOver') {
                    this.startGame();
                }
            }
            
            if (e.code === 'KeyU' && this.gameState === 'playing') {
                this.upgradeLightning();
            }
            
            if (e.code === 'KeyL' && (this.gameState === 'menu' || this.gameState === 'gameOver')) {
                this.showLeaderboard();
            }
            
            if (e.code === 'Enter' && this.gameState === 'nicknameInput') {
                this.confirmNickname();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // 鼠标和触屏事件
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            this.isMouseDown = false;
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                const rect = this.canvas.getBoundingClientRect();
                this.touchX = e.touches[0].clientX - rect.left;
                this.touchY = e.touches[0].clientY - rect.top;
                this.isTouchDown = true;
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
    
    setupUI() {
        document.getElementById('confirmNicknameBtn').addEventListener('click', () => {
            this.confirmNickname();
        });
        
        document.getElementById('cancelNicknameBtn').addEventListener('click', () => {
            this.cancelNickname();
        });
        
        document.getElementById('hideLeaderboardBtn').addEventListener('click', () => {
            this.hideLeaderboard();
        });
        
        document.getElementById('clearLeaderboardBtn').addEventListener('click', () => {
            this.clearLeaderboard();
        });
        
        document.getElementById('refreshNetworkBtn').addEventListener('click', () => {
            this.loadNetworkLeaderboard();
        });
        
        document.getElementById('localTabBtn').addEventListener('click', () => {
            this.switchLeaderboardTab('local');
        });
        
        document.getElementById('networkTabBtn').addEventListener('click', () => {
            this.switchLeaderboardTab('network');
        });
    }
    
    // 简化的游戏逻辑 - 只包含核心功能
    update(deltaTime) {
        this.updateStars(deltaTime);
        
        if (this.gameState !== 'playing') return;
        
        if (this.player) {
            this.player.update(deltaTime, this.keys, this);
        }
        
        this.updateEnemies(deltaTime);
        this.updateLightningWhips(deltaTime);
        this.updateBullets(deltaTime);
        this.updateParticles(deltaTime);
        this.spawnEnemies(deltaTime);
        this.spawnBullets(deltaTime);
        this.checkCollisions();
        this.cleanup();
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
        if (this.player) {
            const bullet = new Bullet(this.player.x, this.player.y - this.player.height / 2);
            this.bullets.push(bullet);
        }
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
                    bullet.active = false;
                    if (enemy.isDead) {
                        this.score += enemy.scoreValue;
                        this.coins += 1;
                        this.createExplosion(enemy.x, enemy.y);
                    }
                }
            });
        });
        
        // 玩家与敌人碰撞
        if (this.player) {
            this.enemies.forEach(enemy => {
                if (!enemy.isDead && this.player.checkCollision(enemy)) {
                    this.player.takeDamage(1);
                    enemy.takeDamage(999);
                    this.createExplosion(enemy.x, enemy.y);
                    if (this.player.lives <= 0) {
                        this.gameState = 'gameOver';
                        this.saveScoreToLeaderboard();
                    }
                }
            });
        }
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(x, y, 'explosion'));
        }
    }
    
    upgradeLightning() {
        if (this.coins >= this.lightningUpgradeCost) {
            this.coins -= this.lightningUpgradeCost;
            this.lightningLevel++;
            this.lightningUpgradeCost = Math.floor(this.lightningUpgradeCost * 1.2);
        }
    }
    
    getLightningDamage() {
        const baseDamage = 2;
        const levelMultiplier = 1 + (this.lightningLevel - 1) * 0.1;
        return Math.floor(baseDamage * levelMultiplier);
    }
    
    cleanup() {
        this.enemies = this.enemies.filter(enemy => !enemy.isDead && enemy.y < this.canvas.height + 100);
        this.lightningWhips = this.lightningWhips.filter(whip => whip.isActive);
        this.bullets = this.bullets.filter(bullet => bullet.active);
        this.particles = this.particles.filter(particle => particle.isActive);
        
        if (this.player && this.player.lightningWhip && !this.player.lightningWhip.isActive) {
            this.player.lightningWhip = null;
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.renderStars();
        
        if (this.gameState === 'menu') {
            this.renderMenu();
        } else if (this.gameState === 'playing') {
            this.renderGame();
        } else if (this.gameState === 'gameOver') {
            this.renderGame();
            this.renderGameOver();
        }
        
        this.updateUI();
    }
    
    renderMenu() {
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 20;
        this.ctx.fillText('雷电2风格射击游戏', this.canvas.width / 2, this.canvas.height / 2 - 100);
        
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
        this.ctx.fillText('GitHub Pages版本 - 演示模式', this.canvas.width / 2, this.canvas.height / 2 + 150);
        
        this.ctx.shadowBlur = 0;
    }
    
    renderGame() {
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
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
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
        
        const networkStatusText = document.getElementById('networkStatusText');
        networkStatusText.textContent = 'GitHub Pages';
        networkStatusText.style.color = '#00ff00';
        
        this.renderUpgradeUI();
    }
    
    renderUpgradeUI() {
        if (this.gameState !== 'playing') return;
        
        const uiWidth = 250;
        const uiHeight = 100;
        const uiX = this.canvas.width - uiWidth - 10;
        const uiY = 20;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(uiX, uiY, uiWidth, uiHeight);
        
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(uiX, uiY, uiWidth, uiHeight);
        
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.shadowColor = '#ffff00';
        this.ctx.shadowBlur = 5;
        this.ctx.fillText(`金币: ${this.coins}`, uiX + 8, uiY + 25);
        
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.fillText(`闪电等级: ${this.lightningLevel}`, uiX + 8, uiY + 50);
        
        this.ctx.fillStyle = this.coins >= this.lightningUpgradeCost ? '#00ff00' : '#ff0000';
        this.ctx.fillText(`升级费用: ${this.lightningUpgradeCost}`, uiX + 8, uiY + 75);
        
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
            
            this.leaderboard.push(newEntry);
            this.leaderboard.sort((a, b) => b.score - a.score);
            this.leaderboard = this.leaderboard.slice(0, 10);
            this.saveLeaderboard();
            
            if (this.score > this.localBestScore) {
                this.localBestScore = this.score;
                this.saveLocalBestScore();
            }
            
            this.submitScoreToNetwork(this.playerName, this.score);
        }
    }
    
    loadLocalBestScore() {
        const saved = localStorage.getItem('raidenGameLocalBest');
        if (saved) {
            this.localBestScore = parseInt(saved) || 0;
        }
    }
    
    saveLocalBestScore() {
        localStorage.setItem('raidenGameLocalBest', this.localBestScore.toString());
        if (this.playerName) {
            const playerBestKey = `raidenGameBest_${this.playerName}`;
            localStorage.setItem(playerBestKey, this.localBestScore.toString());
        }
    }
    
    getPlayerBestScore(nickname) {
        const playerBestKey = `raidenGameBest_${nickname}`;
        const saved = localStorage.getItem(playerBestKey);
        return saved ? parseInt(saved) : 0;
    }
    
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
        const index = this.nicknameHistory.indexOf(nickname);
        if (index > -1) {
            this.nicknameHistory.splice(index, 1);
        }
        
        this.nicknameHistory.push(nickname);
        
        if (this.nicknameHistory.length > 10) {
            this.nicknameHistory = this.nicknameHistory.slice(-10);
        }
        
        this.saveNicknameHistory();
    }
    
    showNicknameInput() {
        this.gameState = 'nicknameInput';
        document.getElementById('nicknameInput').style.display = 'block';
        this.renderNicknameHistory();
        document.getElementById('nicknameField').value = '';
        
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
            this.addNicknameToHistory(nickname);
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
        this.gameState = 'leaderboard';
        document.getElementById('leaderboard').style.display = 'block';
        this.currentLeaderboardTab = 'local';
        this.switchLeaderboardTab('local');
    }
    
    hideLeaderboard() {
        document.getElementById('leaderboard').style.display = 'none';
        this.gameState = 'menu';
    }
    
    switchLeaderboardTab(tab) {
        this.currentLeaderboardTab = tab;
        
        document.getElementById('localTabBtn').classList.toggle('active', tab === 'local');
        document.getElementById('networkTabBtn').classList.toggle('active', tab === 'network');
        
        if (tab === 'local') {
            this.renderLeaderboard();
        } else {
            this.renderNetworkLeaderboard();
        }
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
    
    renderNetworkLeaderboard() {
        const listElement = document.getElementById('leaderboardList');
        listElement.innerHTML = '';
        
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
    
    clearLeaderboard() {
        if (confirm('确定要清空本地排行榜吗？')) {
            this.leaderboard = [];
            this.saveLeaderboard();
            this.renderLeaderboard();
        }
    }
    
    renderNicknameHistory() {
        const historyList = document.getElementById('nicknameHistoryList');
        historyList.innerHTML = '';
        
        if (this.nicknameHistory.length === 0) {
            historyList.innerHTML = '<p style="color: #666; font-size: 12px;">暂无历史昵称</p>';
            return;
        }
        
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
        document.getElementById('nicknameField').value = nickname;
        
        const items = document.querySelectorAll('.nickname-history-item');
        items.forEach(item => {
            item.classList.remove('selected');
            if (item.textContent === nickname) {
                item.classList.add('selected');
            }
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

// 游戏类定义保持不变...
// Player, Enemy, LightningWhip, Bullet, Particle 类的定义与原版相同

// 启动游戏
window.addEventListener('load', () => {
    const game = new RaidenGame();
});
