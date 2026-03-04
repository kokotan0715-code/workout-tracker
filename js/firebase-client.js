/* ============================
   firebase-client.js - クラウド同期機能 (BaaS連携)
   ユーザーがFirebaseプロジェクトのConfigを登録することで、
   複数デバイス間でのデータ同期を可能にする
   ============================ */

const FirebaseClient = (() => {
    let app = null;
    let db = null;
    let auth = null;
    let currentUser = null;

    // Firebase SDKが読み込まれているかチェック
    function isInstalled() {
        return typeof window.firebase !== 'undefined';
    }

    // 設定から初期化
    function init(configStr) {
        if (!isInstalled()) {
            console.warn("Firebase SDK is not loaded.");
            return false;
        }
        try {
            const config = JSON.parse(configStr);
            if (!app) {
                app = firebase.initializeApp(config);
                db = firebase.firestore();
                auth = firebase.auth();

                auth.onAuthStateChanged(user => {
                    currentUser = user;
                    EventBus.emit('auth-state-changed', user);
                    if (user) {
                        _syncDown(); // ログインしたらダウンロード同期
                    }
                });
            }
            return true;
        } catch (e) {
            console.error("Firebase init failed:", e);
            return false;
        }
    }

    function login(email, password) {
        if (!auth) throw new Error("Firebase is not initialized");
        return auth.signInWithEmailAndPassword(email, password);
    }

    function logout() {
        if (!auth) return Promise.resolve();
        return auth.signOut();
    }

    function getCurrentUser() {
        return currentUser;
    }

    // LocalStorageの全データをFirestoreへアップロード
    async function syncUp() {
        if (!currentUser || !db) throw new Error("Not authenticated or initialized");
        const data = DataManager.exportAllData();
        const docRef = db.collection('user_data').doc(currentUser.uid);
        await docRef.set({
            payload: JSON.stringify(data),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    }

    // FirestoreからデータをダウンロードしてLocalStorageを上書き
    async function _syncDown() {
        if (!currentUser || !db) return;
        try {
            const doc = await db.collection('user_data').doc(currentUser.uid).get();
            if (doc.exists) {
                const data = JSON.parse(doc.data().payload);
                DataManager.importAllData(data);
                EventBus.emit('data-synced');
            }
        } catch (e) {
            console.error("Sync down failed:", e);
        }
    }

    // 手動での同期実行（ダウンロード）用
    function syncDown() {
        return _syncDown();
    }

    return {
        isInstalled,
        init,
        login,
        logout,
        getCurrentUser,
        syncUp,
        syncDown
    };
})();
