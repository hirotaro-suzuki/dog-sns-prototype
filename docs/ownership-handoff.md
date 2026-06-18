# 運用引き渡しメモ

このプロジェクトは、最終的に店舗または運用主体へ引き渡す前提で管理する。

## 基本方針

- GitHub、Vercel、Supabaseは、後から店舗側の管理アカウントへ移管しやすい構成にする。
- 個人アカウントにしか存在しない設定、環境変数、APIキー、画像ファイルを作らない。
- 本番環境の値はコードに書かず、VercelとSupabaseの管理画面で差し替えられるようにする。
- 引き渡し前に、所有者、請求、管理者、環境変数、バックアップ、緊急連絡先を一覧化する。

## GitHub

- ソースコードの正はGitHubの `main` とする。
- 店舗側へ引き渡す場合は、リポジトリの所有権移管または店舗側Organizationへの移動を検討する。
- 移管前に、管理者権限を持つユーザーと不要な外部アクセスを確認する。

## Vercel

- VercelはGitHubリポジトリから自動デプロイする。
- 本番プロジェクトは、可能であれば店舗側または運用主体のVercel Team配下へ移す。
- VercelのEnvironment Variablesに設定する値は `.env.example` と対応させる。
- 引き渡し時には、Production、Preview、Developmentの環境変数差分を確認する。

## Supabase

- DB、Storage、Auth、店舗設定、完成画像はSupabaseに集約する。
- Supabaseプロジェクトは、可能であれば店舗側または運用主体のOrganization配下へ移す。
- Service Role Keyはサーバー側だけで使い、ブラウザへ絶対に出さない。
- anon keyはブラウザで使う前提だが、RLSでアクセス範囲を必ず制限する。
- 引き渡し前に、RLSポリシー、Storageバケット、Auth設定、バックアップ方針を確認する。

## 環境変数

現時点で想定する値は以下。

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`NEXT_PUBLIC_` で始まる値はブラウザに公開される。秘密にしたい値には使わない。

## 引き渡し前チェックリスト

- GitHubリポジトリの所有者と管理者を確認する
- Vercelプロジェクトの所有Team、請求、環境変数を確認する
- Supabaseプロジェクトの所有Organization、請求、APIキー、RLSを確認する
- `.env.example` と実際のVercel環境変数が対応しているか確認する
- 本番データのバックアップと削除対応の運用者を決める
- 店舗マスタ、担当者マスタ、ロゴ、枠画像の更新担当者を決める
- 緊急時にSNS保存やクラウド保存を止める手順を決める
