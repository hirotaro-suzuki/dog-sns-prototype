# ドキュメント索引

最終更新: 2026-07-07

この索引は、Claude Codeが毎回すべての文書を読んでコンテキストを消費しすぎないようにするための地図です。

## 入口

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

- `docs/session-2026-07-06-square-canvas.md`
  - 正方形キャンバス化、正方形枠座標、Supabase migrationの作業ログ。

- `docs/session-2026-07-05-store-flow-check.md`
  - 店舗側iPadフロー最終チェック。

- `docs/session-2026-07-04-admin-handoff.md`
  - 管理画面ブラッシュアップ記録。
  - `/admin` 本部メンテナンス画面に触るときに重要。

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
