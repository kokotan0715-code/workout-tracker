/* ============================
   app.js - メインエントリー
   Pub/Sub状態管理、SPAルーティング、初期化
   ============================ */

// --- EventBus（Pub/Sub） ---
const EventBus = (() => {
    const _listeners = {};

    function on(event, callback) {
        if (!_listeners[event]) _listeners[event] = [];
        _listeners[event].push(callback);
    }

    function off(event, callback) {
        if (!_listeners[event]) return;
        _listeners[event] = _listeners[event].filter(cb => cb !== callback);
    }

    function emit(event, data) {
        if (!_listeners[event]) return;
        _listeners[event].forEach(cb => cb(data));
    }

    return { on, off, emit };
})();

// --- SPAルーター ---
const Router = (() => {
    let _currentPage = 'dashboard';
    const _pages = ['dashboard', 'workout', 'history', 'stats', 'tools', 'settings'];

    function navigate(page) {
        if (!_pages.includes(page)) return;
        if (_currentPage === 'workout' && page !== 'workout') {
            Workout.cleanup();
        }
        _currentPage = page;

        // ページ表示切替
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) pageEl.classList.add('active');

        // ナビゲーション更新
        document.querySelectorAll('.nav-item, .tab-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // 画面レンダリング
        _renderPage(page);

        // スクロールトップ
        window.scrollTo(0, 0);
    }

    function _renderPage(page) {
        switch (page) {
            case 'dashboard': Dashboard.render(); break;
            case 'workout': Workout.render(); break;
            case 'history': History.render(); break;
            case 'stats': Stats.render(); break;
            case 'tools': Tools.render(); break;
            case 'settings': Settings.render(); break;
        }
    }

    function getCurrentPage() { return _currentPage; }

    return { navigate, getCurrentPage };
})();

// --- アプリ初期化 ---
const App = (() => {
    function init() {
        // データ初期化
        DataManager.init();

        // イベントリスナー登録
        _setupEventListeners();

        // 初回起動チェック
        if (DataManager.isFirstLaunch()) {
            _showWelcome();
        } else {
            _showApp();
        }
    }

    function _setupEventListeners() {
        // ナビゲーションイベント
        EventBus.on('navigate', (page) => Router.navigate(page));
        EventBus.on('start-workout', () => Workout.start());
        EventBus.on('resume-workout', () => Workout.resume());
        EventBus.on('storage-warning', () => {
            UI.showToast('⚠️ ストレージの容量が不足しています。設定からデータをエクスポートしてください。', 'error', 5000);
        });

        // ナビゲーションクリック
        document.querySelectorAll('.nav-item, .tab-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) EventBus.emit('navigate', page);
            });
        });

        // サイドバー折りたたみ
        document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.toggle('collapsed');
        });

        // リップルエフェクト（ボタン全般）
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn');
            if (!btn) return;
            const rect = btn.getBoundingClientRect();
            btn.style.setProperty('--ripple-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
            btn.style.setProperty('--ripple-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
        });
    }

    function _showWelcome() {
        const welcome = document.getElementById('welcome-screen');
        welcome.classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');

        // ステップナビゲーション
        document.querySelectorAll('.welcome-next').forEach(btn => {
            btn.addEventListener('click', () => {
                const nextStep = parseInt(btn.dataset.next);
                document.querySelectorAll('.welcome-step').forEach(s => s.classList.remove('active'));
                document.querySelector(`.welcome-step[data-step="${nextStep}"]`)?.classList.add('active');
                document.querySelectorAll('.welcome-dots .dot').forEach(d => {
                    d.classList.toggle('active', parseInt(d.dataset.step) === nextStep);
                });
            });
        });

        // 「はじめる」ボタン
        document.getElementById('welcome-start')?.addEventListener('click', () => {
            const nickname = document.getElementById('welcome-nickname')?.value?.trim() || '';
            const profile = DataManager.getProfile();
            profile.nickname = nickname;
            DataManager.saveProfile(profile);
            DataManager.markFirstLaunchDone();
            welcome.classList.add('hidden');
            _showApp();
        });
    }

    function _showApp() {
        const app = document.getElementById('app');
        app.classList.remove('hidden');

        // 進行中ワークアウトがあればワークアウト画面へ
        if (DataManager.getActiveWorkout()) {
            Router.navigate('workout');
        } else {
            Router.navigate('dashboard');
        }
    }

    return { init };
})();

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => App.init());
