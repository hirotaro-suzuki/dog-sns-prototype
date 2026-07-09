# ドキュメント索引

最終更新: 2026-07-09

この索引は、Claude Codeが毎回すべての文書を読んでコンテキストを消費しすぎないようにするための地図です。

## 入口

- `CLAUDE.md`（リポジトリ直下）
  - Claude Codeが起動時に自動で読み込む要約版。開始文の貼り忘れ対策。
  - 詳しい内容は `docs/START_HERE.md` を正とする。

- `docs/next-thread-start.md`
  - ユーザーが次スレッドの最初に貼る短いコピペ文。
  - 説明文書ではないため、Claude Codeが毎回深読みする必要はない。

- `docs/START_HERE.md`
  - 新しいClaude Codeスレッドで最初に読む入口。
  - ローカル/Dropboxを見ない、GitHub mainとCodespacesを正とし、Claude Codeが自身のツールで直接編集・Git操作を行う、という最短ルール。

- `docs/DOC_INDEX.md`
  - このファイル。
  - 必要な文書だけ読むための分類。

## 判断に迷ったら読む

- `docs/project-principles.md`
  - 最上位原則。
  - GitHub/Codespaces/Vercel/Supabaseを正とする、引き継ぎやすさを優先する、先走らない、などの判断基準。

- `dog_sns_design.md`
  - 基本設計書。
  - 画面仕様、DB設計、現在の開発方針の正本。

- `README.md`
  - 人間向けの全体案内。
  - 現在できていること、当面の優先事項、重要文書一覧。

## 引き渡し・運用方針で読む

- `docs/ownership-handoff.md`
  - 所有権、運用引き渡し、将来ユーザー本人が手を離す前提の方針。

- `docs/production-readiness-checklist.md`
  - 本番前に確認する項目。
  - デモや本番準備に近づいたら読む。

- `docs/frame-image-guide.md`
  - 店舗フレーム画像（枠）を新しく作る・外部依頼するときの技術仕様メモ。サイズ、透明の扱い、既存デザインの実測値、日付座標など。
  - 枠デザインを依頼・作成するときに読む。将来の引き継ぎドキュメントの土台候補。

## Supabase関連で読む

- `docs/supabase-handoff.md`
  - Supabaseの引き継ぎメモ。

- `supabase/README.md`
  - Supabaseセットアップ手順。

- `supabase/schema.sql`
  - Supabaseテーブル設計。

- `supabase/migrations/`
  - 追加SQL履歴。
  - DB変更を伴う作業では必ず確認する。

- `supabase/seed.example.sql`
  - サンプルデータ。

## 直近ログ

- `docs/session-2026-07-09-admin-restructure.md`
  - Admin画面の大幅改修ログ。枠管理のサムネイル化、店舗/担当者タブ統合、担当者の役割属性廃止、写真の完全削除機能、店舗タブのツリー表示化、iPad実機ピンチズーム/白枠不具合の修正まで。`/admin` に触るときはこれを最初に読む。

- `docs/session-2026-07-08-store-entrance-redesign.md`
  - 店舗側「ログイン→店舗ホーム→撮影」画面のデザイン刷新作業ログ。配色案、撮影画面のボタン整理・全画面プレビュー方針など。

- `docs/session-2026-07-08-canvas-edit-redesign.md`
  - 画像加工画面（編集中・完成画像確認）のデザイン刷新作業ログ。統一Undo、アイコン化、完成画像の表示方式、一言メモ欄、Admin写真一覧の位置ずれ修正まで含む。実機確認済み。

- `docs/session-2026-07-06-square-canvas.md`
  - 正方形キャンバス化、正方形枠座標、Supabase migrationの作業ログ。
  - 2026-07-07追記: 葡萄房の枠を実ロゴ入り正方形デザインへ差し替え、日付表示の回帰修正、Admin枠並び順・所属店舗表示・停止中フィルター追加。

- `docs/session-2026-07-05-store-flow-check.md`
  - 店舗側iPadフロー最終チェック。

- `docs/session-2026-07-04-admin-handoff.md`
  - 管理画面ブラッシュアップ記録（写真タブの複数選択・確認状態まわり）。
  - **古い**: タブ構成（担当者タブの独立、枠の有効/無効など）はその後の改修で変わっている。`/admin` の現状は `docs/session-2026-07-09-admin-restructure.md` を優先して読む。

- `docs/session-2026-07-04-frame-reset.md`
  - 枠デザイン立て直し記録。

- `docs/session-2026-06-25.md`
  - 2026-06-25作業ログ。
  - 古めのログなので、必要なときだけ読む。

## 古い作業ログ

通常は読まない。過去の経緯確認が必要なときだけ読む。

- `docs/session-2026-06-18.md`
  - 店舗ログイン、Supabase初期設定、Vercel環境変数の初期作業ログ。

- `docs/session-2026-06-19.md`
  - 2店舗デモデータ、店舗別DB値の画面反映確認ログ。

- `docs/session-2026-06-20.md`
  - 担当者選択、文字ボックス、印刷準備、撮影画像軽量化の作業ログ。

## 読みすぎ防止ルール

- まず `START_HERE` とこの索引だけ読む。
- 実装対象に関係する文書だけ追加で読む。
- 古い作業ログを全部読む必要はない。
- 矛盾がある場合は、`docs/project-principles.md` を最上位、次に `dog_sns_design.md`、次に直近ログの順で判断する。
- Codespacesターミナルで読めない場合は、ローカル/Dropboxへ逃げず、ユーザーへ状況を説明する。

## 今は読まなくてよいもの

以下は、必要になるまで読まない。

- 古い作業ログ全般
- まだ着手しないSNS自動投稿、Instagram連携、投稿本文生成に関する構想
- ローカル/Dropbox上の文書やファイル
- GitHub main以外の手元コピー

## 更新ルール

新しい文書を追加したら、この索引にも1行追加する。

古くなった文書を見つけたら、すぐ削除せず、まずこの索引で「古い」「必要時のみ」「統合候補」と分かるようにする。
