/* ============================
   dashboard.js - ホーム画面（ダッシュボード）
   月間カレンダー＋月ナビ付き
   ============================ */

const Dashboard = (() => {
  // カレンダー表示中の年月（月ナビで変更可能）
  let _calYear = new Date().getFullYear();
  let _calMonth = new Date().getMonth() + 1;

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

    // --- 月間カレンダー ---
    html += _renderMonthlyCalendar();

    // --- 週間サマリー ---
    html += `
      <div class="summary-grid">
        <div class="card card-compact summary-card">
          <div class="summary-value">${summary.trainingDays} <span style="font-size:0.875rem;font-weight:400;color:var(--color-text-secondary)">/ 7日</span></div>
          <div class="summary-label">今週のトレーニング</div>
        </div>
        <div class="card card-compact summary-card">
          <div class="summary-value">${UI.formatVolume(summary.totalVolume)}</div>
          <div class="summary-label">週間ボリューム (kg)</div>
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

  function _renderMonthlyCalendar() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const firstDay = new Date(_calYear, _calMonth - 1, 1);
    const lastDay = new Date(_calYear, _calMonth, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // 月曜始まり
    const dayHeaders = ['月', '火', '水', '木', '金', '土', '日'];

    // 月のワークアウトを取得
    const monthWorkouts = DataManager.getWorkouts(_calYear, _calMonth);
    const workoutsByDate = {};
    monthWorkouts.forEach(w => {
      const d = w.date || DataManager.getTrainingDate(w.startTime);
      if (!workoutsByDate[d]) workoutsByDate[d] = [];
      workoutsByDate[d].push(w);
    });

    // 月のトレーニング日数を集計
    const monthTrainingDays = Object.keys(workoutsByDate).length;

    let html = `
      <div class="card" style="padding:16px;margin-bottom:20px;">
        <div class="calendar-month-nav">
          <button class="btn btn-icon btn-ghost" id="dash-cal-prev" aria-label="前月">◀</button>
          <h3>${_calYear}年${_calMonth}月 <span style="font-size:0.75rem;font-weight:400;color:var(--color-text-secondary);">${monthTrainingDays}日トレーニング</span></h3>
          <button class="btn btn-icon btn-ghost" id="dash-cal-next" aria-label="翌月">▶</button>
        </div>
        <div class="dashboard-calendar">
    `;

    // 曜日ヘッダー
    dayHeaders.forEach((d, i) => {
      const isSat = i === 5, isSun = i === 6;
      const color = isSun ? 'var(--color-danger)' : isSat ? 'var(--color-primary)' : 'var(--color-text-hint)';
      html += `<div class="calendar-header-cell" style="color:${color}">${d}</div>`;
    });

    // 前月の空セル
    const prevMonth = new Date(_calYear, _calMonth - 2, 1);
    const prevLastDay = new Date(_calYear, _calMonth - 1, 0).getDate();
    for (let i = 0; i < startDayOfWeek; i++) {
      const day = prevLastDay - startDayOfWeek + 1 + i;
      html += `<div class="dashboard-cal-cell other-month"><span class="cal-day-num">${day}</span></div>`;
    }

    // 当月のセル
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${_calYear}-${String(_calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const dayWorkouts = workoutsByDate[dateStr] || [];
      const cats = new Set();
      dayWorkouts.forEach(w => DataManager.getWorkoutCategories(w).forEach(c => cats.add(c)));
      const hasWorkout = dayWorkouts.length > 0;

      html += `
          <div class="dashboard-cal-cell${isToday ? ' today' : ''}${hasWorkout ? ' has-workout' : ''}">
            <span class="cal-day-num">${d}</span>
            ${hasWorkout ? `<div class="cal-dots">${[...cats].slice(0, 3).map(c => `<div class="cal-dot" style="background:${DataManager.CATEGORY_COLORS[c] || 'var(--color-other)'}"></div>`).join('')}</div>` : ''}
          </div>
        `;
    }

    // 翌月の空セル（6行×7列=42セルになるよう埋める）
    const totalCells = startDayOfWeek + lastDay.getDate();
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="dashboard-cal-cell other-month"><span class="cal-day-num">${i}</span></div>`;
    }

    html += `
        </div>
      </div>
    `;
    return html;
  }

  function _bindEvents() {
    // カレンダー月ナビ
    document.getElementById('dash-cal-prev')?.addEventListener('click', () => {
      _calMonth--;
      if (_calMonth < 1) { _calMonth = 12; _calYear--; }
      render();
    });
    document.getElementById('dash-cal-next')?.addEventListener('click', () => {
      _calMonth++;
      if (_calMonth > 12) { _calMonth = 1; _calYear++; }
      render();
    });

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
