import base64
import hashlib
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

from auth import verify_password
from database import SessionLocal
from models import EmailActionToken, User

import main


def _token_from_message(message: str) -> str:
    link = next(line for line in message.splitlines() if line.startswith("http"))
    parsed_link = urlparse(link)
    assert not parsed_link.query
    return parse_qs(parsed_link.fragment)["token"][0]


def _authorization(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_existing_account_can_add_verified_email_and_legacy_hash_is_upgraded(client, monkeypatch):
    outbound = []
    monkeypatch.setattr(main, "send_email", lambda *args: outbound.append(args))
    legacy_hash = base64.b64encode(
        hashlib.pbkdf2_hmac("sha256", b"legacy-password", b"your_salt_here", 100000)
    ).decode()
    with SessionLocal() as db:
        db.add(User(username="legacy-user", password=legacy_hash))
        db.commit()

    login = client.post("/login/", data={"username": "legacy-user", "password": "legacy-password"})
    assert login.status_code == 200
    access_token = login.json()["access_token"]
    assert login.json()["email_verified"] is False
    assert client.get("/user-id/", headers=_authorization(access_token)).status_code == 403

    with SessionLocal() as db:
        upgraded_user = db.query(User).filter_by(username="legacy-user").one()
        assert upgraded_user.password.startswith("$argon2")
        assert verify_password("legacy-password", upgraded_user.password)

    update = client.post(
        "/account/email/",
        headers=_authorization(access_token),
        data={"email": "Legacy.User@example.com"},
    )
    assert update.status_code == 200
    assert outbound[-1][0] == "legacy.user@example.com"
    verification_token = _token_from_message(outbound[-1][2])
    with SessionLocal() as db:
        saved_token = db.query(EmailActionToken).one()
        assert saved_token.token_digest != verification_token

    verified = client.post("/email-verification/confirm/", data={"token": verification_token})
    assert verified.status_code == 200
    assert client.get("/user-id/", headers=_authorization(access_token)).status_code == 200
    repeated_verification = client.post(
        "/email-verification/confirm/",
        data={"token": verification_token},
    )
    assert repeated_verification.status_code == 200
    assert repeated_verification.json() == verified.json()


def test_registration_and_password_reset_tokens_are_verified_digest_only_and_single_use(client, monkeypatch):
    outbound = []
    monkeypatch.setattr(main, "send_email", lambda *args: outbound.append(args))
    rejected = client.post(
        "/register/",
        data={
            "username": "reset-user",
            "password": "alllowercase123!",
            "email": "Reset.User@example.com",
        },
    )
    assert rejected.status_code == 422

    registered = client.post(
        "/register/",
        data={
            "username": "reset-user",
            "password": "Initial-password-123!",
            "email": "Reset.User@example.com",
        },
    )
    assert registered.status_code == 200
    verification_token = _token_from_message(outbound[-1][2])
    with SessionLocal() as db:
        token_record = db.query(EmailActionToken).one()
        assert token_record.token_digest != verification_token

    assert client.post("/email-verification/confirm/", data={"token": verification_token}).status_code == 200
    login = client.post("/login/", data={"username": "reset-user", "password": "Initial-password-123!"})
    old_access_token = login.json()["access_token"]

    known = client.post("/password-reset/request/", data={"email": "reset.user@example.com"})
    unknown = client.post("/password-reset/request/", data={"email": "nobody@example.com"})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
    reset_token = _token_from_message(outbound[-1][2])
    with SessionLocal() as db:
        reset_record = db.query(EmailActionToken).filter_by(purpose="password_reset").one()
        assert reset_record.token_digest != reset_token

    completed = client.post(
        "/password-reset/confirm/",
        data={"token": reset_token, "new_password": "Replacement-password-456!"},
    )
    assert completed.status_code == 200
    assert client.post("/password-reset/confirm/", data={
        "token": reset_token,
        "new_password": "Replacement-password-456!",
    }).status_code == 400
    assert client.get("/user-id/", headers=_authorization(old_access_token)).status_code == 401
    assert client.post("/login/", data={
        "username": "reset-user",
        "password": "Initial-password-123!",
    }).status_code == 401
    replacement_login = client.post("/login/", data={
        "username": "reset-user",
        "password": "Replacement-password-456!",
    })
    assert replacement_login.status_code == 200


def test_expired_reset_link_is_rejected(client, monkeypatch):
    outbound = []
    monkeypatch.setattr(main, "send_email", lambda *args: outbound.append(args))
    with SessionLocal() as db:
        db.add(User(
            username="expired-user",
            password=main.get_password_hash("current-password-123"),
            email="expired@example.com",
            email_verified=True,
        ))
        db.commit()

    client.post("/password-reset/request/", data={"email": "expired@example.com"})
    reset_token = _token_from_message(outbound[-1][2])
    with SessionLocal() as db:
        action_token = db.query(EmailActionToken).filter_by(purpose="password_reset").one()
        action_token.expires_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=1)
        db.commit()

    response = client.post("/password-reset/confirm/", data={
        "token": reset_token,
        "new_password": "replacement-password-456",
    })
    assert response.status_code == 400
    assert client.post("/login/", data={
        "username": "expired-user",
        "password": "current-password-123",
    }).status_code == 200


def test_smtp_failure_does_not_change_password_reset_response(client, monkeypatch):
    with SessionLocal() as db:
        db.add(User(
            username="smtp-user",
            password=main.get_password_hash("current-password-123"),
            email="smtp@example.com",
            email_verified=True,
        ))
        db.commit()

    def fail_delivery(*_args):
        raise OSError("mail server unavailable")

    monkeypatch.setattr(main, "send_email", fail_delivery)
    response = client.post("/password-reset/request/", data={"email": "smtp@example.com"})
    assert response.status_code == 200
    assert response.json() == {
        "message": "If a verified account exists for that email, a reset link has been sent."
    }