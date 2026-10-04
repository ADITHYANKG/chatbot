from alembic import op
import sqlalchemy as sa

revision = "0001_account_recovery"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "users" in tables:
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        with op.batch_alter_table("users") as batch:
            if "email" not in user_columns:
                batch.add_column(sa.Column("email", sa.String(length=320), nullable=True))
            if "email_verified" not in user_columns:
                batch.add_column(sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
            if "token_version" not in user_columns:
                batch.add_column(sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"))

        inspector = sa.inspect(bind)
        email_indexes = {index["name"] for index in inspector.get_indexes("users")}
        email_constraints = inspector.get_unique_constraints("users")
        if "ix_users_email" not in email_indexes and not any(
            constraint.get("column_names") == ["email"] for constraint in email_constraints
        ):
            op.create_index("ix_users_email", "users", ["email"], unique=True)

    if "email_action_tokens" not in tables:
        op.create_table(
            "email_action_tokens",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("purpose", sa.String(length=32), nullable=False),
            sa.Column("token_digest", sa.String(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("consumed_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("token_digest", name="uq_email_action_tokens_digest"),
        )
        op.create_index("ix_email_action_tokens_user_id", "email_action_tokens", ["user_id"])
        op.create_index("ix_email_action_tokens_purpose", "email_action_tokens", ["purpose"])
        op.create_index("ix_email_action_tokens_expires_at", "email_action_tokens", ["expires_at"])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "email_action_tokens" in inspector.get_table_names():
        op.drop_table("email_action_tokens")

    if "users" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("users")}
        indexes = {index["name"] for index in inspector.get_indexes("users")}
        if "ix_users_email" in indexes:
            op.drop_index("ix_users_email", table_name="users")
        with op.batch_alter_table("users") as batch:
            for column in ("email", "email_verified", "token_version"):
                if column in columns:
                    batch.drop_column(column)