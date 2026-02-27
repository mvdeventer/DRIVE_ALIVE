"""Add active_session_token column to users table for single-session enforcement

Revision ID: add_session_token
Revises: add_twilio_credentials
Create Date: 2026-02-27

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "add_session_token"
down_revision = "add_twilio_credentials"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("active_session_token", sa.String(), nullable=True))


def downgrade():
    op.drop_column("users", "active_session_token")
