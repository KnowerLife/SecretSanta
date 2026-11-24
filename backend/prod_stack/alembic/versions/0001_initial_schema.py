"""initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-11-12 00:00:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('users',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_table('rooms',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('mode', sa.String(), nullable=False),
        sa.Column('budget_min', sa.Integer(), nullable=False),
        sa.Column('budget_max', sa.Integer(), nullable=False),
        sa.Column('event_date', sa.String(), nullable=True),
        sa.Column('theme', sa.String(), nullable=True),
        sa.Column('organizer_user_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('organizer_member_id', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_rooms_code', 'rooms', ['code'], unique=True)

    op.create_table('room_members',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('room_id', sa.String(), sa.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name_snapshot', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('gift_status', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('room_id', 'user_id', name='uq_room_member_user'),
    )
    op.create_index('ix_room_members_room_id', 'room_members', ['room_id'])

    op.create_table('room_events',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('room_id', sa.String(), sa.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('actor_member_id', sa.String(), sa.ForeignKey('room_members.id'), nullable=True),
        sa.Column('payload_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_room_events_room_id', 'room_events', ['room_id'])

    op.create_table('exclusions',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('room_id', sa.String(), sa.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('member_a_id', sa.String(), sa.ForeignKey('room_members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('member_b_id', sa.String(), sa.ForeignKey('room_members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('room_id', 'member_a_id', 'member_b_id', name='uq_exclusion_pair'),
    )
    op.create_index('ix_exclusions_room_id', 'exclusions', ['room_id'])

    op.create_table('draw_runs',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('room_id', sa.String(), sa.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('mode', sa.String(), nullable=False),
        sa.Column('created_by_member_id', sa.String(), sa.ForeignKey('room_members.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('algorithm_version', sa.String(), nullable=False),
        sa.Column('meta_json', sa.Text(), nullable=True),
    )
    op.create_index('ix_draw_runs_room_id', 'draw_runs', ['room_id'])

    op.create_table('assignments',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('draw_run_id', sa.String(), sa.ForeignKey('draw_runs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('room_id', sa.String(), sa.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('santa_member_id', sa.String(), sa.ForeignKey('room_members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recipient_member_id', sa.String(), sa.ForeignKey('room_members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('draw_run_id', 'santa_member_id', name='uq_draw_santa'),
    )
    op.create_index('ix_assignments_draw_run_id', 'assignments', ['draw_run_id'])
    op.create_index('ix_assignments_room_id', 'assignments', ['room_id'])
    op.create_index('ix_assignments_santa_member_id', 'assignments', ['santa_member_id'])

    op.create_table('auth_sessions',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('room_id', sa.String(), sa.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('member_id', sa.String(), sa.ForeignKey('room_members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('token_type', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_reason', sa.String(), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('ip_hint', sa.String(), nullable=True),
    )
    op.create_index('ix_auth_sessions_room_id', 'auth_sessions', ['room_id'])
    op.create_index('ix_auth_sessions_member_id', 'auth_sessions', ['member_id'])

    op.create_table('room_invites',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('room_id', sa.String(), sa.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(), nullable=False),
        sa.Column('label', sa.String(), nullable=True),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('created_by_member_id', sa.String(), sa.ForeignKey('room_members.id'), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('max_uses', sa.Integer(), nullable=True),
        sa.Column('use_count', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_room_invites_room_id', 'room_invites', ['room_id'])
    op.create_unique_constraint('uq_room_invites_token_hash', 'room_invites', ['token_hash'])

    op.create_table('member_access_tokens',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('room_id', sa.String(), sa.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('member_id', sa.String(), sa.ForeignKey('room_members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(), nullable=False),
        sa.Column('label', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_member_access_tokens_room_id', 'member_access_tokens', ['room_id'])
    op.create_index('ix_member_access_tokens_member_id', 'member_access_tokens', ['member_id'])
    op.create_unique_constraint('uq_member_access_tokens_token_hash', 'member_access_tokens', ['token_hash'])

    op.create_table('push_subscriptions',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('room_id', sa.String(), sa.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=True),
        sa.Column('member_id', sa.String(), sa.ForeignKey('room_members.id', ondelete='CASCADE'), nullable=True),
        sa.Column('endpoint', sa.Text(), nullable=False),
        sa.Column('p256dh', sa.Text(), nullable=True),
        sa.Column('auth', sa.Text(), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_unique_constraint('uq_push_subscriptions_endpoint', 'push_subscriptions', ['endpoint'])

    op.create_table('notification_jobs',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('room_id', sa.String(), sa.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=True),
        sa.Column('member_id', sa.String(), sa.ForeignKey('room_members.id', ondelete='CASCADE'), nullable=True),
        sa.Column('channel', sa.String(), nullable=False),
        sa.Column('kind', sa.String(), nullable=False),
        sa.Column('payload_json', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('run_at', sa.DateTime(), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=False),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_notification_jobs_room_id', 'notification_jobs', ['room_id'])
    op.create_index('ix_notification_jobs_status', 'notification_jobs', ['status'])
    op.create_index('ix_notification_jobs_status_sched', 'notification_jobs', ['status', 'scheduled_at'])


def downgrade():
    for t in ['notification_jobs','push_subscriptions','member_access_tokens','room_invites','auth_sessions','assignments','draw_runs','exclusions','room_events','room_members','rooms','users']:
        op.drop_table(t)
