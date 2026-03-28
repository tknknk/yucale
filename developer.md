# 開発者ガイド

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | Next.js 14 (React), TypeScript, Tailwind CSS |
| バックエンド | Spring Boot 3.2 (Java 21) |
| データベース | PostgreSQL 15 |
| 認証 | セッションCookie (Spring Session JDBC) |
| インフラ | AWS (EC2, CloudFront, S3) |
| CI/CD | GitHub Actions |
| コンテナ | Docker, Docker Compose |

## プロジェクト構成

```
yucale/
├── .github/workflows/ # GitHub Actions (CI/CD)
├── frontend/          # Next.js フロントエンド
├── backend/           # Spring Boot バックエンド
├── db/                # データベース初期化スクリプト
├── aws/               # AWS Terraform & デプロイスクリプト
├── docker-compose.yml      # 開発環境
├── docker-compose.prod.yml # 本番環境 (EC2)
└── docker-compose.test.yml # テスト環境
```

## ローカル開発環境のセットアップ

### 前提条件

- Docker & Docker Compose
- Node.js 20+ (フロントエンド単体開発時)
- Java 21+ (バックエンド単体開発時)

### 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを編集:
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
```

### 起動

```bash
# 全サービスを起動
docker-compose up --build

# バックグラウンドで起動
docker-compose up -d --build
```

### アクセス

| サービス | URL |
|---------|-----|
| フロントエンド | http://localhost:3000 |
| バックエンドAPI | http://localhost:8080/api |
| ICSファイル | http://localhost:8080/calendar.ics |

### 停止

```bash
docker-compose down

# データも削除する場合
docker-compose down -v
```

## API エンドポイント

### 認証

| メソッド | エンドポイント | 説明 | 認証 |
|---------|---------------|------|------|
| POST | `/api/auth/register` | ユーザー登録 | 不要 |
| POST | `/api/auth/login` | ログイン | 不要 |
| POST | `/api/auth/logout` | ログアウト | 必要 |
| GET | `/api/auth/me` | 現在のユーザー取得 | 必要 |
| POST | `/api/auth/request-role` | 権限リクエスト | 必要 |
| POST | `/api/auth/refresh` | セッション更新 | 必要 |
| GET | `/api/auth/csrf` | CSRFトークン取得 | 不要 |
| PUT | `/api/auth/username` | ユーザー名更新 | 必要 |

### スケジュール

| メソッド | エンドポイント | 説明 | 認証 |
|---------|---------------|------|------|
| GET | `/api/schedules` | スケジュール一覧 | 不要 |
| GET | `/api/schedules/{id}` | スケジュール詳細 | 不要 |
| POST | `/api/schedules` | スケジュール作成 | EDITOR以上 |
| PUT | `/api/schedules/{id}` | スケジュール更新 | EDITOR以上 |
| DELETE | `/api/schedules/{id}` | スケジュール削除 | EDITOR以上 |
| GET | `/api/schedules/upcoming` | 直近のスケジュール | 不要 |
| GET | `/api/schedules/range` | 期間指定取得 | 不要 |
| GET | `/api/schedules/split` | 過去/未来で分割取得 | 不要 |

### ICS

| メソッド | エンドポイント | 説明 | 認証 |
|---------|---------------|------|------|
| GET | `/calendar.ics` | ICSファイル取得 | 不要 |

### 管理

| メソッド | エンドポイント | 説明 | 認証 |
|---------|---------------|------|------|
| GET | `/api/admin/requests` | 権限リクエスト一覧（保留中） | ADMIN |
| GET | `/api/admin/requests/all` | 権限リクエスト一覧（全件） | ADMIN |
| PUT | `/api/admin/requests/{id}/approve` | リクエスト承認 | ADMIN |
| PUT | `/api/admin/requests/{id}/reject` | リクエスト拒否 | ADMIN |
| GET | `/api/admin/users` | ユーザー一覧 | ADMIN |
| DELETE | `/api/admin/users/{id}` | ユーザー削除 | ADMIN |

### お知らせ

| メソッド | エンドポイント | 説明 | 認証 |
|---------|---------------|------|------|
| GET | `/api/notices/latest` | 最新3件のお知らせ | VIEWER以上 |
| GET | `/api/notices` | お知らせ一覧（ページネーション） | VIEWER以上 |
| GET | `/api/notices/{id}` | お知らせ詳細 | VIEWER以上 |
| POST | `/api/notices` | お知らせ作成 | EDITOR以上 |
| PUT | `/api/notices/{id}` | お知らせ更新 | EDITOR以上 |
| DELETE | `/api/notices/{id}` | お知らせ削除 | EDITOR以上 |

### 出欠調査

| メソッド | エンドポイント | 説明 | 認証 |
|---------|---------------|------|------|
| GET | `/api/surveys/defaults` | デフォルト設定取得 | 不要 |
| GET | `/api/surveys/schedule-ids-with-surveys` | 出欠調査紐付け済みスケジュールID一覧 | EDITOR以上 |
| GET | `/api/surveys` | 出欠調査一覧 | 必要 |
| GET | `/api/surveys/{urlId}` | 出欠調査取得 | 不要 |
| GET | `/api/surveys/{urlId}/results` | 結果付き出欠調査取得 | EDITOR以上 |
| GET | `/api/surveys/{urlId}/my-responses` | 自分の回答取得 | 必要 |
| POST | `/api/surveys` | 出欠調査作成 | EDITOR以上 |
| PUT | `/api/surveys/{id}` | 出欠調査更新 | EDITOR以上 |
| DELETE | `/api/surveys/{id}` | 出欠調査削除 | EDITOR以上 |
| POST | `/api/surveys/{urlId}/responses` | 回答送信 | 不要 |
| DELETE | `/api/surveys/responses/{responseId}` | 回答削除 | EDITOR以上 |
| DELETE | `/api/surveys/{urlId}/responses/{userName}` | ユーザー回答一括削除 | EDITOR以上 |

### ヘルスチェック

| メソッド | エンドポイント | 説明 | 認証 |
|---------|---------------|------|------|
| GET | `/api/health` | ヘルスチェック | 不要 |

## テスト

### コンテナ内でテスト実行

```bash
# バックエンドテスト
docker-compose -f docker-compose.test.yml run --rm backend-test

# フロントエンドテスト
docker-compose -f docker-compose.test.yml run --rm frontend-test
```

### ローカルでテスト実行

```bash
# バックエンド
cd backend
./mvnw test

# フロントエンド
cd frontend
npm test
```

## CI/CD

### GitHub Actions

`main` ブランチへの push 時に自動実行:

| ワークフロー | トリガー | 処理 |
|-------------|---------|------|
| `build-and-push.yml` | `backend/` or `frontend/` 変更時 | ARM64 Docker イメージをビルドし ghcr.io にプッシュ |

### Docker イメージ

| イメージ | レジストリ |
|---------|-----------|
| Backend | `ghcr.io/tknknk/yucale/backend:latest` |
| Frontend | `ghcr.io/tknknk/yucale/frontend:latest` |

## デプロイ (AWS)

### 前提条件

- AWS CLI 設定済み
- Terraform インストール済み

### デプロイ手順

```bash
cd aws/terraform

# Terraform 変数設定
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集

# インフラ構築
terraform init
terraform plan
terraform apply

# EC2 にアプリケーションをデプロイ
INSTANCE_ID=$(terraform output -raw ec2_instance_id)
aws ssm start-session --target $INSTANCE_ID

# EC2 内で実行
cd /opt/yucale
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

詳細は [aws/README.md](aws/README.md) を参照してください。

## 環境変数

### バックエンド

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `SPRING_DATASOURCE_URL` | データベースURL | jdbc:postgresql://db:5432/yucale |
| `SPRING_DATASOURCE_USERNAME` | DBユーザー名 | postgres |
| `SPRING_DATASOURCE_PASSWORD` | DBパスワード | postgres |
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL | - |
| `ADMIN_EMAIL` | 管理者メールアドレス | - |
| `DEFAULT_BELONGING_LIST` | 出欠調査の所属リスト | S,A,T,B |
| `DEFAULT_RESPONSE_OPTIONS` | 出欠調査の回答選択肢 | 出席,欠席,未定 |

### フロントエンド

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `NEXT_PUBLIC_API_URL` | バックエンドAPI URL | http://localhost:8080/api |
| `NEXT_PUBLIC_ICS_FILENAME` | ICSファイル名 | - |
| `NEXT_PUBLIC_DEFAULT_START_TIME` | デフォルト開始時刻 (HH:mm) | - |
| `NEXT_PUBLIC_DEFAULT_END_TIME` | デフォルト終了時刻 (HH:mm) | - |
