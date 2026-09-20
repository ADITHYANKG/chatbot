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

Copy `.env.example` to `backend/app/.env` and add your OpenRouter key. Runtime uploads, SQLite databases, environment files, frontend builds, and dependencies are intentionally excluded from Git.
