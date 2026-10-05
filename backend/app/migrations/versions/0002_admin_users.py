from alembic import op
import sqlalchemy as sa


revision = "0002_admin_users"
down_revision = "0001_account_recovery"
branch_labels = None
depends_on = None


def upgrade():
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("users")}
    with op.batch_alter_table("users") as batch:
        if "is_admin" not in columns:
            batch.add_column(sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()))
        if "created_at" not in columns:
            batch.add_column(sa.Column("created_at", sa.DateTime(), nullable=True))


def downgrade():
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("users")}
    with op.batch_alter_table("users") as batch:
        if "created_at" in columns:
            batch.drop_column("created_at")
        if "is_admin" in columns:
            batch.drop_column("is_admin")
