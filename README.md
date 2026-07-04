# dog-sns-prototype

店舗分散型SNS自動投稿システムのプロトタイプです。

このプロジェクトは、友人が経営する飲食店を支援し、ある程度使える形になったら店舗側または運用主体へ引き渡す前提で進めます。

そのため、単に機能を作るだけでなく、スレッドが変わっても、ユーザー本人が手を離れても、GitHub、Vercel、Supabaseを見れば次の人が続けられる状態を重視します。

## 最上位原則

このプロジェクトの判断に迷った場合は、まず `docs/project-principles.md` を確認します。

`docs/project-principles.md` は、スレッドが変わってもぶれないための最上位文書です。

主な原則:

- GitHub `main`、Vercel、Supabaseを正とする
- ローカルPCやDropboxを正本にしない
- 引き継ぎやすさを最優先する
- Codex一本で進め、ユーザーのコピー＆ペースト作業を減らす
- Codexは先走らず、実装前に目的とOK条件を確認する
- TDD、つまり確認条件を先に決める姿勢を基本にする
- 現場側、本部側、将来のSNS投稿機能を疎結合にする
- 店舗側iPad画面は軽く単純にする
- 作業区切りごとに文書と気づきを残す

## 最重要方針

このプロジェクトは、GitHub の `main` ブランチを最新版・正本として進めます。

- ソースコードはGitHubに集約
- 実行・ビルド・プレビューはVercel
- DB、Storage、Auth、店舗設定、完成画像はSupabase
- ローカルPC上の作業環境や複製リポジトリを前提にしない
- CodexはGitHubへ直接反映し、ユーザーはVercel URLをiPad Safariで確認する

## Codex新スレッド開始時の指示

次のCodexスレッドで作業を再開するときは、`docs/next-thread-start.md` の指示文を最初に貼る。

短く伝える場合は以下でもよい。

```text
hirotaro-suzuki/dog-sns-prototype の GitHub main が最新版です。まず docs/project-principles.md、README.md、dog_sns_design.md、docs/next-thread-start.md、docs/ownership-handoff.md、docs/session-2026-07-04-admin-handoff.md を GitHub 上で読んでください。GitHub/Vercel/Supabase を正として進めます。Codexは先走らず、実装前に目的、OK条件、確認方法、更新すべき文書を整理して止まってください。現在は飲食店オーナーへデモとして見せられるように /admin の本部メンテナンス画面を整える段階です。写真タブのDB/API/UI土台はGitHub mainへ反映済みで、Supabase migrationも適用済みです。写真タブは一覧画面と詳細画面に分離済みで、説明文欄は外し、一言メモ40文字に一本化しています。ユーザー確認で、写真一覧のチェックボックス動作と、開始日・終了日の不要な括弧表示が消えたことは確認済みです。SNS投稿、自動投稿、投稿本文生成、Instagram連携はまだ実装しないでください。
```

## 現在できていること

詳しい最新仕様は `dog_sns_design.md` と直近ログ `docs/session-2026-07-04-admin-handoff.md` を確認する。

現時点では、以下の流れが動作している。

1. 店舗コード + PINで店舗ログインできる
2. Supabaseから店舗情報と担当者一覧を取得できる
3. iPad Safariでカメラを起動できる
4. 最大3枚まで撮影できる
5. 撮影画像を長辺2400pxまでに軽量化し、クラウドへ送らず一時保持できる
6. 3枚から1枚を選べる
7. 写真選択後に担当者を選択できる
8. 写真をタッチで移動、拡大縮小、回転できる
9. 必要な場所だけ手動モザイクできる
10. 写真上へ短い文字ボックスを追加、選択、直接編集、水平化、削除できる
11. 文字ボックスは写真に連動して動く
12. 完成画像を生成できる
13. 完成画像確認から編集へ戻れる
14. 印刷ボタンでブラウザ標準の印刷画面を開ける
15. SNS掲載OKをもらった完成画像をSupabase StorageとDBへ保存できる
16. 本部用 `/admin` で保存済み写真を一覧確認、複数選択、順番確認できる
17. 本部用 `/admin` で保存済み写真の一言メモと確認状態を更新し、非表示/復帰できる
18. 本部用 `/admin` で店舗マスタ、担当者マスタ、枠を編集できる

## 2026-06-18 作業メモ

店舗ログインの最初の縦線を通した。

- Supabaseプロジェクト `Dog-sns-prototype` を作成
- Supabaseに `stores`、`staff_members`、`admin_users`、`assets`、`store_frames` を作成
- サンプル店舗 `DEMO / 0000` と担当者4名を投入
- Supabaseの `service_role` に必要なテーブル権限を付与
- VercelにSupabase接続用の環境変数を設定
- `/store/login` を作成
- 店舗コード + PINでSupabaseから店舗情報と担当者一覧を取得
- ログイン成功後、`/store` の店舗ホームへ遷移
- iPadで、ログインから撮影フロー遷移まで動作確認済み

## 当面の優先事項

現在は、新機能を先に増やすよりも、プロジェクトの原則、ドキュメント、枠・ロゴ方針、店舗側と本部側の基本動作を安定させる段階です。

当面の優先順:

1. `/admin` 写真タブの仕上げ確認を行う
2. 店舗側の撮影、編集、印刷、同意後保存の流れを安定確認する
3. 本部側の保存済み写真、店舗、担当者、枠管理を安定確認する
4. 残っているロゴ管理を削除または非表示にするか判断する
5. 枠・ロゴ方針に沿って、正式ロゴ入りL版フレームを作り直す
6. その後、SNS投稿素材や外部連携の扱いを改めて検討する

## SNS投稿機能について

Instagramなどへの投稿は、権限、アカウント管理、外部サービス連携が関わるため、このプロトタイプ内で先走って自動投稿機能を作らない。

当面は、店舗側で完成画像を作り、SNS掲載OKをもらった画像をSupabaseへ保存するところまでを中心にする。

保存済み画像を使った投稿文作成、投稿素材化、Instagram投稿支援は後続フェーズとし、必要に応じてManusなど別ツールの利用も含めて検討する。

## Vercel設定

VercelでこのGitHubリポジトリをImportしてください。

- Framework Preset: Next.js
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: Next.js default

## 重要ドキュメント

- 最上位原則: `docs/project-principles.md`
- 次スレッド開始時の指示文: `docs/next-thread-start.md`
- 現在の設計・開発方針の正本: `dog_sns_design.md`
- 所有権・運用引き渡しメモ: `docs/ownership-handoff.md`
- 2026-07-04管理画面ブラッシュアップ記録: `docs/session-2026-07-04-admin-handoff.md`
- 2026-07-04枠デザイン立て直し記録: `docs/session-2026-07-04-frame-reset.md`
- Supabase引き継ぎメモ: `docs/supabase-handoff.md`
- 2026-06-25作業ログ: `docs/session-2026-06-25.md`
- Supabaseセットアップ手順: `supabase/README.md`
- Supabaseテーブル設計: `supabase/schema.sql`
- Supabaseサンプルデータ: `supabase/seed.example.sql`
