"""add user preferred language

Revision ID: a2f6c4e8d901
Revises: 8f1d2f9d7c6a
Create Date: 2026-05-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "a2f6c4e8d901"
down_revision = "8f1d2f9d7c6a"
branch_labels = None
depends_on = None


def user_columns():
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns("user")}


def upgrade():
    if "preferred_language" in user_columns():
        return

    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.add_column(sa.Column("preferred_language", sa.String(length=10), nullable=True))

    op.execute(sa.text('UPDATE "user" SET preferred_language = :language WHERE preferred_language IS NULL').bindparams(language="en"))

    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.alter_column(
            "preferred_language",
            existing_type=sa.String(length=10),
            nullable=False,
        )


def downgrade():
    if "preferred_language" not in user_columns():
        return

    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.drop_column("preferred_language")
