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
    const templates = DataManager.getTemplates();

    let html = '';

    // --- 挨拶ヘッダー（日付表示を削除） ---
    html += `
      <div class="greeting-header">
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

    // --- 部位別経過日数 ---
    html += _renderBodyPartElapsed();

    // --- BIG3 推定MAX ---
    html += _renderBig3Max();

    // 週間サマリー（今週のトレーニング日数、連続日数のカードは削除）
    // 週間ボリュームはカレンダーの横に表示するためここでは何も表示しない

    // --- ワークアウト開始ボタン ---
    const emptyClass = recent.length === 0 ? 'empty-state-cta' : '';
    html += `
      <div class="${emptyClass}">
        <button class="btn start-workout-btn" id="start-workout-btn" style="margin-bottom:16px;">🏋️ ワークアウト開始 🏋️</button>
      </div>
    `;

    // --- ルーティン（テンプレート）から開始 ---
    if (templates.length > 0) {
      html += `<h2 class="section-title">ルーティンから開始</h2>
               <div class="template-list" style="display:flex;gap:12px;overflow-x:auto;padding-bottom:16px;margin-bottom:16px;">`;
      for (const t of templates) {
        html += `
          <div class="card card-compact card-clickable start-template-btn" data-id="${t.id}" style="min-width:140px;flex:0 0 auto;border:1px solid var(--color-border);">
            <div style="font-weight:600;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.name}</div>
            <div style="font-size:0.75rem;color:var(--color-text-secondary);">${t.exercises.length}種目</div>
          </div>
        `;
      }
      html += `</div>`;
    }

    // 最初のワークアウトを記録しようメッセージを削除

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

    const summary = DataManager.getWeeklySummary();

    let html = `
      <div class="card" style="padding:16px;margin-bottom:20px;">
        <div class="calendar-month-nav" style="justify-content: flex-start; gap: 8px;">
          <button class="btn btn-icon btn-ghost" id="dash-cal-prev" aria-label="前月">◀</button>
          <h3 style="flex-grow: 1; text-align: center;">${_calYear}年${_calMonth}月</h3>
          <button class="btn btn-icon btn-ghost" id="dash-cal-next" aria-label="翌月">▶</button>
        </div>
        <div class="dashboard-calendar" style="grid-template-columns: repeat(7, 1fr) 2fr;">
    `;

    // 曜日・週間ボリュームヘッダー
    dayHeaders.forEach((d, i) => {
      const isSat = i === 5, isSun = i === 6;
      const color = isSun ? 'var(--color-danger)' : isSat ? 'var(--color-primary)' : 'var(--color-text-hint)';
      html += `<div class="calendar-header-cell" style="color:${color}">${d}</div>`;
    });
    html += `<div class="calendar-header-cell" style="color:var(--color-text-secondary); font-size:0.6rem;">週間Vol</div>`;

    // セル生成と週ごとのボリューム計算
    let currentWeekVolume = 0;
    let cellCount = 0;

    const addCell = (cellHtml, dateStrForVolume = null) => {
      html += cellHtml;
      if (dateStrForVolume && workoutsByDate[dateStrForVolume]) {
        workoutsByDate[dateStrForVolume].forEach(w => {
          currentWeekVolume += DataManager.calcWorkoutVolume(w);
        });
      }
      cellCount++;

      // 日曜日（週の終わり）に到達したらボリューム列を追加
      if (cellCount % 7 === 0) {
        html += `<div class="dashboard-cal-cell" style="display:flex; align-items:center; justify-content:center; font-size:0.75rem; color:var(--color-text-secondary); font-variant-numeric: tabular-nums;">${UI.formatVolume(currentWeekVolume)}kg</div>`;
        currentWeekVolume = 0; // 次の週のためにリセット
      }
    };

    // 前月の空セル
    const prevMonth = new Date(_calYear, _calMonth - 2, 1);
    const prevLastDay = new Date(_calYear, _calMonth - 1, 0).getDate();
    for (let i = 0; i < startDayOfWeek; i++) {
      const day = prevLastDay - startDayOfWeek + 1 + i;
      addCell(`<div class="dashboard-cal-cell other-month"><span class="cal-day-num">${day}</span></div>`);
    }

    // 当月のセル
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${_calYear}-${String(_calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const dayWorkouts = workoutsByDate[dateStr] || [];
      const cats = new Set();
      dayWorkouts.forEach(w => DataManager.getWorkoutCategories(w).forEach(c => cats.add(c)));
      const hasWorkout = dayWorkouts.length > 0;

      addCell(`
          <div class="dashboard-cal-cell${isToday ? ' today' : ''}${hasWorkout ? ' has-workout' : ''}" data-date="${dateStr}">
            <span class="cal-day-num">${d}</span>
            ${hasWorkout ? `<div class="cal-dots">${[...cats].slice(0, 3).map(c => `<div class="cal-dot" style="background:${DataManager.CATEGORY_COLORS[c] || 'var(--color-other)'}">${DataManager.CATEGORY_NAMES[c] ? DataManager.CATEGORY_NAMES[c][0] : ''}</div>`).join('')}</div>` : ''}
          </div>
        `, dateStr);
    }

    // 翌月の空セル
    const totalCells = startDayOfWeek + lastDay.getDate();
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      addCell(`<div class="dashboard-cal-cell other-month"><span class="cal-day-num">${i}</span></div>`);
    }

    html += `
        </div>
      </div>
    `;
    return html;
  }

  // --- 部位別経過日数 ---
  function _renderBodyPartElapsed() {
    const allWorkouts = DataManager.getRecentWorkouts(999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 各部位の最終トレーニング日を取得
    const categoryKeys = ['chest', 'back', 'shoulder', 'arms', 'legs', 'abs'];
    const lastDates = {};

    for (const w of allWorkouts) {
      const cats = DataManager.getWorkoutCategories(w);
      const wDate = w.date || DataManager.getTrainingDate(w.startTime);
      for (const cat of cats) {
        if (!categoryKeys.includes(cat)) continue;
        if (!lastDates[cat] || wDate > lastDates[cat]) {
          lastDates[cat] = wDate;
        }
      }
    }

    // 経過日数を計算して色分け
    const getElapsedColor = (days) => {
      if (days <= 2) return 'var(--color-success)';     // 緑：直近
      if (days <= 4) return 'var(--color-primary)';     // 青：良好
      if (days <= 7) return 'var(--color-gold)';        // 金：そろそろ
      return 'var(--color-danger)';                     // 赤：やばい
    };

    const categoryEmoji = {
      chest: '🫁', back: '🔙', shoulder: '💪',
      arms: '💪', legs: '🦵', abs: '🎯',
    };

    let html = `
      <div class="card" style="padding:16px; margin-bottom:20px;">
        <h3 style="font-size:0.95rem; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
          📊 部位別 最終トレーニングからの経過日数
        </h3>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
    `;

    for (const cat of categoryKeys) {
      const name = DataManager.CATEGORY_NAMES[cat];
      const color = DataManager.CATEGORY_COLORS[cat];
      let daysText, daysColor;

      if (lastDates[cat]) {
        const lastDate = new Date(lastDates[cat]);
        lastDate.setHours(0, 0, 0, 0);
        const diffMs = today - lastDate;
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        daysText = days === 0 ? '今日' : `${days}日前`;
        daysColor = getElapsedColor(days);
      } else {
        daysText = '未記録';
        daysColor = 'var(--color-text-hint)';
      }

      html += `
        <div style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:10px 8px; text-align:center;">
          <div style="font-size:0.7rem; color:var(--color-text-secondary); margin-bottom:4px; display:flex; align-items:center; justify-content:center; gap:4px;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color};"></span>
            ${name}
          </div>
          <div style="font-size:1rem; font-weight:700; color:${daysColor};">${daysText}</div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
    return html;
  }

  // --- BIG3 推定MAX表示 ---
  function _renderBig3Max() {
    const allWorkouts = DataManager.getRecentWorkouts(999);

    // BIG3の種目ID（名前でもマッチさせる）
    const big3 = [
      { id: 'chest_001', name: 'ベンチプレス', label: 'BENCH', emoji: '🏋️', max: 0 },
      { id: 'legs_001', name: 'スクワット', label: 'SQUAT', emoji: '🦵', max: 0 },
      { id: 'back_001', name: 'デッドリフト', label: 'DEAD', emoji: '💀', max: 0 },
    ];

    // 全ワークアウトからBIG3の最高推定1RMを算出
    for (const w of allWorkouts) {
      for (const ex of w.exercises) {
        const matchIdx = big3.findIndex(b =>
          ex.exerciseId === b.id || ex.name === b.name
        );
        if (matchIdx === -1) continue;

        for (const set of ex.sets) {
          if (!set.completed || !set.weight || !set.reps) continue;
          const est1RM = set.reps === 1
            ? set.weight
            : Math.round(set.weight * (1 + set.reps / 40) * 10) / 10;
          if (est1RM > big3[matchIdx].max) {
            big3[matchIdx].max = est1RM;
          }
        }
      }
    }

    const total = Math.round((big3[0].max + big3[1].max + big3[2].max) * 10) / 10;

    let html = `
      <div class="card" style="padding:16px; margin-bottom:20px; border:1px solid rgba(255,215,0,0.3); background:linear-gradient(135deg, rgba(255,215,0,0.05), rgba(255,165,0,0.05));">
        <h3 style="font-size:0.95rem; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
          👑 BIG3 推定MAX
        </h3>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-bottom:12px;">
    `;

    for (const b of big3) {
      html += `
        <div style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:10px 8px; text-align:center;">
          <div style="font-size:0.65rem; color:var(--color-text-secondary); margin-bottom:2px;">${b.emoji} ${b.name}</div>
          <div style="font-size:1.2rem; font-weight:800; color:${b.max > 0 ? 'var(--color-gold)' : 'var(--color-text-hint)'};">
            ${b.max > 0 ? b.max + '<span style="font-size:0.7rem;font-weight:400;">kg</span>' : '---'}
          </div>
        </div>
      `;
    }

    html += `
        </div>
        <div style="background:linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.15)); border:1px solid rgba(255,215,0,0.3); border-radius:var(--radius-md); padding:12px; text-align:center;">
          <div style="font-size:0.75rem; color:var(--color-text-secondary); margin-bottom:2px;">🏆 BIG3 合計</div>
          <div style="font-size:1.6rem; font-weight:900; color:var(--color-gold);">
            ${total > 0 ? total + '<span style="font-size:0.85rem;font-weight:400;"> kg</span>' : '--- kg'}
          </div>
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
        // nullを渡すと空の状態で開始
        EventBus.emit('start-workout', null);
      });
    }

    // テンプレートから開始
    document.querySelectorAll('.start-template-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tplId = btn.dataset.id;
        const templates = DataManager.getTemplates();
        const tpl = templates.find(t => t.id === tplId);
        if (tpl) {
          // テンプレートデータを渡して開始
          EventBus.emit('start-workout', { template: tpl });
        }
      });
    });

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

    // カレンダーセルクリック
    document.querySelectorAll('.dashboard-cal-cell.has-workout').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.dataset.date;
        if (dateStr) {
          EventBus.emit('navigate-date', dateStr);
        }
      });
    });

    // 最近のワークアウトクリック
    document.querySelectorAll('.recent-workout-card').forEach(card => {
      card.addEventListener('click', () => {
        const dateStr = card.dataset.date;
        if (dateStr) {
          EventBus.emit('navigate-date', dateStr);
        } else {
          EventBus.emit('navigate', 'history');
        }
      });
    });
  }

  return { render };
})();
