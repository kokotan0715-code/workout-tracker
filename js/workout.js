/* ============================
   workout.js - ワークアウト記録画面（最重要画面）
   種目選択、セット記録、タイマー、自動保存、完了サマリー
   ============================ */

const Workout = (() => {
    let _active = null;        // 進行中ワークアウトデータ
    let _timerInterval = null;  // 経過時間表示用
    let _isRunning = false;

    // --- ワークアウト開始 ---
    function start(options = null) {
        _active = {
            id: `w_${Date.now()}`,
            startTime: Date.now(),
            exercises: [],
        };

        // テンプレートから開始する場合
        if (options && options.template) {
            const tpl = options.template;
            tpl.exercises.forEach(exId => {
                _active.exercises.push({
                    exerciseId: exId,
                    sets: [{ weight: '', reps: '', completed: false, isDropSet: false }],
                    memo: '',
                    showMemo: false,
                });
            });
        }

        DataManager.saveActiveWorkout(_active);
        _isRunning = true;
        _renderWorkoutUI();
        _startTimer();
        EventBus.emit('navigate', 'workout');

        // 自動で種目選択画面を開く
        if (!options || !options.template) {
            setTimeout(() => _showExercisePicker(), 50);
        }
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
        document.getElementById('workout-start-idle')?.addEventListener('click', () => start(null));
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
        const rec = DataManager.getAIRecommendation(exData.exerciseId);

        let aiHtml = '';
        if (rec) {
            aiHtml = `
              <div style="background:rgba(var(--color-primary-rgb),0.1); border:1px solid rgba(var(--color-primary-rgb),0.3); border-radius:var(--radius-sm); padding:6px 10px; margin-bottom:12px; font-size:0.75rem; line-height:1.4;">
                <span style="color:var(--color-primary);font-weight:700;">🤖 AI推奨:</span> 
                目標 <b style="font-size:0.875rem;">${rec.recommendedWeight}kg × ${rec.recommendedReps}回</b> 
                <span style="color:var(--color-text-secondary);">(推定1RM: ${rec.oneRM}kg)</span>
                ${rec.isPlateau ? '<br><span style="color:var(--color-gold);display:inline-block;margin-top:4px;">⚠️ 停滞気味のサインを検知。今日は少し重量を落として（ディロード）リフレッシュするのがおすすめです。</span>' : ''}
              </div>
            `;
        }

        // スーパーセットによるカードの連結スタイル
        let cardStyle = '';
        let headerStyle = 'margin-bottom:8px;';

        // 自分がスーパーセットの始点（次の種目と繋がる）場合
        if (exData.isSuperset) {
            cardStyle += 'border-bottom: 2px dashed var(--color-primary); border-bottom-left-radius: 0; border-bottom-right-radius: 0; margin-bottom: 0; box-shadow: none;';
        }

        // 前の種目がスーパーセットの始点（自分と繋がっている）場合
        if (exIndex > 0 && _active.exercises[exIndex - 1].isSuperset) {
            cardStyle += 'border-top: none; border-top-left-radius: 0; border-top-right-radius: 0; margin-top: 0; background: linear-gradient(to bottom, rgba(var(--color-primary-rgb), 0.05), var(--color-surface) 20px);';
            headerStyle = 'margin-bottom:8px; padding-top: 8px; position:relative;';
            // 連結アイコンを追加
            aiHtml = `<div style="position:absolute; top:-16px; left:50%; transform:translateX(-50%); background:var(--color-primary); color:#000; font-size:0.7rem; padding:2px 8px; border-radius:12px; font-weight:bold; z-index:10;">🔗 スーパーセット</div>` + aiHtml;
        }

        let html = `
      <div class="card exercise-card" data-ex-index="${exIndex}" style="${cardStyle}">
        <div class="exercise-card-header" style="${headerStyle}">
          <h3>${exName}</h3>
          ${UI.categoryChipHTML(cat)}
          <button class="btn btn-ghost btn-icon exercise-menu-btn" data-ex-index="${exIndex}" aria-label="メニュー">⋮</button>
        </div>
        ${aiHtml}
        <div class="set-table">
          <div class="set-table-header">
            <span>SET</span><span style="text-align:left;">前回</span><span style="text-align:center;">重量 / 回数</span><span></span>
          </div>
    `;

        for (let s = 0; s < exData.sets.length; s++) {
            const set = exData.sets[s];
            // 前回記録の取得
            let prevText = '-';
            if (prevSets) {
                const pIdx = Math.min(s, prevSets.length - 1);
                if (prevSets[pIdx]) {
                    prevText = `${prevSets[pIdx].weight}×${prevSets[pIdx].reps}${prevSets[pIdx].isDropSet ? '<br><span style="font-size:0.65rem;color:var(--color-text-hint)">[ドロップ]</span>' : ''}`;
                }
            }

            const rowClass = `set-row${set.completed ? ' completed' : ''}${set.isDropSet ? ' drop-set' : ''}`;
            html += `
        <div class="${rowClass}" data-ex-index="${exIndex}" data-set-index="${s}">
          <div class="set-number-col">
            <span class="set-number">${s + 1}</span>
            <div style="display:flex; gap:2px; margin-top:2px;">
              <button class="btn-ghost btn-sm btn-icon drop-toggle-btn${set.isDropSet ? ' active' : ''}" data-action="toggle-drop" data-ex="${exIndex}" data-set="${s}" title="ドロップセット切替" style="width:20px;height:20px;font-size:0.6rem;">📉</button>
              <button class="btn-ghost btn-sm btn-icon" data-action="delete-set" data-ex="${exIndex}" data-set="${s}" title="セット削除" style="width:20px;height:20px;font-size:0.6rem;color:var(--color-danger);opacity:0.7;">✖</button>
            </div>
          </div>
          <div class="set-info-col" style="display:flex; flex-direction:column; justify-content:center; padding-right:4px;">
            <span class="set-previous" style="line-height:1.2;">${prevText}</span>
          <div class="set-input-group" style="justify-content:center; flex-direction:row; align-items:center; gap:8px;">
            <div style="position:relative; display:inline-block; width:45%;">
              <input type="text" inputmode="none" class="input-field input-number numpad-trigger" value="${set.weight ?? ''}"
                data-field="weight" data-ex="${exIndex}" data-set="${s}"
                data-min="0" data-max="999" data-decimal="true" readonly
                style="padding-right:24px; text-align:right;">
              <span style="position:absolute; right:8px; top:50%; transform:translateY(-50%); color:var(--color-text-hint); font-size:0.8rem; pointer-events:none;">kg</span>
            </div>
            <div style="position:relative; display:inline-block; width:45%;">
              <input type="text" inputmode="none" class="input-field input-number numpad-trigger" value="${set.reps ?? ''}"
                data-field="reps" data-ex="${exIndex}" data-set="${s}"
                data-min="1" data-max="100" data-decimal="false" readonly
                style="padding-right:24px; text-align:right;">
              <span style="position:absolute; right:8px; top:50%; transform:translateY(-50%); color:var(--color-text-hint); font-size:0.8rem; pointer-events:none;">回</span>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:center;">
             <button class="btn btn-ghost btn-icon btn-sm"
              data-action="start-timer" data-ex="${exIndex}" data-set="${s}"
              aria-label="タイマー起動" style="color:var(--color-primary); font-size:1.2rem; padding:0; height:36px; width:36px;">🕒</button>
             <span class="set-1rm-est" style="font-size:0.6rem; color:var(--color-gold); margin-top:2px;">
                 ${(set.weight > 0 && set.reps > 0) ? `RM: ${Number(set.reps) === 1 ? set.weight : Math.round(set.weight * (1 + set.reps / 40) * 10) / 10}kg` : ''}
             </span>
          </div>
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
        _active.exercises.push({
            exerciseId,
            sets: [{ weight: '', reps: '', completed: false, isDropSet: false }],
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
                case 'start-timer': _startRestTimerForSet(exIdx, setIdx); break;
                case 'add-set': _addSet(exIdx); break;
                case 'toggle-drop': _toggleDropSet(exIdx, setIdx); break;
                case 'delete-set': _deleteSet(exIdx, setIdx); break;
            }
        });

        // --- Numpad 呼び出し ---
        document.body.addEventListener('click', async (e) => {
            if (e.target.classList.contains('numpad-trigger') && !e.target.disabled) {
                const exIdx = parseInt(e.target.dataset.ex);
                const setIdx = parseInt(e.target.dataset.set);
                const field = e.target.dataset.field; // 'weight' or 'reps'
                const min = parseFloat(e.target.dataset.min) || 0;
                const max = parseFloat(e.target.dataset.max) || 999;
                const decimal = e.target.dataset.decimal === 'true';
                const initialVal = e.target.value;
                const title = field === 'weight' ? '重量 (kg)' : '回数 (回)';

                const newVal = await UI.showNumpad(initialVal, title, { min, max, allowDecimal: decimal });

                if (newVal !== null) {
                    const set = _active.exercises[exIdx].sets[setIdx];
                    set[field] = Number(newVal);

                    // 両方入力されていれば自動完了
                    if (set.weight > 0 && set.reps > 0) {
                        set.completed = true;
                    } else {
                        set.completed = false;
                    }

                    _save();

                    // Numpadからの反映も部分更新で行う
                    e.target.value = newVal;
                    const rowEl = e.target.closest('.set-row');
                    if (rowEl) {
                        if (set.completed) {
                            rowEl.classList.add('completed');
                        } else {
                            rowEl.classList.remove('completed');
                        }
                        const rmEstEl = rowEl.querySelector('.set-1rm-est');
                        if (rmEstEl && set.weight > 0 && set.reps > 0) {
                            const est1RM = Number(set.reps) === 1 ? set.weight : Math.round(set.weight * (1 + set.reps / 40) * 10) / 10;
                            rmEstEl.textContent = `RM: ${est1RM}kg`;
                        } else if (rmEstEl) {
                            rmEstEl.textContent = '';
                        }
                    }
                }
            }
        });

        // 既存の change, keydown リスナーは fallback/メモ用に残すが
        // input-number クラスから readonly を付けたためキーボード入力には反応しない。

        // 入力値の変更（主にメモ等）
        container.addEventListener('change', (e) => {
            if (e.target.dataset.field === 'memo') {
                const exIdx = parseInt(e.target.dataset.ex);
                _active.exercises[exIdx].memo = e.target.value;
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

        // メモ変更はEvent委任でキャプチャ
        container.addEventListener('input', (e) => {
            if (e.target.dataset.field === 'memo') {
                const exIdx = parseInt(e.target.dataset.ex);
                _active.exercises[exIdx].memo = e.target.value;
                _save();
            }
        });

        // 種目メニュー
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('exercise-menu-btn')) {
                const exIdx = parseInt(e.target.dataset.exIndex);
                _showExerciseMenu(exIdx);
            }
        });

    }

    function _adjustValue(exIdx, setIdx, field, delta) {
        const set = _active.exercises[exIdx]?.sets[setIdx];
        if (!set || set.completed) return;
        let val = (set[field] || 0) + delta;
        if (field === 'weight') val = Math.max(0, Math.min(500, val));
        if (field === 'reps') val = Math.max(1, Math.min(100, Math.round(val)));
        set[field] = val;

        // 両方入力されていれば自動完了
        if (set.weight > 0 && set.reps > 0) {
            set.completed = true;
        } else {
            set.completed = false;
        }

        _save();

        // --- DOM即時反映（フル再描画を回避） ---
        const input = document.querySelector(`input[data-field="${field}"][data-ex="${exIdx}"][data-set="${setIdx}"]`);
        if (input) input.value = val;

        const rowEl = document.querySelector(`.set-row[data-ex-index="${exIdx}"][data-set-index="${setIdx}"]`);
        if (rowEl) {
            if (set.completed) {
                rowEl.classList.add('completed');
            } else {
                rowEl.classList.remove('completed');
            }
            const rmEstEl = rowEl.querySelector('.set-1rm-est');
            if (rmEstEl && set.weight > 0 && set.reps > 0) {
                const est1RM = Number(set.reps) === 1 ? set.weight : Math.round(set.weight * (1 + set.reps / 40) * 10) / 10;
                rmEstEl.textContent = `RM: ${est1RM}kg`;
            } else if (rmEstEl) {
                rmEstEl.textContent = '';
            }
        }
    }

    function _startRestTimerForSet(exIdx, setIdx) {
        // 右側の時計ボタンを押したときの挙動
        const profile = DataManager.getProfile();
        UI.startRestTimer(profile.defaultRestTime);
        UI.showToast('休憩タイマーを開始しました', 'info', 2000);
    }

    function _toggleDropSet(exIdx, setIdx) {
        const set = _active.exercises[exIdx]?.sets[setIdx];
        if (!set) return;
        set.isDropSet = !set.isDropSet;
        _save();
        _renderWorkoutUI();
    }

    function _deleteSet(exIdx, setIdx) {
        const ex = _active.exercises[exIdx];
        if (!ex || ex.sets.length <= 1) {
            UI.showToast('最後の1セットは削除できません。不要な場合は種目ごと削除してください。', 'error', 4000);
            return;
        }
        UI.confirm('セット削除', 'このセットを削除しますか？', '削除', 'キャンセル', true).then(res => {
            if (res) {
                ex.sets.splice(setIdx, 1);
                _save();
                _renderWorkoutUI();
            }
        });
    }

    function _addSet(exIdx) {
        const ex = _active.exercises[exIdx];
        if (!ex) return;
        const lastSet = ex.sets[ex.sets.length - 1];
        ex.sets.push({
            weight: lastSet?.weight ?? '',
            reps: lastSet?.reps ?? '',
            completed: false,
            isDropSet: false
        });
        _save();
        _renderWorkoutUI();

        // セット追加時に休憩タイマー作動
        const profile = DataManager.getProfile();
        UI.startRestTimer(profile.defaultRestTime);
    }

    function _showExerciseMenu(exIdx) {
        const ex = _active.exercises[exIdx];
        const isLinked = ex.isSuperset;
        const canLink = exIdx < _active.exercises.length - 1; // 最後の種目でなければリンク可能

        let linkBtnHTML = '';
        if (canLink) {
            linkBtnHTML = `<button class="btn btn-secondary btn-block" id="modal-toggle-superset" data-ex="${exIdx}">
              ${isLinked ? '🔗 スーパーセットを解除' : '🔗 次の種目とスーパーセットを組む'}
            </button>`;
        } else if (isLinked) {
            // 最後の種目なのにフラグが立っている場合のフェールセーフ
            linkBtnHTML = `<button class="btn btn-secondary btn-block" id="modal-toggle-superset" data-ex="${exIdx}">🔗 スーパーセットを解除</button>`;
        }

        UI.showModal(`
      <h2>種目の操作</h2>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${linkBtnHTML}
        <button class="btn btn-danger btn-block" id="modal-delete-exercise" data-ex="${exIdx}">🗑️ この種目を削除</button>
        <button class="btn btn-secondary btn-block" id="modal-cancel">閉じる</button>
      </div>
    `);

        // 削除ボタンとスーパーセットボタンのイベント
        setTimeout(() => {
            document.getElementById('modal-delete-exercise')?.addEventListener('click', () => {
                _active.exercises.splice(exIdx, 1);
                // もし削除されたのがグループの一部なら、前の種目のリンクを解除するなどの処理が必要かもしれないが簡易的におく
                if (exIdx > 0 && _active.exercises[exIdx - 1]) _active.exercises[exIdx - 1].isSuperset = false;
                _save();
                UI.closeModal(false);
                _renderWorkoutUI();
                UI.showToast('種目を削除しました', 'info');
            });

            document.getElementById('modal-toggle-superset')?.addEventListener('click', () => {
                ex.isSuperset = !ex.isSuperset;
                _save();
                UI.closeModal(false);
                _renderWorkoutUI();
                UI.showToast(ex.isSuperset ? 'スーパーセットを組みました' : 'スーパーセットを解除しました', 'success');
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
            showMemo: undefined, // 保存時にフラグを消す
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
        <div style="display:flex;gap:8px;margin-top:16px;">
          <a href="#" class="btn btn-secondary share-x-btn" style="flex:1;background:#000;color:#fff;border-color:#333;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:4px;">
            <svg viewBox="0 0 24 24" aria-hidden="true" style="width:16px;height:16px;fill:currentColor;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg> ポスト
          </a>
          <button class="btn btn-primary" id="modal-confirm" style="flex:1;">完了</button>
        </div>
      </div>
    `).then(() => {
            EventBus.emit('navigate', 'dashboard');
        });

        setTimeout(() => {
            const btn = document.querySelector('.share-x-btn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const text = `🏋️‍♂️ 本日のワークアウト完了！\n・${workout.exercises.length}種目 / ${totalSets}セット\n・総ボリューム: ${UI.formatVolume(totalVolume)} kg\n・時間: ${UI.formatDuration(duration)}\n\n`;
                    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=IronLog,筋トレ`;
                    window.open(url, '_blank', 'width=550,height=420');
                });
            }
        }, 50);
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
