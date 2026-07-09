# 次のClaude Codeスレッド開始時の指示文

次のClaude Codeスレッドで開発を再開するときは、最初に以下をそのまま貼る。

```text
作業対象は hirotaro-suzuki/dog-sns-prototype の main です。
作業環境は、ユーザーが開いているGitHub Codespacesの `/workspaces/dog-sns-prototype` を正として扱ってください。
Claude Codeは、自身のツールを用いて直接ファイルを編集し、コミット・pushなどのGit操作を行ってください。
実装、ビルド、コミット、pushはClaude Code自身がCodespacesターミナルで行います。
公開、デプロイ、ビルド結果の確認はVercelを正として扱ってください。
DB、Storage、Auth、店舗設定、担当者、枠、完成画像はSupabaseを正として扱ってください。
ローカルPC、Dropbox、手元コピーは参照しないでください。
リポジトリ検索に頼らず、まず docs/START_HERE.md と docs/DOC_INDEX.md を直接取得して読んでください。
まだファイル変更はしないでください。

現在の状況（2026-07-09時点）:
- 店舗側「入口→撮影→編集→完成確認」の一連の画面刷新は実装完了・iPad Safari確認済み。
  詳細は docs/session-2026-07-08-store-entrance-redesign.md、
  docs/session-2026-07-08-canvas-edit-redesign.md。
- Admin画面の大幅改修（枠管理のサムネイル化、店舗/担当者タブ統合、担当者の役割属性廃止、
  写真の完全削除機能、店舗タブのツリー表示化、iPad実機のピンチズーム/白枠不具合修正）が
  完了。詳細は **docs/session-2026-07-09-admin-restructure.md**（`/admin` に触るときは
  まずこれを読む）。
- 上記に伴うSupabase migrationは2件ともユーザーがSQL Editorで適用・確認済み
  （`20260708_store_frame_slots.sql`、`20260708_drop_staff_role_fields.sql`）。
- 「ユーザーのアイデア・軽い提案に対しても、すぐ実装に入らず意見を返してから合意して実装する」
  という運用ルールを CLAUDE.md と docs/project-principles.md に明文化済み。

次にやること（本題）:
2026-07-09の夜、レストランチェーンの社長へAdmin改修後の画面をデモ予定。その反応を見て
「機能面はほぼこれで良い」となったら、コードの整理（掃除）セッションを行う合意になっている
（`AdminMaintenance.tsx` 約1800行、`globals.css` 約1500行が肥大化しており、未使用コード・CSSの
洗い出しやファイル分割を検討）。機能追加ではなく、挙動を変えない整理として別作業にする。
デモ前提でなければ、ユーザーに次に何を進めるか確認してください。

作業中はキリの良い単位（1機能・1画面など）でこまめにコミット・pushしてください
（Codespacesが予告なく停止することがあるため）。ユーザーのアイデア・提案には、まず意見や
懸念点を言葉で返してから合意して実装してください（CLAUDE.md参照）。

未確認のまま残っている項目:
- 2026-07-09のAdmin改修一式について、Vercel本番デプロイでの確認（このスレッド終了時点で未確認）
- 店舗タブのツリー表示（担当者チップの追加/編集/削除導線）の実画面確認
- 印刷（127mm×89mm / 108mm×108mm いずれのテンプレートも）で完成画像が正しく出力されるか
- 今夜のレストランチェーン社長へのデモ結果
```

このファイルは、ユーザーが次スレッドの最初に貼るための開始指示を置く場所です。

詳しい開始ルールは `docs/START_HERE.md`、読む文書の分類は `docs/DOC_INDEX.md` を正とします。
