"""add extended member profile fields

Revision ID: 0004_member_profile_extended
Revises: 0003_member_profile
Create Date: 2026-11-24
"""
from alembic import op
import sqlalchemy as sa


revision = "0004_member_profile_extended"
down_revision = "0003_member_profile"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("room_members", sa.Column("size", sa.Text(), nullable=True))
    op.add_column("room_members", sa.Column("links", sa.Text(), nullable=True))
    op.add_column("room_members", sa.Column("allergies", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("room_members", "allergies")
    op.drop_column("room_members", "links")
    op.drop_column("room_members", "size")
