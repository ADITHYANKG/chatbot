import os
import sys
import tempfile
import uuid
from pathlib import Path

import pytest

APP_DIR = Path(__file__).resolve().parents[1] / "app"
TEST_DATABASE = Path(tempfile.gettempdir()) / f"chatbot-auth-{uuid.uuid4().hex}.sqlite"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DATABASE.as_posix()}"
os.environ["JWT_SECRET_KEY"] = "test-only-jwt-signing-key-not-for-production"
os.environ["APP_ENV"] = "test"
os.environ["FRONTEND_URL"] = "http://frontend.test"
sys.path.insert(0, str(APP_DIR))

from fastapi.testclient import TestClient

import main
from database import Base, SessionLocal, engine


@pytest.fixture(scope="session")
def client():
    main.app.dependency_overrides[main.get_db] = _database_session
    with TestClient(main.app) as test_client:
        yield test_client
    main.app.dependency_overrides.clear()
    engine.dispose()
    TEST_DATABASE.unlink(missing_ok=True)


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    main._rate_limit_events.clear()
    yield


def _database_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()