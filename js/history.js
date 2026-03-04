/* ============================
   history.js - 履歴画面
   リストビュー、カレンダービュー、詳細表示、編集・削除
   ============================ */

const History = (() => {
    let _viewMode = 'list'; // 'list' | 'calendar'
    let _calYear = new Date().getFullYear();
    let _calMonth = new Date().getMonth() + 1;

    function render() {
        const container = document.getElementById('history-content');
        let html = `
      <h1 style="font-size:1.5rem;font-weight:700;margin-bottom:20px;">履歴</h1>
      <div class="history-controls">
        <div class="view-toggle">
          <button class="view-toggle-btn${_viewMode === 'list' ? ' active' : ''}" data-view="list">📋 リスト</button>
          <button class="view-toggle-btn${_viewMode === 'calendar' ? ' active' : ''}" data-view="calendar">📅 カレンダー</button>
        </div>
      </div>
    `;

        if (_viewMode === 'calendar') {
            html += _renderCalendar();
        } else {
            html += _renderList();
        }

        container.innerHTML = html;
        _bindEvents();
    }

    function _renderList() {
        const workouts = [];
        const now = new Date();
        let y = now.getFullYear(), m = now.getMonth() + 1;
        // 最大6ヶ月分取得
        for (let i = 0; i < 6; i++) {
            workouts.push(...DataManager.getWorkouts(y, m));
            m--;
            if (m < 1) { m = 12; y--; }
        }
        workouts.sort((a, b) => b.startTime - a.startTime);

        if (workouts.length === 0) {
            return `<div style="text-align:center;color:var(--color-text-secondary);padding:40px 0;">まだ記録がありません</div>`;
        }

        let html = '<div class="history-list">';
        for (const w of workouts) {
            const cats = DataManager.getWorkoutCategories(w);
            const vol = DataManager.calcWorkoutVolume(w);
            const dur = DataManager.calcDuration(w);
            const sets = DataManager.calcCompletedSets(w);
            const date = w.date || DataManager.getTrainingDate(w.startTime);

            html += `
        <div class="card card-compact card-clickable history-card" data-workout-id="${w.id}" data-year="${date.split('-')[0]}" data-month="${date.split('-')[1]}">
          <div class="history-date">${UI.formatDate(date)}</div>
          <div class="workout-chips">${cats.map(c => UI.categoryChipHTML(c)).join('')}</div>
          <div class="history-exercises" style="margin-top:6px;">${_getExerciseNames(w).join('、')}</div>
          <div class="history-stats">
            <span>${w.exercises.length}種目 / ${sets}セット</span>
            <span>${UI.formatVolume(vol)} kg</span>
            ${dur > 0 ? `<span>${UI.formatDuration(dur)}</span>` : ''}
          </div>
        </div>
      `;
        }
        html += '</div>';
        return html;
    }

    function _renderCalendar() {
        let html = `
      <div class="calendar-month-nav">
        <button class="btn btn-icon btn-ghost" id="cal-prev">◀</button>
        <h3>${_calYear}年${_calMonth}月</h3>
        <button class="btn btn-icon btn-ghost" id="cal-next">▶</button>
      </div>
    `;

        const dayHeaders = ['月', '火', '水', '木', '金', '土', '日'];
        html += '<div class="calendar-grid">';
        dayHeaders.forEach(d => html += `<div class="calendar-header-cell">${d}</div>`);

        const firstDay = new Date(_calYear, _calMonth - 1, 1);
        const lastDay = new Date(_calYear, _calMonth, 0);
        const startDayOfWeek = (firstDay.getDay() + 6) % 7; // 月曜始まり
        const todayStr = new Date().toISOString().split('T')[0];

        // 月のワークアウト取得
        const monthWorkouts = DataManager.getWorkouts(_calYear, _calMonth);
        const workoutsByDate = {};
        monthWorkouts.forEach(w => {
            const d = w.date || DataManager.getTrainingDate(w.startTime);
            if (!workoutsByDate[d]) workoutsByDate[d] = [];
            workoutsByDate[d].push(w);
        });

        // 前月の空セル
        for (let i = 0; i < startDayOfWeek; i++) {
            const d = new Date(firstDay);
            d.setDate(d.getDate() - (startDayOfWeek - i));
            html += `<div class="calendar-cell other-month"><span>${d.getDate()}</span></div>`;
        }

        // 当月
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const dateStr = `${_calYear}-${String(_calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const dayWorkouts = workoutsByDate[dateStr] || [];
            const cats = new Set();
            dayWorkouts.forEach(w => DataManager.getWorkoutCategories(w).forEach(c => cats.add(c)));

            html += `
        <div class="calendar-cell${isToday ? ' today' : ''}${dayWorkouts.length > 0 ? ' has-workout' : ''}" data-date="${dateStr}">
          <span>${d}</span>
          <div class="cal-dots">
            ${[...cats].slice(0, 3).map(c => `<div class="cal-dot" style="background:${DataManager.CATEGORY_COLORS[c]}"></div>`).join('')}
          </div>
        </div>
      `;
        }

        // 翌月の空セル
        const endDayOfWeek = (lastDay.getDay() + 6) % 7;
        for (let i = endDayOfWeek + 1; i < 7; i++) {
            html += `<div class="calendar-cell other-month"><span>${i - endDayOfWeek}</span></div>`;
        }

        html += '</div>';
        return html;
    }

    function _getExerciseNames(workout) {
        return workout.exercises.map(ex => {
            const info = DataManager.getExerciseById(ex.exerciseId);
            return info ? info.name : '不明';
        });
    }

    function _showWorkoutDetail(workoutId, year, month) {
        const workouts = DataManager.getWorkouts(parseInt(year), parseInt(month));
        const workout = workouts.find(w => w.id === workoutId);
        if (!workout) return;

        const date = workout.date || DataManager.getTrainingDate(workout.startTime);
        const dur = DataManager.calcDuration(workout);
        const vol = DataManager.calcWorkoutVolume(workout);

        let exercisesHTML = '';
        for (const ex of workout.exercises) {
            const info = DataManager.getExerciseById(ex.exerciseId);
            exercisesHTML += `
        <div style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <strong>${info?.name || '不明'}</strong>
            ${info ? UI.categoryChipHTML(info.category) : ''}
          </div>
          <div class="set-table" style="font-size:0.875rem;">
            ${ex.sets.map((s, i) => `
              <div style="display:grid;grid-template-columns:40px 1fr 1fr;gap:8px;padding:4px 0;color:var(--color-text-secondary);">
                <span>${i + 1}</span>
                <span>${s.weight}kg</span>
                <span>${s.reps}回</span>
              </div>
            `).join('')}
          </div>
          ${ex.memo ? `<div style="font-size:0.8125rem;color:var(--color-text-hint);margin-top:4px;">📝 ${ex.memo}</div>` : ''}
        </div>
      `;
        }

        UI.showModal(`
      <h2>${UI.formatDate(date)}</h2>
      <div style="display:flex;gap:16px;margin-bottom:16px;font-size:0.8125rem;color:var(--color-text-secondary);">
        ${dur > 0 ? `<span>⏱️ ${UI.formatDuration(dur)}</span>` : ''}
        <span>📊 ${UI.formatVolume(vol)} kg</span>
      </div>
      ${exercisesHTML}
      <div class="modal-actions" style="flex-direction:column;">
        <button class="btn btn-danger btn-block" id="modal-delete-workout" data-wid="${workoutId}" data-wy="${year}" data-wm="${month}">🗑️ このワークアウトを削除</button>
        <button class="btn btn-secondary btn-block" id="modal-cancel">閉じる</button>
      </div>
    `);

        setTimeout(() => {
            document.getElementById('modal-delete-workout')?.addEventListener('click', async () => {
                UI.closeModal(false);
                const confirmResult = await UI.showModal(`
          <h2>ワークアウトを削除</h2>
          <p>この記録を完全に削除しますか？元に戻せません。</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
            <button class="btn btn-danger" id="modal-confirm">削除する</button>
          </div>
        `);
                if (confirmResult) {
                    DataManager.deleteWorkout(workoutId, parseInt(year), parseInt(month));
                    render();
                    UI.showToast('ワークアウトを削除しました', 'info');
                }
            });
        }, 50);
    }

    function _bindEvents() {
        // ビュー切替
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                _viewMode = btn.dataset.view;
                render();
            });
        });

        // カレンダーナビ
        document.getElementById('cal-prev')?.addEventListener('click', () => {
            _calMonth--;
            if (_calMonth < 1) { _calMonth = 12; _calYear--; }
            render();
        });
        document.getElementById('cal-next')?.addEventListener('click', () => {
            _calMonth++;
            if (_calMonth > 12) { _calMonth = 1; _calYear++; }
            render();
        });

        // カード/セルクリック → 詳細
        document.querySelectorAll('.history-card').forEach(card => {
            card.addEventListener('click', () => {
                _showWorkoutDetail(card.dataset.workoutId, card.dataset.year, card.dataset.month);
            });
        });

        document.querySelectorAll('.calendar-cell.has-workout').forEach(cell => {
            cell.addEventListener('click', () => {
                const dateStr = cell.dataset.date;
                const [y, m] = dateStr.split('-').map(Number);
                const ws = DataManager.getWorkoutsByDate(dateStr);
                if (ws.length === 1) {
                    _showWorkoutDetail(ws[0].id, y, m);
                } else if (ws.length > 1) {
                    // 複数ある場合はリスト表示
                    let listHtml = `<h2>${UI.formatDate(dateStr)}</h2>`;
                    for (const w of ws) {
                        const vol = DataManager.calcWorkoutVolume(w);
                        const cats = DataManager.getWorkoutCategories(w);
                        listHtml += `
              <div class="card card-compact card-clickable" style="margin-bottom:8px;cursor:pointer;" onclick="document.getElementById('modal-overlay').classList.add('hidden');History._detailFromModal('${w.id}',${y},${m})">
                <div class="workout-chips">${cats.map(c => UI.categoryChipHTML(c)).join('')}</div>
                <div style="font-size:0.8125rem;color:var(--color-text-secondary);margin-top:4px;">${UI.formatVolume(vol)} kg</div>
              </div>
            `;
                    }
                    listHtml += `<button class="btn btn-secondary btn-block" id="modal-cancel" style="margin-top:12px;">閉じる</button>`;
                    UI.showModal(listHtml);
                }
            });
        });
    }

    function _detailFromModal(wid, y, m) {
        setTimeout(() => _showWorkoutDetail(wid, y, m), 100);
    }

    return { render, _detailFromModal: _detailFromModal };
})();
