# dog-sns-prototype

店舗分散型SNS自動投稿システムのフェーズ0プロトタイプです。

## 方針

- ローカルWindows環境では `npm install` しない
- GitHub上のソースをVercelへImportし、クラウド上でビルドする
- フェーズ0ではSupabaseや外部DBへ送信しない
- 撮影データはブラウザメモリ上のBlob/Object URLだけで一時保持する

## フェーズ0で確認すること

1. ブラウザでカメラを起動できる
2. 最大3枚まで撮影できる
3. 撮影画像をクラウドに送らず一時保持できる
4. カウント表示ができる
5. やり直し・キャンセルで一時データを破棄できる

## Vercel設定

VercelでこのGitHubリポジトリをImportしてください。

- Framework Preset: Next.js
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: Next.js default

`postinstall` で `face-api.js` の tiny face detector モデルを `public/models` に取得します。取得に失敗してもビルド自体は止めない設計です。

## 重要ドキュメント

詳しい開発方針は `dog_sns_design.md` を参照してください。
