### START HERE for Claude Code
最終更新: 2026-07-20

このファイルは、新しく起動したClaude Codeが最初に読む入口です。
目的は、毎回無駄なファイル探索を行ってトークン（コンテキスト）を消費しすぎないようにすることです。
ユーザーが次スレッド冒頭に貼る短い文は docs/next-thread-start.md を使います。
リポジトリ直下の CLAUDE.md には、このファイルの要点だけを自動読み込み用に要約してあります。開始文を貼り忘れた場合の保険なので、詳しい内容は必ずこちらを正とします。

#### 最初に守ること（Claude Code自身の行動ルール）
*  作業対象は GitHub hirotaro-suzuki/dog-sns-prototype の main です。
*  作業環境は、このリポジトリの GitHub Codespaces を正として扱います。
*  ローカルPC、Dropbox、手元フォルダ、古い複製リポジトリは参照しません。
*  **Claude Codeは、自身のツールを用いて直接対象ファイルを編集してください。**
*  **実装、ビルド（`npm run build`等での確認）、コミット（`git commit`）、push（`git push`）は、Claude Code自身がターミナルコマンドを実行して行います。**
*  **トークン節約のため、勝手にプロジェクト内のファイルを広範囲に探索・読み込みしないでください。必ず `docs/DOC_INDEX.md` を読み、そこにある「地図」に従って必要なファイルだけを読み込んでください。**
*  エラーで詰まった場合は、ローカルやDropboxへ逃げず、何ができて何ができないかをユーザーへ説明して止まります。
*  実装前に、目的、OK条件、確認方法、更新する文書を短く整理し、ユーザーの許可を得てから編集・実行します。

#### 最初に読むファイル
通常は、まずこの2つだけで十分です。
1. docs/START_HERE.md
2. docs/DOC_INDEX.md

実装や設計判断に進む場合だけ、次を読みます。
3. docs/project-principles.md
4. README.md
5. dog_sns_design.md

Supabase、引き渡し、直近作業ログが必要な場合は、docs/DOC_INDEX.md の分類に従って必要なものだけ読みます。
引き継ぎ相手へ渡す平易な資料一式は `docs/handoff/`（01〜07）にあります。

#### このプロジェクトの正本
*  ソースコードと文書: GitHub main
*  作業環境: GitHub Codespaces
*  公開、デプロイ、ビルド結果の確認: Vercel
*  DB、Storage、Auth、店舗設定、担当者、枠、完成画像: Supabase
*  ローカルPCとDropbox: 正本ではない

#### 環境ごとの役割
*  GitHub: ソースコード、文書、migration、作業履歴の正本。
*  Codespaces: 実装、ビルド確認、コミット、pushを行う作業場所（Claude Codeの動作環境）。
*  Vercel: 最新デプロイの成否と、公開URL上の実画面を確認する場所。
*  Supabase: DB、Storage、Auth、店舗設定、担当者、枠、完成画像を確認・変更する場所。

#### 実行と報告のルール
GitHubへ反映したこと、Codespacesでビルドが通ったこと、Vercelのデプロイが成功したこと、Vercel上で実操作できたこと、SupabaseへSQLや設定を適用したことは、それぞれ別物として扱います。
Supabase変更は、GitHubにSQLを置いただけなのか、実環境へ適用済みなのかを必ず分けて報告します。

#### 現在の作業姿勢
このプロジェクトは、74歳のユーザーが、将来人に渡して終われるように進めているプロトタイプです。
そのため、短期的な作業速度よりも、以下を優先します。
*  クラウド上に正本を置く
*  次の人が読める文書を残す
*  **ユーザーのコピー＆ペーストや手作業を極力減らし、Claude Codeが代行する**
*  Vercel/Supabase/GitHubの接続や権限を壊さない
*  先走ってSNS自動投稿や外部連携を作らない

#### 2026-07-10時点の完了状況
* CodespacesへCodex CLIを導入し、共通作業規則として `AGENTS.md` を追加済み。
* 店頭フローの最終保存で発生していた `store_frames.is_active` 参照エラーを修正し、本番保存を確認済み。
* `20260710_safe_store_deletion.sql` はSupabaseへ適用・確認済み。
* 店舗は「停止中かつ保存写真0件」の場合だけ削除可能。demo店舗で本番確認済み。
* `20260710_harden_database_functions.sql` は本番Supabaseへ適用・確認済み。対象2関数の `search_path=pg_catalog`、`anon`・`authenticated` の直接実行権限がfalse、Security AdvisorのWarnings 0件を確認済み。

#### 残作業
* 2026-07-13時点で、監査指摘の大半（文書統一、残骸削除、Storageエラー処理、店舗UI改善、後付け補修の全撤去、未使用CSS/client削除、160件上限の注記）は対応済み。
* 2026-07-13に、デモ枠の自動補充（4-3の#14）もユーザー判断で削除済み。Supabase上にデモ店舗（`DEMO_STORE`）が残っていればAdminから削除する（未確認）。
* 残っている検討項目は `docs/audit-2026-07-13.md` の「判断」欄が未決・保留の項目を正とする。

#### 作業前チェック
作業に入る前に、Claude Codeは以下を短く確認し、ユーザーに合意を取ります。
*  今回の目的
*  何ができたらOKか
*  GitHubで更新するファイル
*  Vercelで確認すること
*  Supabaseで確認または変更すること
*  更新すべき文書

#### 作業後レポート
作業後は、次の見出しで短く報告します。
*  作業内容
*  確認済み
*  未確認
*  次に進む候補
*  Claude Codeからの気づき
*  更新した文書
*  更新しなかった文書
