"""wishlist items and messages

Revision ID: 0002_wishlist_messages
Revises: 0001_initial_schema
Create Date: 2026-11-24 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '0002_wishlist_messages'
down_revision = '0001_initial_schema'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'wishlist_items',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('room_id', sa.String(), sa.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('member_id', sa.String(), sa.ForeignKey('room_members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_wishlist_items_room_id', 'wishlist_items', ['room_id'])
    op.create_index('ix_wishlist_items_member_id', 'wishlist_items', ['member_id'])

    op.create_table(
        'messages',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('room_id', sa.String(), sa.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('draw_run_id', sa.String(), sa.ForeignKey('draw_runs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('from_member_id', sa.String(), sa.ForeignKey('room_members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('to_member_id', sa.String(), sa.ForeignKey('room_members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('channel', sa.String(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_messages_room_id', 'messages', ['room_id'])
    op.create_index('ix_messages_draw_run_id', 'messages', ['draw_run_id'])
    op.create_index('ix_messages_from_member_id', 'messages', ['from_member_id'])
    op.create_index('ix_messages_to_member_id', 'messages', ['to_member_id'])


def downgrade():
    op.drop_table('messages')
    op.drop_table('wishlist_items')
