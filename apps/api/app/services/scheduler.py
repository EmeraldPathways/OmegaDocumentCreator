"""Lightweight backup scheduler service.

Uses a background asyncio task with a configurable interval.
Prevents overlapping backup runs via a module-level lock.
Exposes last/next scheduled run timestamps for status queries.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import text

logger = logging.getLogger("omega.scheduler")
_SCHEDULER_LOCK_KEY = 20260801

# ---- module-level state ----
_scheduler_task: asyncio.Task[object] | None = None
_scheduler_loop: asyncio.AbstractEventLoop | None = None
_scheduler_enabled_without_loop: bool = False
_scheduled_backup_running: bool = False
_last_scheduled_run: datetime | None = None
_next_scheduled_run: datetime | None = None


def get_scheduler_status() -> dict[str, object]:
    """Return scheduler state for status endpoints."""
    return {
        "enabled": _scheduler_task is not None or _scheduler_enabled_without_loop,
        "running": _scheduled_backup_running,
        "last_scheduled_run": _last_scheduled_run.isoformat() if _last_scheduled_run else None,
        "next_scheduled_run": _next_scheduled_run.isoformat() if _next_scheduled_run else None,
    }


def run_single_scheduled_backup(
    *,
    backup_path: Path,
    file_storage_path: Path,
    database_url: str,
    pg_dump_bin: str,
) -> dict[str, object]:
    """Execute one scheduled backup run and return the result dict.

    This is extracted from the infinite loop so it can be tested
    directly without mocking asyncio.sleep.  Sets the module-level
    running flag to prevent overlap, and records last/next timestamps.
    """
    global _scheduled_backup_running, _last_scheduled_run, _next_scheduled_run

    # Prevent overlapping runs
    if _scheduled_backup_running:
        logger.warning("Scheduled backup skipped — previous run still in progress")
        return {"status": "skipped", "reason": "previous-run-still-running"}

    now = datetime.now(UTC)
    _next_scheduled_run = now
    _scheduled_backup_running = True

    advisory_lock_acquired = False
    db = None

    try:
        from app.models import BackupRun as BackupRunModel
        from app.repositories.backups import BackupRepository
        from app.services.backups import create_backup_manifest
        from app.db import get_session

        db = get_session()
        try:
            if "placeholder" not in database_url:
                advisory_lock_acquired = _try_acquire_scheduler_lock(db)
                if not advisory_lock_acquired:
                    logger.warning("Scheduled backup skipped — database advisory lock already held")
                    return {"status": "skipped", "reason": "database-lock-held"}

            result = create_backup_manifest(
                backup_path=backup_path,
                file_storage_path=file_storage_path,
                triggered_by_email="scheduler@omega.local",
                database_url=database_url,
                pg_dump_bin=pg_dump_bin,
            )

            backup_repo = BackupRepository(db)
            run = BackupRunModel(
                status=result["status"],
                triggered_by=None,  # scheduler has no user
                database_backup=result.get("database_backup"),
                files_backup=result.get("files_backup"),
                documents_backup=result.get("documents_backup"),
                error_message=result.get("error_message"),
            )
            backup_repo.add(run)
            db.commit()
            _last_scheduled_run = now
            logger.info("Scheduled backup completed: status=%s id=%s", result["status"], run.id)
            return {"status": "completed", "backup_run_id": str(run.id), "backup_status": result["status"]}
        except Exception:
            if db is not None:
                db.rollback()
            logger.exception("Scheduled backup failed")
            return {"status": "failed", "error": "backup-execution-error"}
        finally:
            if db is not None:
                if advisory_lock_acquired:
                    _release_scheduler_lock(db)
                db.close()
    finally:
        _scheduled_backup_running = False


async def _run_scheduled_backup(
    *,
    interval_seconds: int,
    backup_path: Path,
    file_storage_path: Path,
    database_url: str,
    pg_dump_bin: str,
) -> None:
    """Loop forever, sleeping *interval_seconds* between backup runs."""
    while True:
        await asyncio.to_thread(
            run_single_scheduled_backup,
            backup_path=backup_path,
            file_storage_path=file_storage_path,
            database_url=database_url,
            pg_dump_bin=pg_dump_bin,
        )
        await asyncio.sleep(interval_seconds)


def start_scheduler(
    *,
    interval_minutes: int,
    backup_path: Path,
    file_storage_path: Path,
    database_url: str,
    pg_dump_bin: str,
) -> None:
    """Start the background backup scheduler.

    Creates an asyncio task that runs forever.  Safe to call multiple
    times — only one scheduler task will exist.
    """
    global _scheduler_task
    global _scheduler_loop
    global _scheduler_enabled_without_loop

    if _scheduler_task is not None or _scheduler_enabled_without_loop:
        logger.info("Scheduler already running — not starting a second one")
        return

    interval_seconds = interval_minutes * 60
    logger.info("Starting backup scheduler: interval=%d minutes", interval_minutes)
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        _scheduler_enabled_without_loop = True
        return
    _scheduler_loop = loop
    _scheduler_task = loop.create_task(
        _run_scheduled_backup(
            interval_seconds=interval_seconds,
            backup_path=backup_path,
            file_storage_path=file_storage_path,
            database_url=database_url,
            pg_dump_bin=pg_dump_bin,
        )
    )


def stop_scheduler() -> None:
    """Cancel the scheduler task if running."""
    global _scheduler_task
    global _scheduler_loop
    global _scheduler_enabled_without_loop
    _scheduler_enabled_without_loop = False
    if _scheduler_task is not None:
        _scheduler_task.cancel()
        if _scheduler_loop is not None and not _scheduler_loop.is_running():
            try:
                _scheduler_loop.run_until_complete(asyncio.gather(_scheduler_task, return_exceptions=True))
            except Exception:
                logger.debug("Scheduler loop drain failed during stop", exc_info=True)
            _scheduler_loop.close()
        _scheduler_task = None
        _scheduler_loop = None
        logger.info("Scheduler stopped")


def _try_acquire_scheduler_lock(db: object) -> bool:
    try:
        result = db.execute(text("SELECT pg_try_advisory_lock(:lock_key)"), {"lock_key": _SCHEDULER_LOCK_KEY})
        return bool(result.scalar())
    except Exception:
        logger.warning("Failed to acquire scheduler advisory lock; falling back to process-local protection", exc_info=True)
        return True


def _release_scheduler_lock(db: object) -> None:
    try:
        db.execute(text("SELECT pg_advisory_unlock(:lock_key)"), {"lock_key": _SCHEDULER_LOCK_KEY})
    except Exception:
        logger.warning("Failed to release scheduler advisory lock", exc_info=True)
