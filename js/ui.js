/* ============================
   ui.js - 共通UI部品
   トースト、モーダル、ボトムシート、タイマー、パーティクル
   ============================ */

const UI = (() => {
    // --- トースト通知 ---
    function showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // --- モーダル ---
    let _modalResolve = null;

    function showModal(contentHTML) {
        const overlay = document.getElementById('modal-overlay');
        const content = document.getElementById('modal-content');
        content.innerHTML = contentHTML;
        overlay.classList.remove('hidden');
        requestAnimationFrame(() => overlay.classList.add('visible'));
        return new Promise(resolve => { _modalResolve = resolve; });
    }

    function closeModal(result) {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('visible');
        setTimeout(() => overlay.classList.add('hidden'), 300);
        if (_modalResolve) { _modalResolve(result); _modalResolve = null; }
    }

    // 確認ダイアログのショートカット
    function confirm(title, message, confirmText = '確認', cancelText = 'キャンセル', danger = false) {
        return showModal(`
      <h2>${title}</h2>
      <p>${message}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">${cancelText}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">${confirmText}</button>
      </div>
    `).then(() => { });
    }

    // モーダルのボタンイベント（委任）
    document.addEventListener('click', (e) => {
        if (e.target.id === 'modal-confirm') closeModal(true);
        else if (e.target.id === 'modal-cancel') closeModal(false);
        else if (e.target.id === 'modal-overlay' || e.target.classList.contains('modal-overlay')) {
            if (e.target === document.getElementById('modal-overlay')) closeModal(false);
        }
    });

    // --- ボトムシート ---
    function showBottomSheet(contentHTML) {
        const overlay = document.getElementById('bottom-sheet-overlay');
        const content = document.getElementById('bottom-sheet-content');
        content.innerHTML = contentHTML;
        overlay.classList.remove('hidden');
        requestAnimationFrame(() => overlay.classList.add('visible'));
    }

    function closeBottomSheet() {
        const overlay = document.getElementById('bottom-sheet-overlay');
        overlay.classList.remove('visible');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }

    // ボトムシートオーバーレイクリックで閉じる
    document.addEventListener('click', (e) => {
        if (e.target.id === 'bottom-sheet-overlay') closeBottomSheet();
    });

    // --- 休憩タイマー ---
    let restTimerInterval = null;
    let restTimerEndTime = null;
    let restTimerDuration = 0;

    function startRestTimer(durationSec) {
        stopRestTimer();
        restTimerDuration = durationSec;
        restTimerEndTime = Date.now() + durationSec * 1000;
        const bar = document.getElementById('rest-timer-bar');
        bar.classList.remove('hidden');
        _updateRestTimerDisplay();
        restTimerInterval = setInterval(_updateRestTimerDisplay, 250);
    }

    function _updateRestTimerDisplay() {
        const remaining = Math.max(0, Math.ceil((restTimerEndTime - Date.now()) / 1000));
        document.getElementById('rest-timer-seconds').textContent = remaining;
        // 円形プログレス
        const circle = document.getElementById('rest-timer-circle');
        const circumference = 2 * Math.PI * 26; // r=26
        const progress = remaining / restTimerDuration;
        circle.style.strokeDashoffset = circumference * (1 - progress);

        if (remaining <= 0) {
            stopRestTimer();
            showToast('休憩終了！💪', 'info');
            // 振動 (対応端末)
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
    }

    function addRestTime(seconds) {
        if (restTimerEndTime) {
            restTimerEndTime += seconds * 1000;
            restTimerDuration += seconds;
        }
    }

    function stopRestTimer() {
        if (restTimerInterval) { clearInterval(restTimerInterval); restTimerInterval = null; }
        const bar = document.getElementById('rest-timer-bar');
        bar.classList.add('hidden');
        restTimerEndTime = null;
    }

    // 休憩タイマーボタンイベント
    document.addEventListener('click', (e) => {
        if (e.target.id === 'rest-timer-add30') addRestTime(30);
        if (e.target.id === 'rest-timer-skip') stopRestTimer();
    });

    // --- パーティクル演出（PR更新時） ---
    function showParticles() {
        const canvas = document.getElementById('particle-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ['#FFD700', '#FF6B6B', '#00D4FF', '#39FF14', '#FFE66D', '#FF8B94'];
        for (let i = 0; i < 80; i++) {
            particles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 200,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 12,
                vy: Math.random() * -14 - 4,
                size: Math.random() * 6 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1,
                decay: Math.random() * 0.015 + 0.008,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
            });
        }

        let frame;
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;
            for (const p of particles) {
                if (p.life <= 0) continue;
                alive = true;
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.3; // 重力
                p.life -= p.decay;
                p.rotation += p.rotSpeed;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            }
            if (alive) { frame = requestAnimationFrame(animate); }
            else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
        }
        animate();
        // 3秒後に強制クリア
        setTimeout(() => {
            cancelAnimationFrame(frame);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, 3000);
    }

    // --- フォーマット ---
    function formatDuration(minutes) {
        if (minutes < 60) return `${minutes}分`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}時間${m}分` : `${h}時間`;
    }

    function formatTimer(ms) {
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function formatVolume(vol) {
        return vol.toLocaleString('ja-JP');
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`;
    }

    function getGreeting() {
        const h = new Date().getHours();
        if (h >= 5 && h < 11) return 'おはようございます';
        if (h >= 11 && h < 17) return 'こんにちは';
        return 'こんばんは';
    }

    // 部位チップHTML生成
    function categoryChipHTML(category) {
        const name = DataManager.CATEGORY_NAMES[category] || category;
        return `<span class="chip chip-${category}">${name}</span>`;
    }

    return {
        showToast, showModal, closeModal, confirm,
        showBottomSheet, closeBottomSheet,
        startRestTimer, addRestTime, stopRestTimer,
        showParticles,
        formatDuration, formatTimer, formatVolume, formatDate, getGreeting, categoryChipHTML,
    };
})();
