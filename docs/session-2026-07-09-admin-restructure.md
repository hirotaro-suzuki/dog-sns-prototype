# 2026-07-08〜09 Admin改修（枠管理刷新・店舗/担当者統合・完全削除・iPad不具合修正）

最終更新: 2026-07-09

この文書は、`/admin` 本部メンテナンス画面の大幅な作り直しと、iPad実機で見つかった不具合修正の作業ログです。当日夜にレストランチェーンの社長へデモ予定であるため、見た目の一貫性にも配慮して直しています。

GitHub `main` を正本とする。ローカルPC、Dropbox、手元フォルダ、複製リポジトリを正本にしない。

## この作業のきっかけ

Codexとの協業で店舗ごとの本格的な枠デザインを作り、実際にAdmin画面で何度も枠の追加・入れ替えを試したところ、既存の枠管理UIが「何が標準枠か分からない」「登録と一覧の使い分けが不明」など、実運用に耐えないほど分かりにくいことが判明した。これをきっかけに、Admin画面全体（枠・店舗・担当者・写真）の使い勝手を一通り見直した。

## 1. 枠管理画面のサムネイル化（2026-07-08）

### 合意した方針

- 店舗を選ぶと、その店舗の枠サムネイルを最大3枚まで表示する。3枚未満は白紙スロット。
- サムネイルをドラッグして並び替え。一番左が標準枠（`is_default`）になる。
- 白紙スロットを掴む/クリックすると新規追加、既存サムネイルをクリックすると差し替え・日付位置編集。
- 枠に名前は不要（内部的にサーバー側で `frame-${Date.now()}` のようなコードを自動生成）。
- 「無効化」ではなく直接削除（枠は写真に合成済みで保存されるため、履歴として枠自体を残す必要がない）。

### 実装

- `src/lib/frameLimits.ts`: `MAX_FRAMES_PER_STORE = 3`
- `src/app/api/admin/frames/route.ts`、`.../frames/[id]/route.ts`: `is_active` を廃止し、`frame_name` をサーバー自動生成に変更
- `src/app/api/admin/frames/reorder/route.ts`（新規）: 並び替え時に `sort_order` を再採番し、先頭を `is_default` にする
- `src/components/AdminMaintenance.tsx` の `AdminFrameMaintenance`: 3枠サムネイルグリッド、HTML5ネイティブdrag-and-drop、日付位置をポインタドラッグ+矢印ボタンで編集するモーダル
- 旧ページ削除: `/admin/frames`（`AdminFrameRegister.tsx`）、`/admin/frame-cleanup`（`AdminFrameCleanup.tsx`）
- migration: `supabase/migrations/20260708_store_frame_slots.sql`（`store_frames.is_active` 列を削除）→ **ユーザーがSupabase SQL Editorで適用済み、列構成を確認済み**

## 2. 店舗/担当者タブ統合・役割属性の廃止・写真の完全削除（2026-07-09）

### 合意した方針

- 担当者は必ず1店舗に紐づき、担当者自身がログインするわけでもないため、「担当者」タブを独立させる意味が薄い。店舗タブへ統合する。
- 担当者の `role_label`（役割）・`can_approve_sns`（SNS承認可）は、店舗側の撮影・保存処理のどこにも参照されておらず実質何も制御していなかったため廃止する。
- 承認済み（SNS掲載同意済み）の写真でも、顧客からの申し入れがあれば完全に削除できる必要がある。「非表示にする」（archive）だけでなく、Storage画像とDBレコードを両方消す完全削除機能を追加する。

### 実装

- `src/components/AdminMaintenance.tsx`: 「担当者」タブを廃止し、「店舗」タブの編集パネル内に担当者管理を統合
- `role_label`/`can_approve_sns` を全レイヤーから削除: `AdminMaintenance.tsx`、`src/app/api/admin/staff/route.ts`、`.../staff/[id]/route.ts`、`src/app/api/store-login/route.ts`、`src/types/storeSession.ts`、`src/types/captureContext.ts`、`src/lib/supabase/types.ts`、`supabase/schema.sql`
- migration: `supabase/migrations/20260708_drop_staff_role_fields.sql`（`staff_members.role_label`/`can_approve_sns` 列を削除）→ **ユーザーがSupabase SQL Editorで適用済み、列構成（9列）を確認済み**
- `src/app/api/admin/assets/[id]/route.ts`: 新規 `DELETE` ハンドラ。Storage画像削除→DBレコード削除の順に実行
- `AdminMaintenance.tsx` 写真詳細画面: 「完全に削除する」ボタンを追加（`window.confirm` による確認あり、非表示中/表示中どちらでも使える）

## 3. 店舗タブのツリー表示化（2026-07-09）

店舗選択チップが横並びのまま店名・コード・状態を詰め込んでいたため、店名が文字単位で折り返され縦に間延びする不具合があった。あわせて、右側の担当者一覧が店舗編集パネルと重複して縦に長くなっていた。

### 実装

- 店舗チップを3行表示（店名／店舗コード／状態）にし、横幅が狭くても店名が折り返さないようにした
- 各店舗チップの下に、その店舗の担当者チップ＋「＋追加」チップを配置（`admin-staff-chip-row`）
- 担当者チップをクリックすると右側にその担当者の編集フォームが直接表示され、「＋追加」で新規追加フォームが表示される（`isCreatingStaff` state で切り替え）
- 担当者チップ選択時は、親の店舗チップも合わせて選択中表示にする（ユーザー確認済みの方針）
- 右側の担当者一覧（重複表示だった部分）を廃止し、店舗編集｜担当者編集の2カラムに整理
- 担当者コード入力欄はUIから完全に削除し、「担当者名」1項目に統一（`staff_code` は枠の `frame_name` と同じくサーバー側自動生成）

## 4. iPad実機不具合修正（2026-07-09）

iPad実機での「撮影→確認→編集」フローチェックで2件の不具合を発見。

### 4-1. 撮影・確認・完成確認画面でのページ全体ピンチズーム

編集画面（`MosaicCanvas` の `.canvas-frame`）には `touch-action: none` が設定されており、ブラウザ標準のピンチズームを止めて独自の写真拡大縮小処理に置き換えている。撮影画面・確認画面・完成確認画面には同じ指定がなく、ピンチするとブラウザ標準のページ全体ズームがそのまま働いてしまっていた。

対応: `.camera-stage`、`.photo-preview-image-wrap`、`.final-image-wrap` に `touch-action: none` を追加し、ページ全体がズームされるのを止めた。この3画面には編集画面のような「指で写真を拡大縮小する」機能はまだ無いため、ピンチしても写真自体は動かない（何も起きない）状態になる。ユーザーはこの挙動で合意済み。

### 4-2. 完成確認画面の白い枠

`.final-image-wrap` が背景色・境界線・影付きの箱として `flex: 1` で伸び、中の正方形画像を `width:100%; height:100%; object-fit:contain` で表示していたため、箱と画像の縦横比が合わない分だけ箱の背景色（クリーム色）が上下の余白として見えていた。

対応: 確認画面のプレビュー写真（`.photo-preview-image-wrap`）と同じ方式に統一。箱自体は透明な中央寄せコンテナにし、境界線・影は画像そのもの（`<img>` に `max-width/max-height: 100%`）に付けるようにした。印刷用スタイル（`.print-final-image`）にも `border`/`box-shadow` のリセットを追加し、印刷出力に余計な枠線が出ないようにした。

## 反映確認

- GitHub main: 上記すべて反映済み（コミット: `570dfdc`, `de338cd`, `0d4273b`, `325ff7e`）
- Codespacesビルド: 各コミットで `npm run build` 成功（型エラー・新規lintエラーなし）
- Supabase: `20260708_store_frame_slots.sql`、`20260708_drop_staff_role_fields.sql` ともにユーザーがSQL Editorで適用し、列構成を確認済み
- iPad Safari実機: 4-1・4-2のピンチ/白枠修正はユーザー確認済み（「動きは確認した」）
- Vercel: 本セッション終了時点で最新コミットのデプロイ完了を未確認（ユーザーが後ほど確認予定）
- 未確認: 3.の店舗タブツリー表示（担当者チップの直接編集含む）は、まだユーザーによる実画面確認をしていない

## 次に確認すること

- Vercelの最新デプロイが `success` であることの確認
- 店舗タブのツリー表示・担当者チップの追加/編集/削除導線の実画面確認
- 今夜のレストランチェーン社長へのデモ結果

## デモ後の予定（合意済み）

デモの反応を見て「機能としてはほぼこれで良い」となった段階で、コードの整理（掃除）セッションを一度挟む。試行錯誤で継ぎ足してきた結果、`AdminMaintenance.tsx`（約1800行）や `globals.css`（約1500行）が肥大化しており、未使用コード・CSSの洗い出しやファイル分割の検討が候補。機能追加ではなく、挙動を変えない整理として別作業にする。
