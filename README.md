# Kanban Task Manager

認証、ボード・リスト・カードの CRUD、ドラッグ&ドロップによるカード移動、並び順の永続化を備えたカンバン型タスク管理アプリです。

Supabase の環境変数を設定すると Supabase Auth + Postgres で動作します。環境変数がない場合は、ポートフォリオ掲載や動作確認向けに `localStorage` を使うデモモードで動作します。

## 主な機能

- Supabase Auth によるメールアドレス・パスワード認証
- Supabase 未設定でも動くデモモード
- ユーザーごとの複数ボード作成・削除
- リスト/カラムの追加・リネーム・削除
- カードの追加・編集・削除
- カードのタイトル、説明、期限、ラベル管理
- `@dnd-kit` による列間ドラッグ&ドロップ
- `position` カラムによる並び順の永続化
- RLS によるユーザー単位のデータ分離

## 技術スタック

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- Supabase Auth / Postgres
- dnd-kit
- lucide-react

## ローカル起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

Supabase の環境変数を設定していない場合、アプリはデモモードで起動します。デモモードではブラウザの `localStorage` にデータを保存するため、新規登録、ボード作成、カード追加、ドラッグ&ドロップ、リロード後の保持まで確認できます。

## Supabase セットアップ

1. Supabase プロジェクトを作成します。
2. Supabase SQL Editor で `supabase/schema.sql` を実行します。
3. `.env.example` を `.env.local` にコピーします。
4. 次の環境変数を設定します。

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. 開発サーバーを再起動します。

## データベース構成

```text
auth.users
  └─ boards.user_id
       └─ lists.board_id
            └─ cards.list_id
```

`boards`、`lists`、`cards` はすべて RLS を有効化しています。

- `boards.user_id` でボード所有者を管理
- `lists` は親ボード経由で所有者を判定
- `cards` は親リスト、さらに親ボード経由で所有者を判定
- `lists.position` と `cards.position` で表示順を管理

## デプロイ

Vercel などの Next.js 対応ホスティングにデプロイできます。

実運用で Supabase を使う場合は、ホスティング側の環境変数に次の 2 つを設定してください。

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

ポートフォリオ用のデモとして公開するだけであれば、Supabase 未設定のままでも動作します。その場合、データは閲覧者のブラウザ内に保存されます。

## 主要ファイル

- `src/components/KanbanApp.tsx`: アプリ本体、認証、CRUD、D&D、永続化処理
- `src/lib/demo-data.ts`: デモ用初期データ
- `src/lib/supabase.ts`: Supabase クライアント設定
- `supabase/schema.sql`: テーブル定義、インデックス、RLS ポリシー
