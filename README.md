# Iron Log - 筋トレ記録アプリ

筋トレガチ勢のためのワークアウト記録Webアプリ。  
Vanilla HTML/CSS/JavaScript で構築、LocalStorageでデータ保存、PWA対応。

## 機能

- 🏋️ ワークアウト記録（種目選択、セット入力、自動保存）
- ⏱️ 休憩タイマー（Date.now差分方式で正確）
- 📊 統計グラフ（推定1RM、最大重量、ボリューム推移、部位バランス）
- 🏆 PR（自己ベスト）自動検出＆パーティクル演出
- 📅 履歴（リスト/カレンダービュー）
- 💾 データエクスポート/インポート（JSON）
- 📱 PWA対応（オフライン動作、ホーム画面追加可能）

## 使い方

ブラウザで開くだけ！バックエンド不要。

## 技術スタック

- HTML / CSS / JavaScript（フレームワーク不使用）
- Chart.js（CDN）
- LocalStorage
- Service Worker
