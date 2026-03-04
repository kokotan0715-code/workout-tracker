/* ============================
   settings.js - 設定画面
   プロフィール、トレーニング設定、データ管理、カスタム種目
   ============================ */

const Settings = (() => {
    function render() {
        const container = document.getElementById('settings-content');
        const profile = DataManager.getProfile();
        const exercises = DataManager.getExercises();
        const customExercises = exercises.filter(e => e.isCustom);

        let html = `
      <h1 style="font-size:1.5rem;font-weight:700;margin-bottom:24px;">設定</h1>

      <!-- プロフィール -->
      <div class="settings-section">
        <h2>プロフィール</h2>
        <div class="settings-item">
          <div>
            <div class="settings-label">ニックネーム</div>
          </div>
          <div class="settings-value">
            <input type="text" class="input-field" id="settings-nickname" value="${profile.nickname || ''}" maxlength="20" style="width:160px;text-align:right;" placeholder="未設定">
          </div>
        </div>
      </div>

      <!-- トレーニング設定 -->
      <div class="settings-section">
        <h2>トレーニング設定</h2>
        <div class="settings-item">
          <div>
            <div class="settings-label">デフォルト休憩時間</div>
            <div class="settings-desc">セット完了時に自動で開始するタイマー</div>
          </div>
          <div class="settings-value">
            <input type="number" class="input-field input-number" id="settings-rest-time" value="${profile.defaultRestTime}" min="30" max="300" style="width:80px;">
            <span style="color:var(--color-text-secondary);font-size:0.875rem;">秒</span>
          </div>
        </div>
        <div class="settings-item">
          <div>
            <div class="settings-label">重量の刻み</div>
            <div class="settings-desc">±ボタンでの増減単位</div>
          </div>
          <div class="settings-value">
            <select class="input-field" id="settings-weight-step" style="width:100px;appearance:auto;">
              <option value="2.5"${profile.weightStep === 2.5 ? ' selected' : ''}>2.5 kg</option>
              <option value="1.25"${profile.weightStep === 1.25 ? ' selected' : ''}>1.25 kg</option>
            </select>
          </div>
        </div>
      </div>

      <!-- データ管理 -->
      <div class="settings-section">
        <h2>データ管理</h2>
        <div class="settings-item">
          <div>
            <div class="settings-label">データをエクスポート</div>
            <div class="settings-desc">全データをJSONファイルとして保存</div>
          </div>
          <div class="settings-value">
            <button class="btn btn-secondary btn-sm" id="settings-export">エクスポート</button>
          </div>
        </div>
        <div class="settings-item">
          <div>
            <div class="settings-label">データをインポート</div>
            <div class="settings-desc">JSONファイルからデータを復元（上書き）</div>
          </div>
          <div class="settings-value">
            <button class="btn btn-secondary btn-sm" id="settings-import">インポート</button>
            <input type="file" id="settings-import-file" accept=".json" style="display:none;">
          </div>
        </div>
        <div class="settings-item">
          <div>
            <div class="settings-label" style="color:var(--color-danger);">全データを削除</div>
            <div class="settings-desc">すべてのデータを完全に削除します</div>
          </div>
          <div class="settings-value">
            <button class="btn btn-danger btn-sm" id="settings-clear-all">削除</button>
          </div>
        </div>
      </div>

      <!-- カスタム種目 -->
      <div class="settings-section">
        <h2>カスタム種目 (${customExercises.length})</h2>
        ${customExercises.length === 0
                ? '<div style="color:var(--color-text-secondary);font-size:0.875rem;">カスタム種目はまだありません</div>'
                : customExercises.map(ex => `
            <div class="settings-item">
              <div>
                <div class="settings-label">${ex.name}</div>
                <div class="settings-desc">${DataManager.CATEGORY_NAMES[ex.category] || ex.category}</div>
              </div>
              <div class="settings-value">
                <button class="btn btn-danger btn-sm btn-icon sm" data-delete-exercise="${ex.id}" aria-label="削除">🗑️</button>
              </div>
            </div>
          `).join('')}
      </div>

      <div style="text-align:center;color:var(--color-text-hint);font-size:0.75rem;padding:32px 0 16px;">
        Iron Log v1.0 • Made with 💪
      </div>
    `;

        container.innerHTML = html;
        _bindEvents();
    }

    function _bindEvents() {
        // ニックネーム保存
        document.getElementById('settings-nickname')?.addEventListener('change', (e) => {
            const profile = DataManager.getProfile();
            profile.nickname = e.target.value.trim().slice(0, 20);
            DataManager.saveProfile(profile);
            UI.showToast('ニックネームを保存しました', 'success');
        });

        // 休憩時間
        document.getElementById('settings-rest-time')?.addEventListener('change', (e) => {
            const profile = DataManager.getProfile();
            let val = parseInt(e.target.value);
            val = Math.max(30, Math.min(300, isNaN(val) ? 90 : val));
            e.target.value = val;
            profile.defaultRestTime = val;
            DataManager.saveProfile(profile);
            UI.showToast('休憩時間を保存しました', 'success');
        });

        // 重量刻み
        document.getElementById('settings-weight-step')?.addEventListener('change', (e) => {
            const profile = DataManager.getProfile();
            profile.weightStep = parseFloat(e.target.value);
            DataManager.saveProfile(profile);
            UI.showToast('重量の刻みを保存しました', 'success');
        });

        // エクスポート
        document.getElementById('settings-export')?.addEventListener('click', () => {
            const data = DataManager.exportAllData();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            a.href = url;
            a.download = `workout_backup_${date}.json`;
            a.click();
            URL.revokeObjectURL(url);
            UI.showToast('エクスポートしました', 'success');
        });

        // インポート
        const importBtn = document.getElementById('settings-import');
        const importFile = document.getElementById('settings-import-file');
        importBtn?.addEventListener('click', () => importFile?.click());
        importFile?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                const result = await UI.showModal(`
          <h2>データをインポート</h2>
          <p>⚠️ 既存のデータは全て上書きされます。<br>ファイル: ${file.name}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
            <button class="btn btn-danger" id="modal-confirm">上書きして復元</button>
          </div>
        `);
                if (result) {
                    DataManager.importAllData(data);
                    UI.showToast('データをインポートしました', 'success');
                    render();
                }
            } catch {
                UI.showToast('ファイルの読み込みに失敗しました', 'error');
            }
            // ファイル入力リセット
            importFile.value = '';
        });

        // 全削除
        document.getElementById('settings-clear-all')?.addEventListener('click', async () => {
            const result = await UI.showModal(`
        <h2 style="color:var(--color-danger);">全データを削除</h2>
        <p>すべてのワークアウト記録、設定、カスタム種目が完全に削除されます。この操作は元に戻せません。</p>
        <p>確認のため「<strong>削除する</strong>」と入力してください。</p>
        <input type="text" class="input-field" id="delete-confirm-input" placeholder="削除する" style="margin-bottom:16px;">
        <div class="modal-actions">
          <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
          <button class="btn btn-danger" id="modal-confirm">完全に削除</button>
        </div>
      `);
            if (result) {
                const input = document.getElementById('delete-confirm-input');
                if (input?.value === '削除する') {
                    DataManager.clearAllData();
                    DataManager.init();
                    UI.showToast('全データを削除しました', 'info');
                    render();
                } else {
                    UI.showToast('入力が一致しません', 'error');
                }
            }
        });

        // カスタム種目削除
        document.querySelectorAll('[data-delete-exercise]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.deleteExercise;
                const ex = DataManager.getExerciseById(id);
                const result = await UI.showModal(`
          <h2>種目を削除</h2>
          <p>「${ex?.name || ''}」を削除しますか？</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
            <button class="btn btn-danger" id="modal-confirm">削除</button>
          </div>
        `);
                if (result) {
                    DataManager.deleteExercise(id);
                    render();
                    UI.showToast('種目を削除しました', 'info');
                }
            });
        });
    }

    return { render };
})();
