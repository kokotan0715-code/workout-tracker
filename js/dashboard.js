/* ============================
   dashboard.js - ホーム画面（ダッシュボード）
   ============================ */

const Dashboard = (() => {
    function render() {
        const container = document.getElementById('dashboard-content');
        const profile = DataManager.getProfile();
        const active = DataManager.getActiveWorkout();
        const summary = DataManager.getWeeklySummary();
        const recent = DataManager.getRecentWorkouts(5);

        let html = '';

        // --- 挨拶ヘッダー ---
        const greeting = UI.getGreeting();
        const nickname = profile.nickname || '';
        const today = new Date();
        const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        html += `
      <div class="greeting-header">
        <h1>${greeting}${nickname ? '、' + nickname : ''}</h1>
        <div class="date-text">${dateStr}</div>
      </div>
    `;

        // --- 進行中ワークアウト復帰バナー ---
        if (active) {
            const elapsed = Date.now() - active.startTime;
            html += `
        <div class="resume-banner" id="resume-banner">
          <div class="resume-info">
            <h3>⚡ 進行中のワークアウトがあります</h3>
            <p>経過時間: ${UI.formatTimer(elapsed)}</p>
          </div>
          <button class="btn btn-primary btn-sm btn-resume" id="resume-workout-btn">再開する</button>
          <button class="btn-dismiss" id="dismiss-workout-btn" aria-label="破棄">×</button>
        </div>
      `;
        }

        // --- 週間カレンダー ---
        html += _renderWeeklyCalendar(today);

        // --- 週間サマリー ---
        html += `
      <div class="summary-grid">
        <div class="card card-compact summary-card">
          <div class="summary-value">${summary.trainingDays} <span style="font-size:0.875rem;font-weight:400;color:var(--color-text-secondary)">/ 7日</span></div>
          <div class="summary-label">トレーニング日数</div>
        </div>
        <div class="card card-compact summary-card">
          <div class="summary-value">${UI.formatVolume(summary.totalVolume)}</div>
          <div class="summary-label">総ボリューム (kg)</div>
        </div>
        <div class="card card-compact summary-card">
          <div class="summary-value">🔥 ${summary.streak}</div>
          <div class="summary-label">連続日数</div>
        </div>
      </div>
    `;

        // --- ワークアウト開始ボタン ---
        const emptyClass = recent.length === 0 ? 'empty-state-cta' : '';
        html += `
      <div class="${emptyClass}">
        <button class="btn start-workout-btn" id="start-workout-btn">💪 ワークアウトを開始</button>
      </div>
    `;

        if (recent.length === 0) {
            html += `<p style="text-align:center;color:var(--color-text-secondary);margin-bottom:32px;">最初のワークアウトを記録しよう！</p>`;
        }

        // --- 最近のワークアウト ---
        if (recent.length > 0) {
            html += `<h2 class="section-title">最近のワークアウト</h2>`;
            for (const w of recent) {
                const cats = DataManager.getWorkoutCategories(w);
                const vol = DataManager.calcWorkoutVolume(w);
                const dur = DataManager.calcDuration(w);
                const sets = DataManager.calcCompletedSets(w);
                const date = w.date || DataManager.getTrainingDate(w.startTime);
                html += `
          <div class="card card-compact card-clickable recent-workout-card" data-workout-id="${w.id}" data-date="${date}">
            <div class="workout-meta">
              <div class="workout-date">${UI.formatDate(date)}</div>
              <div class="workout-chips">${cats.map(c => UI.categoryChipHTML(c)).join('')}</div>
              <div class="workout-stats">
                <span>${w.exercises.length}種目 / ${sets}セット</span>
                <span>${UI.formatVolume(vol)} kg</span>
                ${dur > 0 ? `<span>${UI.formatDuration(dur)}</span>` : ''}
              </div>
            </div>
          </div>
        `;
            }
        }

        container.innerHTML = html;
        _bindEvents();
    }

    function _renderWeeklyCalendar(today) {
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
        const dayNames = ['月', '火', '水', '木', '金', '土', '日'];
        let html = '<div class="weekly-calendar">';

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const isToday = dateStr === today.toISOString().split('T')[0];
            const workouts = DataManager.getWorkoutsByDate(dateStr);
            const cats = new Set();
            workouts.forEach(w => DataManager.getWorkoutCategories(w).forEach(c => cats.add(c)));

            html += `
        <div class="day-cell${isToday ? ' today' : ''}">
          <div class="day-label">${dayNames[i]}</div>
          <div class="day-number">${d.getDate()}</div>
          <div class="day-dots">
            ${[...cats].slice(0, 3).map(c => `<div class="day-dot" style="background:${DataManager.CATEGORY_COLORS[c] || 'var(--color-other)'}"></div>`).join('')}
          </div>
        </div>
      `;
        }
        html += '</div>';
        return html;
    }

    function _bindEvents() {
        // ワークアウト開始
        const startBtn = document.getElementById('start-workout-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                EventBus.emit('start-workout');
            });
        }

        // 復帰
        const resumeBtn = document.getElementById('resume-workout-btn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                EventBus.emit('resume-workout');
            });
        }

        // 破棄
        const dismissBtn = document.getElementById('dismiss-workout-btn');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', async () => {
                const result = await UI.showModal(`
          <h2>ワークアウトを破棄</h2>
          <p>進行中のワークアウトを破棄しますか？記録は失われます。</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
            <button class="btn btn-danger" id="modal-confirm">破棄する</button>
          </div>
        `);
                if (result) {
                    DataManager.clearActiveWorkout();
                    render();
                    UI.showToast('ワークアウトを破棄しました', 'info');
                }
            });
        }

        // 最近のワークアウトクリック
        document.querySelectorAll('.recent-workout-card').forEach(card => {
            card.addEventListener('click', () => {
                EventBus.emit('navigate', 'history');
            });
        });
    }

    return { render };
})();
