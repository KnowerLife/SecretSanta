import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, Index
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    email = Column(String, nullable=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Room(Base):
    __tablename__ = "rooms"
    id = Column(String, primary_key=True)
    code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    mode = Column(String, nullable=False, default="classic")
    budget_min = Column(Integer, nullable=False, default=0)
    budget_max = Column(Integer, nullable=False, default=0)
    event_date = Column(String, nullable=True)
    theme = Column(String, nullable=True)
    organizer_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    organizer_member_id = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    members = relationship("RoomMember", back_populates="room", cascade="all, delete-orphan")


class RoomMember(Base):
    __tablename__ = "room_members"
    id = Column(String, primary_key=True)
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name_snapshot = Column(String, nullable=False)
    role = Column(String, nullable=False, default="participant")
    gift_status = Column(String, nullable=False, default="none")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    room = relationship("Room", back_populates="members")
    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uq_room_member_user"),)


class Exclusion(Base):
    __tablename__ = "exclusions"
    id = Column(String, primary_key=True)
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    member_a_id = Column(String, ForeignKey("room_members.id", ondelete="CASCADE"), nullable=False)
    member_b_id = Column(String, ForeignKey("room_members.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (UniqueConstraint("room_id", "member_a_id", "member_b_id", name="uq_exclusion_pair"),)


class DrawRun(Base):
    __tablename__ = "draw_runs"
    id = Column(String, primary_key=True)
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    mode = Column(String, nullable=False)
    created_by_member_id = Column(String, ForeignKey("room_members.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    algorithm_version = Column(String, nullable=False, default="v1")
    meta_json = Column(Text, nullable=True)


class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(String, primary_key=True)
    draw_run_id = Column(String, ForeignKey("draw_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    santa_member_id = Column(String, ForeignKey("room_members.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_member_id = Column(String, ForeignKey("room_members.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (UniqueConstraint("draw_run_id", "santa_member_id", name="uq_draw_santa"),)


class RoomEvent(Base):
    __tablename__ = "room_events"
    id = Column(String, primary_key=True)
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String, nullable=False)
    actor_member_id = Column(String, ForeignKey("room_members.id"), nullable=True)
    payload_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id = Column(String, primary_key=True)
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(String, ForeignKey("room_members.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    token_type = Column(String, nullable=False, default="bearer")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    revoked_reason = Column(String, nullable=True)
    last_seen_at = Column(DateTime, nullable=True)
    user_agent = Column(Text, nullable=True)
    ip_hint = Column(String, nullable=True)


class RoomInvite(Base):
    __tablename__ = "room_invites"
    id = Column(String, primary_key=True)
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String, unique=True, nullable=False)
    label = Column(String, nullable=True)
    role = Column(String, nullable=False, default="participant")
    created_by_member_id = Column(String, ForeignKey("room_members.id"), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    max_uses = Column(Integer, nullable=True)
    use_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class MemberAccessToken(Base):
    __tablename__ = "member_access_tokens"
    id = Column(String, primary_key=True)
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(String, ForeignKey("room_members.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String, unique=True, nullable=False)
    label = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(String, primary_key=True)
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=True)
    member_id = Column(String, ForeignKey("room_members.id", ondelete="CASCADE"), nullable=True)
    endpoint = Column(Text, unique=True, nullable=False)
    p256dh = Column(Text, nullable=True)
    auth = Column(Text, nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class WishlistItem(Base):
    __tablename__ = "wishlist_items"
    id = Column(String, primary_key=True)
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(String, ForeignKey("room_members.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class NotificationJob(Base):
    __tablename__ = "notification_jobs"
    id = Column(String, primary_key=True)
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=True, index=True)
    member_id = Column(String, ForeignKey("room_members.id", ondelete="CASCADE"), nullable=True)
    channel = Column(String, nullable=False)  # push|email
    kind = Column(String, nullable=False)
    payload_json = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending", index=True)
    scheduled_at = Column(DateTime, nullable=True)
    run_at = Column(DateTime, nullable=True)
    attempts = Column(Integer, nullable=False, default=0)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


Index("ix_notification_jobs_status_sched", NotificationJob.status, NotificationJob.scheduled_at)
