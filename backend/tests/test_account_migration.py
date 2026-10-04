from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


def test_migration_preserves_existing_accounts_and_chat_history(tmp_path):
    database_path = tmp_path / "existing.sqlite"
    engine = create_engine(f"sqlite:///{database_path}")
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR NOT NULL UNIQUE, password VARCHAR NOT NULL)"
        ))
        connection.execute(text(
            "INSERT INTO users (id, username, password) VALUES (1, 'legacy-user', 'existing-hash')"
        ))
        connection.execute(text(
            "CREATE TABLE plain_chat_history (id INTEGER PRIMARY KEY, user_id INTEGER, query_text TEXT NOT NULL, response_text TEXT NOT NULL)"
        ))
        connection.execute(text(
            "INSERT INTO plain_chat_history VALUES (1, 1, 'keep this question', 'keep this answer')"
        ))

    app_dir = Path(__file__).resolve().parents[1] / "app"
    config = Config(str(app_dir / "alembic.ini"))
    with engine.connect() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")

    with engine.connect() as connection:
        columns = {column["name"] for column in inspect(connection).get_columns("users")}
        user = connection.execute(text(
            "SELECT username, password, email_verified, token_version FROM users WHERE id=1"
        )).one()
        history = connection.execute(text(
            "SELECT query_text, response_text FROM plain_chat_history WHERE id=1"
        )).one()
        tables = set(inspect(connection).get_table_names())

    engine.dispose()
    assert {"email", "email_verified", "token_version"} <= columns
    assert "email_action_tokens" in tables
    assert user.username == "legacy-user"
    assert user.password == "existing-hash"
    assert history.query_text == "keep this question"
    assert history.response_text == "keep this answer"