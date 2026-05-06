"""add created_at to user

Revision ID: 691e1c961990
Revises: 59378b41d041
Create Date: 2026-05-06 12:12:04.811511

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '691e1c961990'
down_revision = '59378b41d041'
branch_labels = None
depends_on = None


def user_columns():
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns("user")}


def upgrade():
    if "created_at" in user_columns():
        return

    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), nullable=True))

    op.execute(sa.text('UPDATE "user" SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL'))

    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.alter_column('created_at', existing_type=sa.DateTime(), nullable=False)


def downgrade():
    if "created_at" not in user_columns():
        return

    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('created_at')
