# dog-sns-prototype

店舗分散型SNS自動投稿システムのプロトタイプです。

友人が経営する飲食店向けに、店頭のiPadで「今日のわんちゃん」写真を撮影、加工、印刷し、SNS掲載OKをもらった完成画像だけをクラウドへ保存する仕組みを作っています。

このプロジェクトは、ある程度使える形になったら店舗側または運用主体へ引き渡す前提です。そのため、特定のPCやDropboxに依存せず、GitHub、Codespaces、Vercel、Supabaseを見れば次の人が続けられる状態を重視します。

## 正本

- ソースコードと文書: GitHub `main`
- 作業環境: GitHub Codespaces
- 公開、デプロイ、ビルド結果の確認: Vercel
- DB、Storage、Auth、店舗設定、担当者、枠、完成画像: Supabase
- ローカルPC、Dropbox、手元コピー: 正本ではありません

## 環境の役割

- GitHub: コード、文書、migration、作業履歴を残す場所。
- Codespaces: 実装、ビルド確認、コミット、pushを行う場所。
- Vercel: 公開URL、デプロイ成否、実画面を確認する場所。
- Supabase: DB、Storage、Auth、店舗設定、担当者、枠、完成画像を管理する場所。
- Claude Code: 自身のツールで直接ファイルを編集し、コミット・pushまで行う役。

GitHubへ反映済みでも、VercelデプロイやSupabase適用がまだの場合があります。作業報告では、GitHub反映、Codespacesビルド、Vercelデプロイ、Vercel実画面確認、Supabase適用、iPad実機確認を分けて扱います。

## 最初に読むもの

- 新しいClaude Codeスレッドの入口: `docs/START_HERE.md`
- ドキュメント索引: `docs/DOC_INDEX.md`
- 最上位原則: `docs/project-principles.md`
- 設計・仕様の正本: `dog_sns_design.md`

次のClaude Codeスレッドで再開するときは、`docs/next-thread-start.md` の短い指示文を最初に貼ります。

## 現在できていること

- 店舗コード + PINで店舗ログインできる
- Supabaseから店舗情報、担当者一覧、写真枠を取得できる
- iPad Safariで最大3枚まで撮影できる
- 撮影画像を長辺2400pxまでに軽量化し、クラウドへ送らず一時保持できる
- 3枚から1枚を選び、撮影担当者を選択できる
- 写真を移動、拡大縮小、回転できる
- 必要な場所だけ手動モザイクできる
- 写真上へ短い文字ボックスを追加、編集、削除できる
- 正方形の完成画像を生成し、ブラウザ標準の印刷画面を開ける
- SNS掲載OKをもらった正方形完成画像をSupabase StorageとDBへ保存できる
- 本部用 `/admin` で保存済み写真を一覧確認、複数選択、順番確認できる
- 本部用 `/admin` で保存済み写真の一言メモと確認状態を更新し、非表示/復帰、または完全削除できる
- 本部用 `/admin` の「店舗」タブで店舗マスタと担当者マスタを、「枠」タブで写真枠（最大3枚、サムネイル管理）を管理できる

詳しい仕様は `dog_sns_design.md` を確認します。

## 当面の優先事項

1. 店舗側の撮影、編集、印刷、同意後保存の流れのiPad実機確認
2. 正方形枠と正方形完成画像の見え方、保存、管理画面表示の安定確認
3. `/admin` 写真タブ、店舗タブ（担当者管理を含む）、枠タブの安定確認
4. 残っているロゴ管理を削除または非表示にするか判断
5. SNS投稿素材や外部連携の扱いを改めて検討

SNS投稿、自動投稿、投稿本文生成、Instagram連携はまだ実装しません。

## Vercel設定

VercelでこのGitHubリポジトリをImportします。

- Framework Preset: Next.js
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: Next.js default

必要な環境変数は `supabase/README.md` と `docs/supabase-handoff.md` を確認します。

## 重要ドキュメント

詳しい分類は `docs/DOC_INDEX.md` を正とします。

- `docs/START_HERE.md`: Claude Codeが最初に読む入口
- `docs/DOC_INDEX.md`: ドキュメント索引
- `docs/project-principles.md`: 最上位原則
- `dog_sns_design.md`: 設計・仕様の正本
- `docs/ownership-handoff.md`: 所有権・運用引き渡しメモ
- `docs/production-readiness-checklist.md`: デモ前・本番前チェックリスト
- `docs/supabase-handoff.md`: Supabase引き継ぎメモ
- `supabase/README.md`: Supabaseセットアップ手順
- `supabase/schema.sql`: Supabaseテーブル設計
