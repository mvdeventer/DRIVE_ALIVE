"""Add encrypted Twilio credentials columns to users table

Revision ID: add_twilio_credentials
Revises: add_password_reset_tokens
Create Date: 2026-02-27

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "add_twilio_credentials"
down_revision = "add_password_reset_tokens"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("twilio_account_sid", sa.String(), nullable=True))
    op.add_column("users", sa.Column("twilio_auth_token", sa.String(), nullable=True))


def downgrade():
    op.drop_column("users", "twilio_auth_token")
    op.drop_column("users", "twilio_account_sid")
