from alembic import op
import sqlalchemy as sa


revision = "0004_response_usage"
down_revision = "0003_refresh_sessions"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for table in ("chat_history", "plain_chat_history", "db_queries"):
        if table in inspector.get_table_names() and "usage_json" not in {
            column["name"] for column in inspector.get_columns(table)
        }:
            op.add_column(table, sa.Column("usage_json", sa.Text(), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for table in ("db_queries", "plain_chat_history", "chat_history"):
        if table in inspector.get_table_names() and "usage_json" in {
            column["name"] for column in inspector.get_columns(table)
        }:
            op.drop_column(table, "usage_json")
