# AI Chatbot

The repository is organized by concern:

```
backend/
  app/                 # FastAPI application
  requirements.txt     # Python dependencies
frontend/
  ai-chat-ui/          # React application
postman/
  chatbot.postman_collection.json
```

## Run locally

Install backend dependencies with `pip install -r backend/requirements.txt`.
Run the backend from `backend/app` with `uvicorn main:app --reload`.

Install frontend dependencies with `npm install` from `frontend/ai-chat-ui`, then use `npm start`.

Copy `.env.example` to `backend/app/.env`. Set `OPENROUTER_API_KEY`, configure SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_FROM_EMAIL`) for verification and password recovery, and set a unique `JWT_SECRET_KEY` before deployment. Generate a key with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. The app automatically upgrades the SQLite auth schema on startup; existing accounts will be asked to add and verify an email after their next login. Runtime uploads, SQLite databases, environment files, frontend builds, and dependencies are intentionally excluded from Git.
