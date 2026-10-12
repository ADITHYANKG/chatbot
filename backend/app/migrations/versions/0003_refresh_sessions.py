from alembic import op
import sqlalchemy as sa


revision = "0003_refresh_sessions"
down_revision = "0002_admin_users"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if "refresh_sessions" in sa.inspect(bind).get_table_names():
        return

    op.create_table(
        "refresh_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_digest", sa.String(length=64), nullable=False),
        sa.Column("token_version", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("token_digest", name="uq_refresh_sessions_token_digest"),
    )
    op.create_index("ix_refresh_sessions_user_id", "refresh_sessions", ["user_id"])
    op.create_index("ix_refresh_sessions_token_digest", "refresh_sessions", ["token_digest"])
    op.create_index("ix_refresh_sessions_expires_at", "refresh_sessions", ["expires_at"])


def downgrade():
    bind = op.get_bind()
    if "refresh_sessions" in sa.inspect(bind).get_table_names():
        op.drop_table("refresh_sessions")
