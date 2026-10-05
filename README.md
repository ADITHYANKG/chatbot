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

To grant dashboard access, set `ADMIN_USERNAMES` to a comma-separated list of existing usernames in the backend environment (for example, `ADMIN_USERNAMES=myaccount`) and restart the backend. Admin users must have a verified email to open `/admin`. The dashboard can list users and delete non-admin accounts with their saved chat and upload records.

The frontend reads `REACT_APP_API_BASE_URL` at build time. Copy `frontend/ai-chat-ui/.env.example` to the frontend's `.env` for local development. For a production build, set that variable to the backend's publicly reachable URL; do not leave it set to `localhost` unless each visitor runs the backend on their own computer.
