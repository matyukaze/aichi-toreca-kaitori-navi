# セットアップ手順

## ローカル起動
```bash
npm install
npm run dev
```
`http://localhost:3000` を開きます。

## Supabase接続
1. Supabaseで新規プロジェクト作成
2. `database/schema.sql` をSQL Editorで実行
3. `.env.local.example` を `.env.local` にコピー
4. Supabase URL / anon key / service role key を入力
5. `npm run dev` で再起動

環境変数が未設定の場合はモックデータで動きます。

## 次の実装
- Supabase Auth
- user_items のユーザー別保存
- X APIで @magiNagoya の投稿取得
- 添付画像OCR
- 管理者承認画面
- 価格有効期限の自動失効
- AdSense審査用の正式ポリシーページ
