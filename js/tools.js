const Tools = (function () {
  function render() {
    const container = document.getElementById('tools-content');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header">
        <h1>🧮 便利ツール</h1>
      </div>
      
      <div class="card" style="margin-bottom: 20px;">
        <h2 style="font-size: 1.125rem; margin-bottom: 16px; display:flex; align-items:center; gap:8px;">
          <span>💪</span> 1RM (最大挙上重量) 計算機
        </h2>
        <div style="display:flex; gap:12px; margin-bottom: 16px;">
          <div style="flex:1;">
            <label class="input-label">重量 (kg)</label>
            <input type="number" id="calc-1rm-weight" class="input-field" placeholder="例: 80" value="80" step="0.5" inputmode="decimal">
          </div>
          <div style="flex:1;">
            <label class="input-label">回数 (Reps)</label>
            <input type="number" id="calc-1rm-reps" class="input-field" placeholder="例: 10" value="10" min="1" max="30" inputmode="numeric">
          </div>
        </div>
        
        <div style="background: rgba(var(--color-primary-rgb), 0.1); border: 1px solid rgba(var(--color-primary-rgb), 0.3); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px; text-align: center;">
          <div style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 4px;">推定 1RM</div>
          <div id="calc-1rm-result" style="font-size: 2rem; font-weight: 800; color: var(--color-primary);">-- kg</div>
        </div>
        
        <div class="set-table" style="margin-top:0;">
          <div class="set-table-header" style="grid-template-columns: 1fr 1fr;">
            <span>% 1RM</span>
            <span style="text-align:right;">重量目安</span>
          </div>
          <div id="calc-1rm-percentages">
            <!-- %一覧がここに入る -->
          </div>
        </div>
      </div>
      
      <div class="card">
        <h2 style="font-size: 1.125rem; margin-bottom: 16px; display:flex; align-items:center; gap:8px;">
          <span>🏋️‍♂️</span> バーベルプレート計算機
        </h2>
        <div style="display:flex; gap:12px; margin-bottom: 16px;">
          <div style="flex:2;">
            <label class="input-label">目標重量 (kg)</label>
            <input type="number" id="calc-plate-target" class="input-field" placeholder="例: 100" value="100" step="0.5" inputmode="decimal">
          </div>
          <div style="flex:1;">
            <label class="input-label">バーの重さ</label>
            <select id="calc-plate-bar" class="input-field">
              <option value="20" selected>20 kg (一般)</option>
              <option value="15">15 kg (女子用)</option>
              <option value="10">10 kg (EZバー等)</option>
            </select>
          </div>
        </div>
        
        <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px;">
          <div style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 12px; text-align:center;">片側に付けるプレート構成</div>
          <div id="calc-plate-result" style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; min-height: 40px; align-items:center;">
             <!-- プレート図がここに入る -->
          </div>
        </div>
      </div>
    `;

    _bindEvents();
    _calc1RM();
    _calcPlates();
  }

  function _bindEvents() {
    document.getElementById('calc-1rm-weight')?.addEventListener('input', _calc1RM);
    document.getElementById('calc-1rm-reps')?.addEventListener('input', _calc1RM);

    document.getElementById('calc-plate-target')?.addEventListener('input', _calcPlates);
    document.getElementById('calc-plate-bar')?.addEventListener('change', _calcPlates);
  }

  function _calc1RM() {
    const w = parseFloat(document.getElementById('calc-1rm-weight')?.value);
    const r = parseInt(document.getElementById('calc-1rm-reps')?.value);

    const resEl = document.getElementById('calc-1rm-result');
    const percEl = document.getElementById('calc-1rm-percentages');

    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) {
      if (resEl) resEl.textContent = '-- kg';
      if (percEl) percEl.innerHTML = '';
      return;
    }

    // O'Conner式 / 日本の標準式: 1RM = Weight * (1 + Reps / 40)
    const oneRM = r === 1 ? w : w * (1 + r / 40);
    if (resEl) resEl.textContent = `${Math.round(oneRM * 10) / 10} kg`;

    if (percEl) {
      const percentages = [95, 90, 85, 80, 75, 70, 65, 60, 50];
      let html = '';
      percentages.forEach(p => {
        const estW = oneRM * (p / 100);
        // 通常のジムプレート（最小1.25kg刻み＝両側で2.5kg刻みのため、2.5の倍数に丸めるのが一般的だが、細かい計算のためそのまま丸めるか2.5刻みか）
        const rounded = Math.round(estW / 2.5) * 2.5;
        html += `
          <div class="set-row" style="grid-template-columns: 1fr 1fr;">
            <div style="font-weight:600; color:var(--color-primary);">${p}%</div>
            <div style="text-align:right;">${rounded} kg <span style="font-size:0.7rem;color:var(--color-text-hint);">(約${Math.round(estW * 10) / 10}kg)</span></div>
          </div>
        `;
      });
      percEl.innerHTML = html;
    }
  }

  function _calcPlates() {
    const target = parseFloat(document.getElementById('calc-plate-target')?.value);
    const bar = parseFloat(document.getElementById('calc-plate-bar')?.value);
    const resEl = document.getElementById('calc-plate-result');

    if (isNaN(target) || isNaN(bar) || target <= bar || !resEl) {
      if (resEl) resEl.innerHTML = '<span style="color:var(--color-text-hint);">目標重量がバーの重さ以下です</span>';
      return;
    }

    const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
    // 片側の重量
    let weightPerSide = (target - bar) / 2;
    const loadedPlates = [];

    for (const plate of availablePlates) {
      while (weightPerSide >= plate) {
        loadedPlates.push(plate);
        weightPerSide -= plate;
        // 浮動小数点誤差対策
        weightPerSide = Math.round(weightPerSide * 100) / 100;
      }
    }

    if (loadedPlates.length === 0) {
      resEl.innerHTML = '<span style="color:var(--color-text-hint);">追加のプレートは不要です</span>';
      return;
    }

    let html = '';
    // プレートの色分け（簡易的）
    const getPlateColor = (kg) => {
      if (kg >= 25) return '#e53935'; // 赤
      if (kg >= 20) return '#1e88e5'; // 青
      if (kg >= 15) return '#fdd835'; // 黄
      if (kg >= 10) return '#4caf50'; // 緑
      if (kg >= 5) return '#ffffff';  // 白
      return '#9e9e9e'; // 黒/グレー
    };
    const getPlateTextColor = (kg) => {
      if (kg >= 25 || kg >= 20 || kg >= 10) return '#fff';
      return '#000';
    };

    loadedPlates.forEach(p => {
      const height = p >= 20 ? 44 : (p >= 10 ? 36 : (p >= 5 ? 28 : 22));
      const width = p >= 10 ? 16 : 12;
      const color = getPlateColor(p);
      const tColor = getPlateTextColor(p);
      html += `
        <div style="background:${color}; color:${tColor}; height:${height}px; min-width:32px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; border:1px solid rgba(0,0,0,0.2); box-shadow:inset 0 0 4px rgba(0,0,0,0.2);">
          ${p}
        </div>
      `;
    });

    if (weightPerSide > 0) {
      html += `<div style="font-size:0.75rem; color:var(--color-gold); margin-left:8px;">+ 残り ${weightPerSide * 2}kg (調整不可)</div>`;
    }

    resEl.innerHTML = html;
  }

  return { render };
})();
