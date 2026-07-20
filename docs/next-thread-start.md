# 次のClaude Codeスレッド開始時の指示文

次のClaude Codeスレッドを始めるときは、最初に以下をそのまま貼る。

```text
作業対象は hirotaro-suzuki/dog-sns-prototype の main です。
作業環境は、ユーザーが開いているGitHub Codespacesの `/workspaces/dog-sns-prototype` を正として扱ってください。
Claude Codeは、自身のツールを用いて直接ファイルを編集し、コミット・pushなどのGit操作を行ってください。
実装、ビルド、コミット、pushはClaude Code自身がCodespacesターミナルで行います。
公開、デプロイ、ビルド結果の確認はVercelを正として扱ってください（本番URL: https://dog-sns-prototype.vercel.app ）。
DB、Storage、Auth、店舗設定、担当者、枠、完成画像はSupabaseを正として扱ってください。
ローカルPC、Dropbox、手元コピーは参照しないでください。
リポジトリ検索に頼らず、まず docs/START_HERE.md と docs/DOC_INDEX.md を直接取得して読んでください。
まだファイル変更はしないでください。

現在の状況（2026-07-20時点）:
- 引き継ぎ資料一式 docs/handoff/ 01〜07 が完成（全てユーザー確認済み・push済み）。
  読み手は3者: オーナー（契約と持ち主）、店舗の若者（技術担当。AIでのバイブコーディング経験あり）、
  店舗/本部の運用担当者。引き継ぎの順番（理解→練習→共有→本番切替→移管→手離れ）は handoff/06 に記載。
  オーナーの有料契約（Vercel Pro / Supabase Pro）はまだ結ばれていない。契約後に移管する順序。
- 2026-07-20に文書全体の突き合わせチェックを実施し、handoff側の誤り3件（/adminの店舗追加・PIN編集は
  不可、枠は透明PNG/SVGのみ、確認状態の語）と、既存文書の古い記述（dog_sns_design §7の文字仕様、
  優先事項、索引）を修正済み。名称は「SNS自動投稿システム」→「SNS投稿支援システム」へ全文書で言い換え済み。
- docs/ownership-handoff.md（技術正本）と handoff/06（平易版）は相互参照済み。
  食い違ったら ownership-handoff.md を先に直してから平易版を合わせる。
- DB定義・Supabase実環境は変更していない。migrationの適用状況は docs/supabase-handoff.md が正。
- 保留2件（枠操作のトランザクション化 #16、final-imagesの公開範囲 #18）とAdmin PIN強化は
  「引き渡し後の課題」として handoff/07 と handoff/06 に明示済み。

次にやる候補（ユーザーと相談して選ぶ）:
1. 印刷用の清書版づくり: handoff資料をきれいなHTML→PDFに一括変換する（Markdownを元に生成し、
   二重管理しない。資料2のASCII図は本物の図に描き直す）。合意済みの残工程。
2. /admin 各タブの実画面確認（2026-07-19の分割後は未確認）＋ handoff/04 マニュアルとの突き合わせ
   （確認状態の画面表記、絞り込み項目、店舗編集の項目名が実画面と合っているか）。
3. 写真完全削除の正常系確認（不要なテスト写真1枚で）、枠アップロード寸法チェックの実画面確認。
4. Supabase上のデモ店舗（DEMO_STORE）の有無確認と削除 → public/store-frames/ の未参照SVG整理。
5. 本番切替の準備（production-readiness-checklist.md に沿って、技術担当の若者と一緒にやる想定）。

進め方のルール:
- ユーザーのアイデア・質問には、まず意見や懸念を言葉で返す。「どう思う？」と言われたターンでは
  意見だけを返し、実装や選択肢ダイアログに進まない。やるかどうかはユーザーが決める。
- 成果物（文書・実装）は、書き上げたらまずユーザーに見せ、OKをもらってからコミット・pushする
  （2026-07-20の指摘。こまめコミットよりユーザー確認を優先）。
- 作業が一区切りしたら、スレッドを閉じる前に docs/next-thread-start.md を毎回更新する。
```

このファイルは、ユーザーが次スレッドの最初に貼るための開始指示を置く場所です。
作業が一区切りするたびに、Claude Codeがこのファイルを最新の状況へ更新する。

詳しい開始ルールは `docs/START_HERE.md`、読む文書の分類は `docs/DOC_INDEX.md` を正とします。
