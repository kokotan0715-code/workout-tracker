/* ============================
   workout.js - ワークアウト記録画面（最重要画面）
   種目選択、セット記録、タイマー、自動保存、完了サマリー
   ============================ */

const Workout = (() => {
    let _active = null;        // 進行中ワークアウトデータ
    let _timerInterval = null;  // 経過時間表示用
    let _isRunning = false;

    // --- ワークアウト開始 ---
    function start() {
        _active = {
            id: `w_${Date.now()}`,
            startTime: Date.now(),
            exercises: [],
        };
        DataManager.saveActiveWorkout(_active);
        _isRunning = true;
        _renderWorkoutUI();
        _startTimer();
        EventBus.emit('navigate', 'workout');
    }

    // --- 復帰 ---
    function resume() {
        _active = DataManager.getActiveWorkout();
        if (!_active) { start(); return; }
        _isRunning = true;
        _renderWorkoutUI();
        _startTimer();
        EventBus.emit('navigate', 'workout');
    }

    // --- 画面レンダリング ---
    function render() {
        if (!_isRunning) {
            _active = DataManager.getActiveWorkout();
            if (_active) {
                _isRunning = true;
                _renderWorkoutUI();
                _startTimer();
            } else {
                _renderIdleUI();
            }
        } else {
            _renderWorkoutUI();
        }
    }

    function _renderIdleUI() {
        const container = document.getElementById('workout-content');
        container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;">
        <div style="font-size:4rem;margin-bottom:24px;">💪</div>
        <h2 style="margin-bottom:12px;">ワークアウトを始めよう</h2>
        <p style="color:var(--color-text-secondary);margin-bottom:32px;">ダッシュボード、またはここからワークアウトを開始できます</p>
        <button class="btn btn-primary btn-lg" id="workout-start-idle">ワークアウトを開始</button>
      </div>
    `;
        document.getElementById('workout-start-idle')?.addEventListener('click', () => start());
    }

    function _renderWorkoutUI() {
        const container = document.getElementById('workout-content');
        const elapsed = Date.now() - _active.startTime;

        let html = `
      <div class="workout-header">
        <div class="workout-timer" id="workout-elapsed">${UI.formatTimer(elapsed)}</div>
        <button class="btn btn-primary workout-finish-btn" id="workout-finish-btn">完了</button>
      </div>
    `;

        // 種目カード
        for (let i = 0; i < _active.exercises.length; i++) {
            html += _renderExerciseCard(i);
        }

        container.innerHTML = html;

        // FABは常に表示
        _showFAB();
        _bindWorkoutEvents();
    }

    function _renderExerciseCard(exIndex) {
        const exData = _active.exercises[exIndex];
        const exInfo = DataManager.getExerciseById(exData.exerciseId);
        const exName = exInfo ? exInfo.name : '不明な種目';
        const cat = exInfo ? exInfo.category : 'other';
        const prevSets = DataManager.getPreviousRecord(exData.exerciseId);

        let html = `
      <div class="card exercise-card" data-ex-index="${exIndex}">
        <div class="exercise-card-header">
          <h3>${exName}</h3>
          ${UI.categoryChipHTML(cat)}
          <button class="exercise-menu-btn" data-ex-index="${exIndex}" aria-label="メニュー">⋮</button>
        </div>
        <div class="set-table">
          <div class="set-table-header">
            <span>SET</span><span>前回</span><span>重量(kg)</span><span>回数</span><span></span>
          </div>
    `;

        for (let s = 0; s < exData.sets.length; s++) {
            const set = exData.sets[s];
            // 前回記録の取得
            let prevText = '-';
            if (prevSets) {
                const pIdx = Math.min(s, prevSets.length - 1);
                if (prevSets[pIdx]) {
                    prevText = `${prevSets[pIdx].weight}×${prevSets[pIdx].reps}`;
                }
            }

            html += `
        <div class="set-row${set.completed ? ' completed' : ''}" data-ex-index="${exIndex}" data-set-index="${s}">
          <span class="set-number">${s + 1}</span>
          <span class="set-previous">${prevText}</span>
          <div class="set-input-group">
            <button class="btn-step" data-action="decrement-weight" data-ex="${exIndex}" data-set="${s}">−</button>
            <input type="number" class="input-field input-number" value="${set.weight ?? ''}"
              data-field="weight" data-ex="${exIndex}" data-set="${s}"
              min="0" max="500" step="${DataManager.getProfile().weightStep}" placeholder="kg"
              ${set.completed ? 'disabled' : ''}>
            <button class="btn-step" data-action="increment-weight" data-ex="${exIndex}" data-set="${s}">+</button>
          </div>
          <div class="set-input-group">
            <button class="btn-step" data-action="decrement-reps" data-ex="${exIndex}" data-set="${s}">−</button>
            <input type="number" class="input-field input-number" value="${set.reps ?? ''}"
              data-field="reps" data-ex="${exIndex}" data-set="${s}"
              min="1" max="100" step="1" placeholder="回"
              ${set.completed ? 'disabled' : ''}>
            <button class="btn-step" data-action="increment-reps" data-ex="${exIndex}" data-set="${s}">+</button>
          </div>
          <button class="set-check-btn${set.completed ? ' checked' : ''}"
            data-action="toggle-set" data-ex="${exIndex}" data-set="${s}"
            aria-label="セット完了">${set.completed ? '✓' : '○'}</button>
        </div>
      `;
        }

        html += `
        </div>
        <button class="btn btn-ghost btn-sm add-set-btn" data-action="add-set" data-ex="${exIndex}">＋ セット</button>
        <button class="exercise-memo-toggle" data-ex="${exIndex}">
          📝 メモ ${exData.memo ? '(あり)' : ''}
        </button>
        ${exData.showMemo ? `<textarea class="input-field exercise-memo" data-field="memo" data-ex="${exIndex}" placeholder="メモを入力...">${exData.memo || ''}</textarea>` : ''}
      </div>
    `;
        return html;
    }

    function _showFAB() {
        // FABがまだなければ作成
        let fab = document.getElementById('workout-fab');
        if (!fab && _isRunning) {
            fab = document.createElement('button');
            fab.id = 'workout-fab';
            fab.className = 'workout-fab';
            fab.innerHTML = '＋';
            fab.setAttribute('aria-label', '種目を追加');
            fab.addEventListener('click', () => _showExercisePicker());
            document.getElementById('app').appendChild(fab);
        }
    }

    function _hideFAB() {
        const fab = document.getElementById('workout-fab');
        if (fab) fab.remove();
    }

    // --- 種目選択ボトムシート ---
    function _showExercisePicker() {
        const exercises = DataManager.getExercises();
        // 使用頻度でソート
        exercises.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

        let html = `
      <div class="exercise-search">
        <input type="text" class="input-field" id="exercise-search-input" placeholder="種目を検索...">
        <div class="category-chips">
          ${DataManager.CATEGORIES.map(c =>
            `<span class="chip category-chip${c.id === 'all' ? ' chip-active' : ''} chip-${c.id}" data-cat="${c.id}">${c.name}</span>`
        ).join('')}
        </div>
      </div>
      <div class="exercise-list" id="exercise-list">
        ${_renderExerciseList(exercises)}
      </div>
      <div style="padding:12px 0; border-top:1px solid rgba(255,255,255,0.08); margin-top:12px;">
        <button class="btn btn-secondary btn-block" id="add-custom-exercise-btn">＋ カスタム種目を追加</button>
      </div>
    `;

        UI.showBottomSheet(html);

        // 検索とフィルター
        const searchInput = document.getElementById('exercise-search-input');
        let selectedCat = 'all';

        searchInput?.addEventListener('input', () => _filterExercises(searchInput.value, selectedCat));

        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('chip-active'));
                chip.classList.add('chip-active');
                selectedCat = chip.dataset.cat;
                _filterExercises(searchInput?.value || '', selectedCat);
            });
        });

        // 種目選択
        document.getElementById('exercise-list')?.addEventListener('click', (e) => {
            const item = e.target.closest('.exercise-list-item');
            if (item) {
                const exId = item.dataset.exerciseId;
                _addExercise(exId);
                UI.closeBottomSheet();
            }
        });

        // カスタム種目追加
        document.getElementById('add-custom-exercise-btn')?.addEventListener('click', async () => {
            UI.closeBottomSheet();
            const result = await UI.showModal(`
        <h2>カスタム種目を追加</h2>
        <input type="text" class="input-field" id="custom-ex-name" placeholder="種目名" style="margin-bottom:12px;">
        <select class="input-field" id="custom-ex-cat" style="margin-bottom:12px; appearance:auto;">
          ${DataManager.CATEGORIES.filter(c => c.id !== 'all').map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
          <button class="btn btn-primary" id="modal-confirm">追加</button>
        </div>
      `);
            if (result) {
                const name = document.getElementById('custom-ex-name')?.value?.trim();
                const cat = document.getElementById('custom-ex-cat')?.value;
                if (name) {
                    const newEx = DataManager.addCustomExercise(name, cat);
                    _addExercise(newEx.id);
                    UI.showToast(`${name} を追加しました`, 'success');
                }
            }
        });
    }

    function _renderExerciseList(exercises) {
        return exercises.map(ex =>
            `<div class="exercise-list-item" data-exercise-id="${ex.id}">
        <span class="exercise-name">${ex.name}</span>
        <span class="chip chip-${ex.category} exercise-category">${DataManager.CATEGORY_NAMES[ex.category] || ex.category}</span>
      </div>`
        ).join('');
    }

    function _filterExercises(query, cat) {
        const exercises = DataManager.getExercises();
        let filtered = exercises;
        if (cat !== 'all') filtered = filtered.filter(e => e.category === cat);
        if (query) {
            const q = query.toLowerCase();
            filtered = filtered.filter(e => e.name.toLowerCase().includes(q));
        }
        filtered.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        const list = document.getElementById('exercise-list');
        if (list) list.innerHTML = _renderExerciseList(filtered);

        // 再バインド
        list?.addEventListener('click', (e) => {
            const item = e.target.closest('.exercise-list-item');
            if (item) {
                _addExercise(item.dataset.exerciseId);
                UI.closeBottomSheet();
            }
        });
    }

    // --- 種目追加 ---
    function _addExercise(exerciseId) {
        const profile = DataManager.getProfile();
        const prevSets = DataManager.getPreviousRecord(exerciseId);
        const defaultWeight = prevSets?.[0]?.weight ?? 20;
        const defaultReps = prevSets?.[0]?.reps ?? 10;

        _active.exercises.push({
            exerciseId,
            sets: [{ weight: defaultWeight, reps: defaultReps, completed: false }],
            memo: '',
            showMemo: false,
        });
        _save();
        _renderWorkoutUI();
    }

    // --- イベントバインド ---
    function _bindWorkoutEvents() {
        const container = document.getElementById('workout-content');

        // 完了ボタン
        document.getElementById('workout-finish-btn')?.addEventListener('click', () => _finishWorkout());

        // 委任イベント
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const exIdx = parseInt(btn.dataset.ex);
            const setIdx = parseInt(btn.dataset.set);
            const profile = DataManager.getProfile();

            switch (action) {
                case 'increment-weight': _adjustValue(exIdx, setIdx, 'weight', profile.weightStep); break;
                case 'decrement-weight': _adjustValue(exIdx, setIdx, 'weight', -profile.weightStep); break;
                case 'increment-reps': _adjustValue(exIdx, setIdx, 'reps', 1); break;
                case 'decrement-reps': _adjustValue(exIdx, setIdx, 'reps', -1); break;
                case 'toggle-set': _toggleSet(exIdx, setIdx); break;
                case 'add-set': _addSet(exIdx); break;
            }
        });

        // 入力値の変更
        container.addEventListener('change', (e) => {
            if (e.target.dataset.field === 'weight' || e.target.dataset.field === 'reps') {
                const exIdx = parseInt(e.target.dataset.ex);
                const setIdx = parseInt(e.target.dataset.set);
                let val = parseFloat(e.target.value);
                if (e.target.dataset.field === 'weight') {
                    val = Math.max(0, Math.min(500, isNaN(val) ? 0 : val));
                } else {
                    val = Math.max(1, Math.min(100, isNaN(val) ? 1 : Math.round(val)));
                }
                e.target.value = val;
                _active.exercises[exIdx].sets[setIdx][e.target.dataset.field] = val;
                _save();
            }
        });

        // Enter キーでblur
        container.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.classList.contains('input-number')) {
                e.target.blur();
            }
        });

        // メモトグル
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('exercise-memo-toggle')) {
                const exIdx = parseInt(e.target.dataset.ex);
                _active.exercises[exIdx].showMemo = !_active.exercises[exIdx].showMemo;
                _save();
                _renderWorkoutUI();
            }
        });

        // メモ変更
        container.addEventListener('input', (e) => {
            if (e.target.dataset.field === 'memo') {
                const exIdx = parseInt(e.target.dataset.ex);
                _active.exercises[exIdx].memo = e.target.value;
            }
        });
        container.addEventListener('blur', (e) => {
            if (e.target.dataset.field === 'memo') _save();
        }, true);

        // 種目メニュー
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('exercise-menu-btn')) {
                const exIdx = parseInt(e.target.dataset.exIndex);
                _showExerciseMenu(exIdx);
            }
        });

        // ±ボタン長押し（加速）
        let holdInterval = null;
        let holdTimeout = null;
        container.addEventListener('pointerdown', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            if (!action.startsWith('increment') && !action.startsWith('decrement')) return;

            holdTimeout = setTimeout(() => {
                holdInterval = setInterval(() => {
                    btn.click();
                }, 100);
            }, 500);
        });
        const clearHold = () => {
            clearTimeout(holdTimeout);
            clearInterval(holdInterval);
        };
        container.addEventListener('pointerup', clearHold);
        container.addEventListener('pointerleave', clearHold);
        container.addEventListener('pointercancel', clearHold);
    }

    function _adjustValue(exIdx, setIdx, field, delta) {
        const set = _active.exercises[exIdx]?.sets[setIdx];
        if (!set || set.completed) return;
        let val = (set[field] || 0) + delta;
        if (field === 'weight') val = Math.max(0, Math.min(500, val));
        if (field === 'reps') val = Math.max(1, Math.min(100, Math.round(val)));
        set[field] = val;
        _save();
        // 入力フィールドを直接更新（フル再描画を避ける）
        const input = document.querySelector(`input[data-field="${field}"][data-ex="${exIdx}"][data-set="${setIdx}"]`);
        if (input) input.value = val;
    }

    function _toggleSet(exIdx, setIdx) {
        const set = _active.exercises[exIdx]?.sets[setIdx];
        if (!set) return;

        if (set.completed) {
            // 完了解除
            set.completed = false;
            _save();
            _renderWorkoutUI();
            return;
        }

        // 入力チェック
        const weight = parseFloat(document.querySelector(`input[data-field="weight"][data-ex="${exIdx}"][data-set="${setIdx}"]`)?.value);
        const reps = parseInt(document.querySelector(`input[data-field="reps"][data-ex="${exIdx}"][data-set="${setIdx}"]`)?.value);

        if (isNaN(weight) || isNaN(reps) || reps < 1) {
            UI.showToast('重量と回数を入力してください', 'error');
            return;
        }

        set.weight = Math.max(0, Math.min(500, weight));
        set.reps = Math.max(1, Math.min(100, reps));
        set.completed = true;
        _save();

        // パルスアニメーション
        const row = document.querySelector(`.set-row[data-ex-index="${exIdx}"][data-set-index="${setIdx}"]`);
        if (row) { row.classList.add('anim-pulse'); }

        // 休憩タイマー起動
        const profile = DataManager.getProfile();
        UI.startRestTimer(profile.defaultRestTime);

        _renderWorkoutUI();
    }

    function _addSet(exIdx) {
        const ex = _active.exercises[exIdx];
        if (!ex) return;
        const lastSet = ex.sets[ex.sets.length - 1];
        ex.sets.push({
            weight: lastSet?.weight ?? 20,
            reps: lastSet?.reps ?? 10,
            completed: false,
        });
        _save();
        _renderWorkoutUI();
    }

    function _showExerciseMenu(exIdx) {
        UI.showModal(`
      <h2>種目の操作</h2>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button class="btn btn-danger btn-block" id="modal-delete-exercise" data-ex="${exIdx}">🗑️ この種目を削除</button>
        <button class="btn btn-secondary btn-block" id="modal-cancel">閉じる</button>
      </div>
    `);
        // 削除ボタン
        setTimeout(() => {
            document.getElementById('modal-delete-exercise')?.addEventListener('click', () => {
                _active.exercises.splice(exIdx, 1);
                _save();
                UI.closeModal(false);
                _renderWorkoutUI();
                UI.showToast('種目を削除しました', 'info');
            });
        }, 50);
    }

    // --- ワークアウト完了 ---
    async function _finishWorkout() {
        // 完了済みセットチェック
        const completedSets = _active.exercises.reduce((sum, ex) =>
            sum + ex.sets.filter(s => s.completed).length, 0);

        if (completedSets === 0) {
            UI.showToast('少なくとも1セット完了してください', 'error');
            return;
        }

        const result = await UI.showModal(`
      <h2>ワークアウトを完了</h2>
      <p>ワークアウトを完了して記録を保存しますか？</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
        <button class="btn btn-primary" id="modal-confirm">完了する</button>
      </div>
    `);

        if (!result) return;

        // 完了処理
        _active.endTime = Date.now();
        _active.date = DataManager.getTrainingDate(_active.startTime);

        // 未完了セットを削除
        _active.exercises = _active.exercises.map(ex => ({
            ...ex,
            sets: ex.sets.filter(s => s.completed),
            showMemo: undefined,
        })).filter(ex => ex.sets.length > 0);

        // 保存
        DataManager.saveWorkout(_active);
        const updatedPRs = DataManager.checkAndUpdatePRs(_active);
        DataManager.clearActiveWorkout();

        // 完了サマリー表示
        _showCompletionSummary(_active, updatedPRs);

        // クリーンアップ
        _stopTimer();
        _hideFAB();
        UI.stopRestTimer();
        _isRunning = false;
        _active = null;
    }

    function _showCompletionSummary(workout, updatedPRs) {
        const duration = DataManager.calcDuration(workout);
        const totalSets = DataManager.calcCompletedSets(workout);
        const totalVolume = DataManager.calcWorkoutVolume(workout);

        let prHTML = '';
        if (updatedPRs.length > 0) {
            // パーティクル演出
            UI.showParticles();
            prHTML = `
        <div style="margin-bottom:20px;">
          <h3 style="color:var(--color-gold);margin-bottom:8px;">🏆 PR更新!</h3>
          ${updatedPRs.map(pr => {
                const exInfo = DataManager.getExerciseById(pr.exerciseId);
                return `
              <div class="card pr-card">
                <span class="pr-icon">🏆</span>
                <div class="pr-info">
                  <div class="pr-exercise">${exInfo?.name || ''}</div>
                  <div class="pr-value">${pr.value}</div>
                </div>
              </div>`;
            }).join('')}
        </div>
      `;
        }

        UI.showModal(`
      <div class="completion-summary">
        <div class="summary-header">🎉 お疲れ様！</div>
        <div class="completion-stats">
          <div class="card card-compact completion-stat-card">
            <div class="stat-value">${UI.formatDuration(duration)}</div>
            <div class="stat-label">トレーニング時間</div>
          </div>
          <div class="card card-compact completion-stat-card">
            <div class="stat-value">${workout.exercises.length}種目 / ${totalSets}セット</div>
            <div class="stat-label">種目・セット数</div>
          </div>
          <div class="card card-compact completion-stat-card" style="grid-column: span 2;">
            <div class="stat-value">${UI.formatVolume(totalVolume)} kg</div>
            <div class="stat-label">総ボリューム</div>
          </div>
        </div>
        ${prHTML}
        <button class="btn btn-primary btn-block" id="modal-confirm">閉じる</button>
      </div>
    `).then(() => {
            EventBus.emit('navigate', 'dashboard');
        });
    }

    // --- タイマー ---
    function _startTimer() {
        _stopTimer();
        _timerInterval = setInterval(() => {
            if (!_active) return;
            const el = document.getElementById('workout-elapsed');
            if (el) el.textContent = UI.formatTimer(Date.now() - _active.startTime);
        }, 1000);
    }

    function _stopTimer() {
        if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    }

    // --- 自動保存 ---
    function _save() {
        if (_active) DataManager.saveActiveWorkout(_active);
    }

    // --- クリーンアップ ---
    function cleanup() {
        _stopTimer();
        _hideFAB();
        // 画面を離れても進行中ワークアウトは維持（復帰可能）
    }

    return { render, start, resume, cleanup };
})();
