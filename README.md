# OnlySNS

自分専用の学習SNSです。投稿・検索・分析に加え、ローカルLLM(Ollama)を使ったAI補助機能を利用できます。

## 起動方法 (Docker Compose)

```bash
docker compose up -d --build
```

起動サービス:
- `postgres`: データベース
- `ollama`: ローカルLLMサーバー (`127.0.0.1:11434`)
- `backend`: Go API (`127.0.0.1:8080`)
- `frontend`: Next.js (`127.0.0.1:3000`)

`backend` は起動時に `OLLAMA_MODEL` / `OLLAMA_EMBEDDING_MODEL` を自動取得します。

## AI機能 (ローカル実行)

- AI学習相棒のつっこみ
- 反応
- 4択クイズ生成
- 関連投稿の推薦

上記は全てバックエンドから Ollama API を呼び出して実行されます。
