"""add world chat messages

Revision ID: 8f1d2f9d7c6a
Revises: 691e1c961990
Create Date: 2026-05-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "8f1d2f9d7c6a"
down_revision = "691e1c961990"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "world_message",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("world_message")
