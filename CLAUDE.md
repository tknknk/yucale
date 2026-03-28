# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

共有カレンダーWebアプリケーション。Next.js 14フロントエンドとSpring Boot 3.2バックエンドで構成。ICS形式でのカレンダー配信をサポート。

## Development Commands

### Docker起動（推奨）
```bash
docker-compose up --build          # 全サービス起動
docker-compose up -d --build       # バックグラウンド起動
docker-compose down -v             # 停止+データ削除
```

### バックエンド (Java 21 / Spring Boot 3.2)
```bash
cd backend
./mvnw spring-boot:run             # 開発サーバー起動
./mvnw test                        # 全テスト実行
./mvnw test -Dtest=AuthServiceTest # 単一テストクラス
./mvnw test -Dtest=AuthServiceTest#testRegister  # 単一メソッド
./mvnw clean package -DskipTests   # ビルド
```

### フロントエンド (Next.js 14 / TypeScript)
```bash
cd frontend
npm run dev                        # 開発サーバー (localhost:3000)
npm run lint                       # ESLint
npm test                           # Jest全テスト
npm test -- --watch                # ウォッチモード
npm test -- Header.test.tsx        # 単一ファイル
npm run build                      # プロダクションビルド
```

### コンテナ内テスト
```bash
docker-compose -f docker-compose.test.yml run --rm backend-test
docker-compose -f docker-compose.test.yml run --rm frontend-test
```

## Architecture

### 認証フロー
- Spring Securityのform loginを使用（`/api/auth/login`）
- セッションはSpring Session JDBCでPostgreSQLに永続化
- ログインリクエストは`application/x-www-form-urlencoded`形式
- `CustomUserDetailsService`はユーザー名またはメールアドレスの両方でログイン可能
- CSRF保護: 一部エンドポイント除外（`/api/auth/**`, `/calendar.ics`, `/api/surveys/*/responses`）
- レート制限: ログイン試行5回失敗で15分間ロック（`RateLimitFilter`）

### ロールベースアクセス制御
```
NO_ROLE → VIEWER → EDITOR → ADMIN
```
- `SecurityConfig.java`: エンドポイント別アクセス制御
- `@EnableMethodSecurity`: メソッドレベルの認可
- `ADMIN_EMAIL`環境変数: 登録時に自動ADMIN付与

### バックエンド構造
```
backend/src/main/java/io/github/tknknk/yucale/
├── config/         # SecurityConfig, WebConfig, RateLimitFilter, GlobalExceptionHandler
├── controller/     # REST API (Auth, Schedule, Admin, Ics, Health, Notice, Survey)
├── service/        # ビジネスロジック
├── repository/     # Spring Data JPA
├── entity/         # User, Schedule, AuthRequest, Notice, Survey (Serializable必須)
├── dto/            # リクエスト/レスポンス
├── enums/          # Role, RequestStatus
├── exception/      # ConflictException, ResourceNotFoundException
├── security/       # CustomUserDetails, CustomUserDetailsService
└── validation/     # カスタムバリデーション (@NoSymbols, @ValidDateTimeRange)
```

### フロントエンド構造
```
frontend/src/
├── app/            # Next.js App Router (page.tsx)
├── components/     # Reactコンポーネント + テスト (*.test.tsx)
├── contexts/       # AuthContext (認証状態管理)
├── hooks/          # useAuth, useSchedules
├── lib/            # API通信 (api.ts, auth.ts, schedules.ts, admin.ts)
└── types/          # TypeScript型定義
```

### API通信
- `frontend/src/lib/api.ts`: Axiosインスタンス（withCredentials: true）
- `frontend/src/lib/auth.ts`: ログインはURLSearchParamsで送信
- レスポンス形式: `ApiResponse<T>` (success, message, data)

## Environment Variables

### バックエンド
| 変数 | 説明 |
|------|------|
| `ADMIN_EMAIL` | 登録時にADMINロールを付与するメールアドレス |
| `DISCORD_WEBHOOK_URL` | 権限リクエスト通知用 |
| `DEFAULT_BELONGING_LIST` | 出欠調査の所属リスト（デフォルト: S,A,T,B） |
| `DEFAULT_RESPONSE_OPTIONS` | 出欠調査の回答選択肢（デフォルト: 出席,欠席,未定） |

### フロントエンド
| 変数 | 説明 |
|------|------|
| `NEXT_PUBLIC_API_URL` | バックエンドAPIのURL |
| `NEXT_PUBLIC_ICS_FILENAME` | ICSファイル名 |
| `NEXT_PUBLIC_DEFAULT_START_TIME` | デフォルト開始時刻 (HH:mm) |
| `NEXT_PUBLIC_DEFAULT_END_TIME` | デフォルト終了時刻 (HH:mm) |

## Testing Notes

- バックエンド: JUnit 5 + Mockito, テスト用H2データベース
- フロントエンド: Jest + React Testing Library
- エンティティ（User, CustomUserDetails）はSpring Session JDBC用に`Serializable`実装必須
