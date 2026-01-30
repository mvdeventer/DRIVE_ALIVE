"""
Verification cleanup scheduler - Deletes unverified accounts after token expiration
"""

import asyncio
import logging
from datetime import datetime, timezone

from ..database import SessionLocal
from .verification_service import VerificationService

logger = logging.getLogger(__name__)


class VerificationCleanupScheduler:
    """Background task that removes unverified users with expired tokens"""

    def __init__(self, interval_minutes: int = 5):
        """
        Initialize scheduler

        Args:
            interval_minutes: How often to run cleanup (default: every 5 minutes)
        """
        self.interval_minutes = interval_minutes
        self._task = None
        self._running = False

    async def start(self):
        """Start the background cleanup task"""
        if self._running:
            logger.warning("Verification cleanup scheduler already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._run_scheduler())
        logger.info(
            f"✓ Verification cleanup scheduler started (runs every {self.interval_minutes} minutes)"
        )

    async def stop(self):
        """Stop the background cleanup task"""
        if not self._running:
            return

        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

        logger.info("Verification cleanup scheduler stopped")

    async def _run_scheduler(self):
        """Main scheduler loop"""
        while self._running:
            try:
                # Run cleanup
                await self._cleanup_unverified_users()

                # Wait for next interval
                await asyncio.sleep(self.interval_minutes * 60)

            except asyncio.CancelledError:
                logger.info("Verification cleanup scheduler cancelled")
                break
            except Exception as e:
                logger.error(f"Error in verification cleanup scheduler: {str(e)}")
                # Wait a bit before retrying
                await asyncio.sleep(60)

    async def _cleanup_unverified_users(self):
        """Delete users with expired unverified tokens"""
        db = SessionLocal()
        try:
            deleted_count = VerificationService.delete_unverified_users(db)

            if deleted_count > 0:
                logger.info(
                    f"[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}] "
                    f"Verification cleanup: Deleted {deleted_count} unverified user(s)"
                )

        except Exception as e:
            logger.error(f"Failed to cleanup unverified users: {str(e)}")
        finally:
            db.close()


# Global scheduler instance
verification_cleanup_scheduler = VerificationCleanupScheduler(interval_minutes=5)
