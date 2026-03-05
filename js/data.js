/* ============================
   data.js - LocalStorageデータ管理
   CRUD操作・プリセット種目・ヘルパー関数
   ============================ */

const DataManager = (() => {
  // --- ストレージキー ---
  const KEYS = {
    PROFILE: 'wt_profile',
    EXERCISES: 'wt_exercises',
    PERSONAL_RECORDS: 'wt_personal_records',
    ACTIVE_WORKOUT: 'wt_active_workout',
    FIRST_LAUNCH: 'wt_first_launch_done',
    TEMPLATES: 'wt_templates', // テンプレート用キー追加
  };

  // --- プリセット種目 ---
  const PRESET_EXERCISES = [
    // 胸
    { id: 'chest_001', name: 'ベンチプレス', category: 'chest', isCustom: false, usageCount: 0 },
    { id: 'chest_002', name: 'インクラインベンチプレス', category: 'chest', isCustom: false, usageCount: 0 },
    { id: 'chest_003', name: 'ダンベルフライ', category: 'chest', isCustom: false, usageCount: 0 },
    { id: 'chest_004', name: 'ダンベルプレス', category: 'chest', isCustom: false, usageCount: 0 },
    { id: 'chest_005', name: 'ケーブルクロスオーバー', category: 'chest', isCustom: false, usageCount: 0 },
    { id: 'chest_006', name: 'チェストプレス（マシン）', category: 'chest', isCustom: false, usageCount: 0 },
    { id: 'chest_007', name: 'ディップス', category: 'chest', isCustom: false, usageCount: 0 },
    { id: 'chest_008', name: 'プッシュアップ', category: 'chest', isCustom: false, usageCount: 0 },
    // 背中
    { id: 'back_001', name: 'デッドリフト', category: 'back', isCustom: false, usageCount: 0 },
    { id: 'back_002', name: 'ラットプルダウン', category: 'back', isCustom: false, usageCount: 0 },
    { id: 'back_003', name: 'チンニング（懸垂）', category: 'back', isCustom: false, usageCount: 0 },
    { id: 'back_004', name: 'バーベルロウ', category: 'back', isCustom: false, usageCount: 0 },
    { id: 'back_005', name: 'ダンベルロウ', category: 'back', isCustom: false, usageCount: 0 },
    { id: 'back_006', name: 'シーテッドロウ', category: 'back', isCustom: false, usageCount: 0 },
    { id: 'back_007', name: 'Tバーロウ', category: 'back', isCustom: false, usageCount: 0 },
    { id: 'back_008', name: 'フェイスプル', category: 'back', isCustom: false, usageCount: 0 },
    // 肩
    { id: 'shoulder_001', name: 'オーバーヘッドプレス', category: 'shoulder', isCustom: false, usageCount: 0 },
    { id: 'shoulder_002', name: 'サイドレイズ', category: 'shoulder', isCustom: false, usageCount: 0 },
    { id: 'shoulder_003', name: 'フロントレイズ', category: 'shoulder', isCustom: false, usageCount: 0 },
    { id: 'shoulder_004', name: 'リアレイズ', category: 'shoulder', isCustom: false, usageCount: 0 },
    { id: 'shoulder_005', name: 'アーノルドプレス', category: 'shoulder', isCustom: false, usageCount: 0 },
    { id: 'shoulder_006', name: 'アップライトロウ', category: 'shoulder', isCustom: false, usageCount: 0 },
    { id: 'shoulder_007', name: 'ショルダープレス（マシン）', category: 'shoulder', isCustom: false, usageCount: 0 },
    // 腕
    { id: 'arms_001', name: 'バーベルカール', category: 'arms', isCustom: false, usageCount: 0 },
    { id: 'arms_002', name: 'ダンベルカール', category: 'arms', isCustom: false, usageCount: 0 },
    { id: 'arms_003', name: 'ハンマーカール', category: 'arms', isCustom: false, usageCount: 0 },
    { id: 'arms_004', name: 'プリーチャーカール', category: 'arms', isCustom: false, usageCount: 0 },
    { id: 'arms_005', name: 'トライセプスエクステンション', category: 'arms', isCustom: false, usageCount: 0 },
    { id: 'arms_006', name: 'スカルクラッシャー', category: 'arms', isCustom: false, usageCount: 0 },
    { id: 'arms_007', name: 'ケーブルプッシュダウン', category: 'arms', isCustom: false, usageCount: 0 },
    { id: 'arms_008', name: 'キックバック', category: 'arms', isCustom: false, usageCount: 0 },
    // 脚
    { id: 'legs_001', name: 'スクワット', category: 'legs', isCustom: false, usageCount: 0 },
    { id: 'legs_002', name: 'レッグプレス', category: 'legs', isCustom: false, usageCount: 0 },
    { id: 'legs_003', name: 'レッグエクステンション', category: 'legs', isCustom: false, usageCount: 0 },
    { id: 'legs_004', name: 'レッグカール', category: 'legs', isCustom: false, usageCount: 0 },
    { id: 'legs_005', name: 'ブルガリアンスクワット', category: 'legs', isCustom: false, usageCount: 0 },
    { id: 'legs_006', name: 'ランジ', category: 'legs', isCustom: false, usageCount: 0 },
    { id: 'legs_007', name: 'カーフレイズ', category: 'legs', isCustom: false, usageCount: 0 },
    { id: 'legs_008', name: 'ヒップスラスト', category: 'legs', isCustom: false, usageCount: 0 },
    // 腹
    { id: 'abs_001', name: 'クランチ', category: 'abs', isCustom: false, usageCount: 0 },
    { id: 'abs_002', name: 'レッグレイズ', category: 'abs', isCustom: false, usageCount: 0 },
    { id: 'abs_003', name: 'プランク', category: 'abs', isCustom: false, usageCount: 0 },
    { id: 'abs_004', name: 'アブローラー', category: 'abs', isCustom: false, usageCount: 0 },
    { id: 'abs_005', name: 'サイドベンド', category: 'abs', isCustom: false, usageCount: 0 },
    { id: 'abs_006', name: 'ハンギングレッグレイズ', category: 'abs', isCustom: false, usageCount: 0 },
    { id: 'abs_007', name: 'ケーブルクランチ', category: 'abs', isCustom: false, usageCount: 0 },
  ];

  const CATEGORIES = [
    { id: 'all', name: '全て', color: null },
    { id: 'chest', name: '胸', color: 'var(--color-chest)' },
    { id: 'back', name: '背中', color: 'var(--color-back)' },
    { id: 'shoulder', name: '肩', color: 'var(--color-shoulder)' },
    { id: 'arms', name: '腕', color: 'var(--color-arms)' },
    { id: 'legs', name: '脚', color: 'var(--color-legs)' },
    { id: 'abs', name: '腹', color: 'var(--color-abs)' },
    { id: 'other', name: 'その他', color: 'var(--color-other)' },
  ];

  const CATEGORY_COLORS = {
    chest: 'var(--color-chest)',
    back: 'var(--color-back)',
    shoulder: 'var(--color-shoulder)',
    arms: 'var(--color-arms)',
    legs: 'var(--color-legs)',
    abs: 'var(--color-abs)',
    other: 'var(--color-other)',
  };

  const CATEGORY_NAMES = {
    chest: '胸', back: '背中', shoulder: '肩',
    arms: '腕', legs: '脚', abs: '腹', other: 'その他',
  };

  // --- ヘルパー ---
  function _get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function _set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) {
      // ストレージ容量超過
      if (e.name === 'QuotaExceededError') {
        EventBus.emit('storage-warning');
      }
    }
  }
  function _remove(key) { localStorage.removeItem(key); }

  // --- 月別ワークアウトキー ---
  function _workoutKey(year, month) {
    return `wt_workouts_${year}_${String(month).padStart(2, '0')}`;
  }

  // --- 深夜トレ考慮の日付取得（3:00まで前日扱い） ---
  function getTrainingDate(timestamp) {
    const d = new Date(timestamp);
    if (d.getHours() < 3) {
      d.setDate(d.getDate() - 1);
    }
    return d.toISOString().split('T')[0];
  }

  // --- 初期化 ---
  function init() {
    // 種目データが無ければシード
    if (!_get(KEYS.EXERCISES)) {
      _set(KEYS.EXERCISES, PRESET_EXERCISES);
    }
    // プロフィールが無ければデフォルト
    if (!_get(KEYS.PROFILE)) {
      _set(KEYS.PROFILE, { nickname: '', defaultRestTime: 90, weightStep: 2.5 });
    }
    // PR初期化
    if (!_get(KEYS.PERSONAL_RECORDS)) {
      _set(KEYS.PERSONAL_RECORDS, {});
    }
  }

  function isFirstLaunch() { return !_get(KEYS.FIRST_LAUNCH); }
  function markFirstLaunchDone() { _set(KEYS.FIRST_LAUNCH, true); }

  // --- プロフィール ---
  function getProfile() {
    return _get(KEYS.PROFILE) || { nickname: '', defaultRestTime: 90, weightStep: 2.5 };
  }
  function saveProfile(profile) { _set(KEYS.PROFILE, profile); }

  // --- 種目 ---
  function getExercises() { return _get(KEYS.EXERCISES) || []; }
  function saveExercises(exercises) { _set(KEYS.EXERCISES, exercises); }
  function getExerciseById(id) { return getExercises().find(e => e.id === id); }

  function addCustomExercise(name, category) {
    const exercises = getExercises();
    const newExercise = {
      id: `custom_${Date.now()}`,
      name,
      category: category || 'other',
      isCustom: true,
      usageCount: 0,
    };
    exercises.push(newExercise);
    saveExercises(exercises);
    return newExercise;
  }

  function deleteExercise(id) {
    const exercises = getExercises().filter(e => e.id !== id);
    saveExercises(exercises);
  }

  function incrementUsageCount(exerciseId) {
    const exercises = getExercises();
    const ex = exercises.find(e => e.id === exerciseId);
    if (ex) { ex.usageCount = (ex.usageCount || 0) + 1; saveExercises(exercises); }
  }

  // --- ワークアウト ---
  function getWorkouts(year, month) {
    return _get(_workoutKey(year, month)) || [];
  }

  function saveWorkout(workout) {
    const d = new Date(workout.startTime);
    const dateStr = getTrainingDate(workout.startTime);
    const [y, m] = dateStr.split('-');
    const key = _workoutKey(parseInt(y), parseInt(m));
    const workouts = _get(key) || [];
    // 既存の更新 or 新規追加
    const idx = workouts.findIndex(w => w.id === workout.id);
    if (idx >= 0) { workouts[idx] = workout; }
    else { workouts.push(workout); }
    _set(key, workouts);
    // 使用回数更新
    (workout.exercises || []).forEach(ex => incrementUsageCount(ex.exerciseId));
  }

  function deleteWorkout(workoutId, year, month) {
    const key = _workoutKey(year, month);
    const workouts = (_get(key) || []).filter(w => w.id !== workoutId);
    _set(key, workouts);
  }

  // 直近N件のワークアウトを取得
  function getRecentWorkouts(count = 5) {
    const results = [];
    const now = new Date();
    let y = now.getFullYear(), m = now.getMonth() + 1;
    for (let i = 0; i < 6 && results.length < count; i++) {
      const ws = getWorkouts(y, m);
      ws.sort((a, b) => b.startTime - a.startTime);
      results.push(...ws);
      m--;
      if (m < 1) { m = 12; y--; }
    }
    return results.slice(0, count);
  }

  // 指定種目の前回記録を取得（最大3ヶ月遡る）
  function getPreviousRecord(exerciseId) {
    const now = new Date();
    let y = now.getFullYear(), m = now.getMonth() + 1;
    for (let i = 0; i < 3; i++) {
      const workouts = getWorkouts(y, m);
      workouts.sort((a, b) => b.startTime - a.startTime);
      for (const w of workouts) {
        const ex = w.exercises.find(e => e.exerciseId === exerciseId);
        if (ex && ex.sets && ex.sets.length > 0) {
          return ex.sets;
        }
      }
      m--;
      if (m < 1) { m = 12; y--; }
    }
    return null;
  }

  // AI推奨機能（1RM推定と最適重量提案）
  function getAIRecommendation(exerciseId) {
    const now = new Date();
    let y = now.getFullYear(), m = now.getMonth() + 1;
    let recentWorkoutsWithEx = [];

    for (let i = 0; i < 6 && recentWorkoutsWithEx.length < 3; i++) {
      const workouts = getWorkouts(y, m);
      workouts.sort((a, b) => b.startTime - a.startTime);
      for (const w of workouts) {
        const ex = w.exercises.find(e => e.exerciseId === exerciseId);
        if (ex && ex.sets && ex.sets.length > 0) {
          const completedSets = ex.sets.filter(s => s.completed);
          if (completedSets.length > 0) {
            recentWorkoutsWithEx.push(completedSets);
          }
        }
      }
      m--;
      if (m < 1) { m = 12; y--; }
    }

    if (recentWorkoutsWithEx.length === 0) return null;

    let maxESTs = [];
    for (const workoutSets of recentWorkoutsWithEx) {
      let maxEST = 0;
      for (const s of workoutSets) {
        if (s.weight <= 0 || s.reps <= 0) continue;
        // O'Conner式 / 日本の標準式: 1RM = Weight * (1 + Reps / 40)
        const est = s.reps === 1 ? s.weight : s.weight * (1 + s.reps / 40);
        if (est > maxEST) maxEST = est;
      }
      maxESTs.push(maxEST);
    }

    if (maxESTs.length === 0 || maxESTs[0] === 0) return null;

    const currentEST = maxESTs[0];
    // デフォルト: 筋肥大目的(約75%で10回)
    let targetWeight = Math.round((currentEST * 0.75) / 2.5) * 2.5;
    let targetReps = 10;
    let isPlateau = false;

    // プラトー判定: 3回分の記録があり、直近が古いもの以下で停滞している場合
    if (maxESTs.length >= 3) {
      if (maxESTs[0] <= maxESTs[1] && maxESTs[1] <= maxESTs[2]) {
        isPlateau = true;
        // ディロード（刺激の変化）提案
        targetWeight = Math.round((currentEST * 0.65) / 2.5) * 2.5;
        targetReps = 12;
      }
    }

    return {
      oneRM: Math.round(currentEST),
      recommendedWeight: targetWeight,
      recommendedReps: targetReps,
      isPlateau: isPlateau
    };
  }

  // 指定期間のワークアウトを全取得
  function getWorkoutsInRange(startDate, endDate) {
    const results = [];
    const s = new Date(startDate);
    const e = new Date(endDate);
    let y = s.getFullYear(), m = s.getMonth() + 1;
    const ey = e.getFullYear(), em = e.getMonth() + 1;
    while (y < ey || (y === ey && m <= em)) {
      results.push(...getWorkouts(y, m));
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return results.filter(w => {
      const d = new Date(w.date || getTrainingDate(w.startTime));
      return d >= s && d <= e;
    });
  }

  // 特定日のワークアウト取得
  function getWorkoutsByDate(dateStr) {
    const [y, m] = dateStr.split('-').map(Number);
    return getWorkouts(y, m).filter(w => (w.date || getTrainingDate(w.startTime)) === dateStr);
  }

  // --- アクティブワークアウト（進行中） ---
  function getActiveWorkout() { return _get(KEYS.ACTIVE_WORKOUT); }
  function saveActiveWorkout(data) { _set(KEYS.ACTIVE_WORKOUT, data); }
  function clearActiveWorkout() { _remove(KEYS.ACTIVE_WORKOUT); }

  // --- テンプレート設定 ---
  function getTemplates() { return _get(KEYS.TEMPLATES) || []; }
  function saveTemplates(templates) { _set(KEYS.TEMPLATES, templates); }
  function saveTemplate(template) {
    const templates = getTemplates();
    if (!template.id) template.id = `tpl_${Date.now()}`;
    const idx = templates.findIndex(t => t.id === template.id);
    if (idx >= 0) templates[idx] = template;
    else templates.push(template);
    saveTemplates(templates);
    return template;
  }
  function deleteTemplate(id) {
    const templates = getTemplates().filter(t => t.id !== id);
    saveTemplates(templates);
  }

  // --- PR ---
  function getPersonalRecords() { return _get(KEYS.PERSONAL_RECORDS) || {}; }
  function savePersonalRecords(prs) { _set(KEYS.PERSONAL_RECORDS, prs); }

  // PR更新チェック（ワークアウト完了時に呼ぶ）
  function checkAndUpdatePRs(workout) {
    const prs = getPersonalRecords();
    const updatedPRs = [];
    const dateStr = workout.date || getTrainingDate(workout.startTime);

    for (const ex of workout.exercises) {
      if (!prs[ex.exerciseId]) {
        prs[ex.exerciseId] = {};
      }
      const pr = prs[ex.exerciseId];

      for (const set of ex.sets) {
        if (!set.completed || !set.weight || !set.reps) continue;

        // 空文字やNaNを弾く
        const w = parseFloat(set.weight);
        const r = parseInt(set.reps);
        if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) continue;

        // 最大重量
        if (!pr.maxWeight || w > pr.maxWeight.value) {
          // 同じ重量で回数が更新された場合もPRとするか？ ここでは純粋なMaxWeightのみ
          const oldW = pr.maxWeight ? pr.maxWeight.value : 0;
          pr.maxWeight = { value: w, date: dateStr };
          updatedPRs.push({ exerciseId: ex.exerciseId, type: 'maxWeight', value: `${w}kg` });
        }
        // 最大推定1RM（Epley式等）
        const est1RM = r === 1 ? w : Math.round(w * (1 + r / 40) * 10) / 10;
        if (!pr.maxEstimated1RM || est1RM > pr.maxEstimated1RM.value) {
          pr.maxEstimated1RM = { value: est1RM, date: dateStr };
          updatedPRs.push({ exerciseId: ex.exerciseId, type: 'maxEstimated1RM', value: `推定1RM ${est1RM}kg` });
        }
        // 最大レップ数
        if (!pr.maxReps || r > pr.maxReps.value) {
          pr.maxReps = { value: r, repsWeight: w, date: dateStr };
          // レップ数単独のPRは多すぎるので通知からは除外（または条件付き）
          // 今回は一応トラッキングする
        }
      }
    }

    savePersonalRecords(prs);
    return updatedPRs;
  }

  // --- 統計ヘルパー ---
  // ワークアウトの総ボリューム
  function calcWorkoutVolume(workout) {
    let vol = 0;
    for (const ex of workout.exercises) {
      for (const s of ex.sets) {
        if (s.completed) vol += (s.weight || 0) * (s.reps || 0);
      }
    }
    return vol;
  }

  // ワークアウトの完了セット数
  function calcCompletedSets(workout) {
    let count = 0;
    for (const ex of workout.exercises) {
      for (const s of ex.sets) { if (s.completed) count++; }
    }
    return count;
  }

  // ワークアウト時間（分）
  function calcDuration(workout) {
    if (!workout.endTime || !workout.startTime) return 0;
    return Math.round((workout.endTime - workout.startTime) / 60000);
  }

  // 部位リスト取得
  function getWorkoutCategories(workout) {
    const cats = new Set();
    const exercises = getExercises();
    for (const ex of workout.exercises) {
      const found = exercises.find(e => e.id === ex.exerciseId);
      if (found) cats.add(found.category);
    }
    return [...cats];
  }

  // 週間サマリー
  function getWeeklySummary() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=日
    const sunday = new Date(now);
    // 日曜日始まりなので常に(now - 曜日)が今週の日曜日になる
    sunday.setDate(now.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);

    const workouts = getWorkoutsInRange(
      sunday.toISOString().split('T')[0],
      saturday.toISOString().split('T')[0]
    );

    const trainingDays = new Set(workouts.map(w => w.date || getTrainingDate(w.startTime)));
    let totalVolume = 0;
    workouts.forEach(w => { totalVolume += calcWorkoutVolume(w); });

    // 連続日数ストリーク
    let streak = 0;
    const check = new Date(now);
    // 今日トレーニングしてなければ昨日から
    const todayStr = getTrainingDate(Date.now());
    if (!trainingDays.has(todayStr)) {
      check.setDate(check.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const ds = check.toISOString().split('T')[0];
      const dayWorkouts = getWorkoutsByDate(ds);
      if (dayWorkouts.length > 0) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      trainingDays: trainingDays.size,
      totalVolume,
      streak,
      weekStart: monday,
      weekEnd: sunday,
    };
  }

  // エクスポート
  function exportAllData() {
    const data = {
      profile: getProfile(),
      exercises: getExercises(),
      personalRecords: getPersonalRecords(),
      templates: getTemplates(),
      workouts: {}
    };
    // 全workoutキーを走査
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('wt_workouts_')) {
        data.workouts[key] = _get(key);
      }
    }
    return data;
  }

  // インポート
  function importAllData(data) {
    if (data.profile) _set(KEYS.PROFILE, data.profile);
    if (data.exercises) _set(KEYS.EXERCISES, data.exercises);
    if (data.personalRecords) _set(KEYS.PERSONAL_RECORDS, data.personalRecords);
    if (data.templates) _set(KEYS.TEMPLATES, data.templates);
    if (data.workouts) {
      for (const [key, val] of Object.entries(data.workouts)) {
        _set(key, val);
      }
    }
  }

  // 全データ削除
  function clearAllData() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('wt_')) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (e) {
        console.error("Failed to remove key:", k, e);
      }
    });
  }

  return {
    KEYS, CATEGORIES, CATEGORY_COLORS, CATEGORY_NAMES, PRESET_EXERCISES,
    init, isFirstLaunch, markFirstLaunchDone,
    getProfile, saveProfile,
    getExercises, saveExercises, getExerciseById, addCustomExercise, deleteExercise, incrementUsageCount,
    getWorkouts, saveWorkout, deleteWorkout, getRecentWorkouts, getPreviousRecord, getAIRecommendation,
    getWorkoutsInRange, getWorkoutsByDate,
    getActiveWorkout, saveActiveWorkout, clearActiveWorkout,
    getTemplates, saveTemplates, saveTemplate, deleteTemplate,
    getPersonalRecords, savePersonalRecords, checkAndUpdatePRs,
    calcWorkoutVolume, calcCompletedSets, calcDuration, getWorkoutCategories,
    getWeeklySummary, getTrainingDate,
    exportAllData, importAllData, clearAllData,
  };
})();
