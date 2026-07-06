# START HERE for Codex

最終更新: 2026-07-06

このファイルは、新しいCodexスレッドで最初に読むための入口です。

目的は、毎回GitHub接続やドキュメント探索で時間を使いすぎないようにすることです。

## 最初に守ること

- 作業対象は GitHub `hirotaro-suzuki/dog-sns-prototype` の `main` です。
- ローカルPC、Dropbox、手元フォルダ、古い複製リポジトリは参照しません。
- GitHubの確認と更新は、まずGitHubコネクタを使います。
- GitHubコネクタで詰まった場合は、ローカルやDropboxへ逃げず、何ができて何ができないかをユーザーへ説明して止まります。
- 実装前に、目的、OK条件、確認方法、更新する文書を短く整理します。

## 次スレッドでユーザーが貼る短い指示

```text
GitHubコネクタだけを使ってください。
作業対象は hirotaro-suzuki/dog-sns-prototype の main です。
ローカル/Dropbox は参照しないでください。
まず docs/START_HERE.md と docs/DOC_INDEX.md だけを読んで、現在地を整理してください。
まだファイル変更はしないでください。
```

## 最初に読むファイル

通常は、まずこの2つだけで十分です。

1. `docs/START_HERE.md`
2. `docs/DOC_INDEX.md`

実装や設計判断に進む場合だけ、次を読みます。

3. `docs/project-principles.md`
4. `README.md`
5. `dog_sns_design.md`
6. `docs/next-thread-start.md`

Supabase、引き渡し、直近作業ログが必要な場合は、`docs/DOC_INDEX.md` の分類に従って必要なものだけ読みます。

## このプロジェクトの正本

- ソースコードと文書: GitHub `main`
- 実行、ビルド、公開確認: Vercel
- DB、Storage、Auth、店舗設定、担当者、枠、完成画像: Supabase
- ローカルPCとDropbox: 正本ではない

## 現在の作業姿勢

このプロジェクトは、74歳のユーザーが、将来人に渡して終われるように進めているプロトタイプです。

そのため、短期的な作業速度よりも、以下を優先します。

- クラウド上に正本を置く
- 次の人が読める文書を残す
- ユーザーのコピー＆ペーストや手作業を増やさない
- Vercel/Supabase/GitHubの接続や権限を壊さない
- 先走ってSNS自動投稿や外部連携を作らない

## 作業前チェック

作業に入る前に、Codexは以下を短く確認します。

- 今回の目的
- 何ができたらOKか
- GitHubで更新するファイル
- Vercelで確認すること
- Supabaseで確認または変更すること
- 更新すべき文書

## 作業後レポート

作業後は、次の見出しで短く報告します。

- 作業内容
- 確認済み
- 未確認
- 次に進む候補
- Codexからの気づき
- 更新した文書
- 更新しなかった文書
