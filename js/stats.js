/* ============================
   stats.js - 統計・グラフ画面
   Chart.js統合、推移グラフ、レーダーチャート、PR一覧
   ============================ */

const Stats = (() => {
    let _selectedExerciseId = null;
    let _period = '3m'; // '1m','3m','6m','1y'
    let _chartInstances = {};

    function render() {
        const container = document.getElementById('stats-content');
        const exercises = DataManager.getExercises().filter(e => e.usageCount > 0).sort((a, b) => b.usageCount - a.usageCount);

        if (exercises.length === 0) {
            container.innerHTML = `
        <h1 style="font-size:1.5rem;font-weight:700;margin-bottom:20px;">統計</h1>
        <div style="text-align:center;color:var(--color-text-secondary);padding:40px 0;">
          <div style="font-size:3rem;margin-bottom:16px;">📊</div>
          <p>ワークアウトを記録するとここに統計が表示されます</p>
        </div>
      `;
            return;
        }

        if (!_selectedExerciseId) _selectedExerciseId = exercises[0].id;

        let html = `
      <h1 style="font-size:1.5rem;font-weight:700;margin-bottom:20px;">統計</h1>

      <div class="stats-selector">
        <select id="stats-exercise-select">
          ${exercises.map(e => `<option value="${e.id}"${e.id === _selectedExerciseId ? ' selected' : ''}>${e.name}</option>`).join('')}
        </select>
      </div>

      <div class="period-toggle">
        <button class="period-btn${_period === '1m' ? ' active' : ''}" data-period="1m">1ヶ月</button>
        <button class="period-btn${_period === '3m' ? ' active' : ''}" data-period="3m">3ヶ月</button>
        <button class="period-btn${_period === '6m' ? ' active' : ''}" data-period="6m">6ヶ月</button>
        <button class="period-btn${_period === '1y' ? ' active' : ''}" data-period="1y">1年</button>
      </div>

      <h2 class="section-title">推定1RM推移</h2>
      <div class="card" style="margin-bottom:20px;padding:16px;">
        <div class="chart-container"><canvas id="chart-1rm"></canvas></div>
      </div>

      <h2 class="section-title">最大重量推移</h2>
      <div class="card" style="margin-bottom:20px;padding:16px;">
        <div class="chart-container"><canvas id="chart-max-weight"></canvas></div>
      </div>

      <h2 class="section-title">セッションボリューム推移</h2>
      <div class="card" style="margin-bottom:20px;padding:16px;">
        <div class="chart-container"><canvas id="chart-volume"></canvas></div>
      </div>

      <h2 class="section-title">部位別リカバリー状況</h2>
      <div class="card" style="margin-bottom:20px;padding:16px;">
        <div id="recovery-status-container"></div>
      </div>

      <h2 class="section-title">部位バランス（直近4週間）</h2>
      <div class="card" style="margin-bottom:20px;padding:16px;">
        <div class="chart-container"><canvas id="chart-balance"></canvas></div>
      </div>

      <h2 class="section-title">PR（自己ベスト）</h2>
      <div id="pr-list-container"></div>
    `;

        container.innerHTML = html;
        _renderCharts();
        _renderRecoveryStatus();
        _renderPRList();
        _bindEvents();
    }

    function _getPeriodRange() {
        const now = new Date();
        const start = new Date(now);
        switch (_period) {
            case '1m': start.setMonth(start.getMonth() - 1); break;
            case '3m': start.setMonth(start.getMonth() - 3); break;
            case '6m': start.setMonth(start.getMonth() - 6); break;
            case '1y': start.setFullYear(start.getFullYear() - 1); break;
        }
        return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    }

    function _getExerciseData(exerciseId) {
        const { start, end } = _getPeriodRange();
        const workouts = DataManager.getWorkoutsInRange(start, end);
        workouts.sort((a, b) => a.startTime - b.startTime);

        const data = [];
        for (const w of workouts) {
            const ex = w.exercises.find(e => e.exerciseId === exerciseId);
            if (!ex || !ex.sets.length) continue;
            const date = w.date || DataManager.getTrainingDate(w.startTime);
            let maxWeight = 0, max1RM = 0, volume = 0;
            for (const s of ex.sets) {
                if (!s.completed) continue;
                if (s.weight > maxWeight) maxWeight = s.weight;
                const est = s.reps === 1 ? s.weight : s.weight * (1 + s.reps / 30);
                if (est > max1RM) max1RM = est;
                volume += s.weight * s.reps;
            }
            data.push({ date, maxWeight, max1RM: Math.round(max1RM * 10) / 10, volume });
        }
        return data;
    }

    function _renderCharts() {
        // 全チャート破棄
        Object.values(_chartInstances).forEach(c => c.destroy());
        _chartInstances = {};

        if (typeof Chart === 'undefined') return; // Chart.js読み込み前

        const data = _getExerciseData(_selectedExerciseId);
        const labels = data.map(d => d.date.slice(5)); // MM-DD表示

        // Chart.jsグローバル設定
        Chart.defaults.color = 'rgba(255,255,255,0.6)';
        Chart.defaults.borderColor = 'rgba(255,255,255,0.08)';

        const lineOpts = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: false },
            },
            elements: {
                point: { radius: 4, hoverRadius: 6 },
                line: { tension: 0.3, borderWidth: 2 },
            },
        };

        // 推定1RM
        _chartInstances['1rm'] = new Chart(document.getElementById('chart-1rm'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    data: data.map(d => d.max1RM),
                    borderColor: '#00D4FF',
                    backgroundColor: 'rgba(0,212,255,0.1)',
                    fill: true,
                }],
            },
            options: lineOpts,
        });

        // 最大重量
        _chartInstances['maxWeight'] = new Chart(document.getElementById('chart-max-weight'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    data: data.map(d => d.maxWeight),
                    borderColor: '#39FF14',
                    backgroundColor: 'rgba(57,255,20,0.1)',
                    fill: true,
                }],
            },
            options: lineOpts,
        });

        // ボリューム
        _chartInstances['volume'] = new Chart(document.getElementById('chart-volume'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data: data.map(d => d.volume),
                    backgroundColor: 'rgba(0,212,255,0.3)',
                    borderColor: '#00D4FF',
                    borderWidth: 1,
                    borderRadius: 4,
                }],
            },
            options: {
                ...lineOpts,
                scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
            },
        });

        // 部位バランス（レーダー）
        _renderBalanceChart();
    }

    function _renderBalanceChart() {
        const now = new Date();
        const fourWeeksAgo = new Date(now);
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        const workouts = DataManager.getWorkoutsInRange(
            fourWeeksAgo.toISOString().split('T')[0],
            now.toISOString().split('T')[0]
        );

        const catSets = { chest: 0, back: 0, shoulder: 0, arms: 0, legs: 0, abs: 0 };
        for (const w of workouts) {
            for (const ex of w.exercises) {
                const info = DataManager.getExerciseById(ex.exerciseId);
                if (info && catSets.hasOwnProperty(info.category)) {
                    catSets[info.category] += ex.sets.filter(s => s.completed).length;
                }
            }
        }

        _chartInstances['balance'] = new Chart(document.getElementById('chart-balance'), {
            type: 'radar',
            data: {
                labels: ['胸', '背中', '肩', '腕', '脚', '腹'],
                datasets: [{
                    data: [catSets.chest, catSets.back, catSets.shoulder, catSets.arms, catSets.legs, catSets.abs],
                    borderColor: '#00D4FF',
                    backgroundColor: 'rgba(0,212,255,0.15)',
                    borderWidth: 2,
                    pointBackgroundColor: '#00D4FF',
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.08)' },
                        angleLines: { color: 'rgba(255,255,255,0.08)' },
                        ticks: { display: false },
                    },
                },
            },
        });
    }

    function _renderRecoveryStatus() {
        const container = document.getElementById('recovery-status-container');
        if (!container) return;

        const workouts = DataManager.getRecentWorkouts(30); // 直近30回分で判定
        const lastTrained = {}; // { category: timestamp }

        for (const w of workouts) {
            for (const ex of w.exercises) {
                if (!ex.sets.some(s => s.completed)) continue;
                const info = DataManager.getExerciseById(ex.exerciseId);
                if (info && info.category !== 'other') {
                    if (!lastTrained[info.category] || w.startTime > lastTrained[info.category]) {
                        lastTrained[info.category] = w.startTime;
                    }
                }
            }
        }

        const now = Date.now();
        const categories = DataManager.CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'other');

        let html = '<div class="recovery-list" style="display:flex;flex-direction:column;gap:12px;">';

        categories.forEach(cat => {
            const lastTime = lastTrained[cat.id];
            let recoveryPercent = 100; // 未トレーニングなら100%回復
            let statusText = '完全回復';
            let barColor = 'var(--color-accent)';

            if (lastTime) {
                const hoursPassed = (now - lastTime) / (1000 * 60 * 60);
                // 仮の計算論理: 72時間で100%回復すると仮定
                recoveryPercent = Math.min(100, Math.round((hoursPassed / 72) * 100));

                if (recoveryPercent < 40) {
                    statusText = '疲労中';
                    barColor = 'var(--color-danger)';
                } else if (recoveryPercent < 80) {
                    statusText = '回復中';
                    barColor = 'var(--color-gold)';
                } else {
                    statusText = '良好';
                    barColor = 'var(--color-primary)';
                }
            }

            html += `
                <div class="recovery-item">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.875rem;">
                        <span style="font-weight:600;color:var(--color-${cat.id})">${cat.name}</span>
                        <span style="color:var(--color-text-secondary);font-size:0.8125rem;">${statusText} (${recoveryPercent}%)</span>
                    </div>
                    <div style="background:rgba(255,255,255,0.1);height:8px;border-radius:4px;overflow:hidden;">
                        <div style="width:${recoveryPercent}%;height:100%;background:${barColor};border-radius:4px;transition:width 1s ease;"></div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    function _renderPRList() {
        const prContainer = document.getElementById('pr-list-container');
        if (!prContainer) return;
        const prs = DataManager.getPersonalRecords();
        const exPR = prs[_selectedExerciseId];

        if (!exPR || Object.keys(exPR).length === 0) {
            prContainer.innerHTML = `<div class="card card-compact" style="text-align:center;color:var(--color-text-secondary);">まだPRデータがありません</div>`;
            return;
        }

        let html = '<div class="pr-list">';
        if (exPR.maxWeight) {
            html += `
        <div class="card card-compact pr-item has-record">
          <div><div class="pr-type">最大重量</div><div class="pr-val">${exPR.maxWeight.value} kg</div><div class="pr-date">${exPR.maxWeight.date}</div></div>
        </div>
      `;
        }
        if (exPR.maxEstimated1RM) {
            html += `
        <div class="card card-compact pr-item has-record">
          <div><div class="pr-type">推定1RM</div><div class="pr-val">${exPR.maxEstimated1RM.value} kg</div><div class="pr-date">${exPR.maxEstimated1RM.date}</div></div>
        </div>
      `;
        }
        if (exPR.maxReps) {
            html += `
        <div class="card card-compact pr-item has-record">
          <div><div class="pr-type">最大レップ数</div><div class="pr-val">${exPR.maxReps.value} 回 (${exPR.maxReps.repsWeight}kg)</div><div class="pr-date">${exPR.maxReps.date}</div></div>
        </div>
      `;
        }
        html += '</div>';
        prContainer.innerHTML = html;
    }

    function _bindEvents() {
        document.getElementById('stats-exercise-select')?.addEventListener('change', (e) => {
            _selectedExerciseId = e.target.value;
            _renderCharts();
            _renderPRList();
        });

        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                _period = btn.dataset.period;
                render();
            });
        });
    }

    return { render };
})();
