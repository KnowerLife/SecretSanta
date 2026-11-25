"""member profile fields

Revision ID: 0003_member_profile
Revises: 0002_wishlist_messages
Create Date: 2026-11-24 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '0003_member_profile'
down_revision = '0002_wishlist_messages'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('room_members', sa.Column('address', sa.Text(), nullable=True))
    op.add_column('room_members', sa.Column('profile_note', sa.Text(), nullable=True))
    op.add_column('room_members', sa.Column('anti_wishlist', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('room_members', 'anti_wishlist')
    op.drop_column('room_members', 'profile_note')
    op.drop_column('room_members', 'address')
