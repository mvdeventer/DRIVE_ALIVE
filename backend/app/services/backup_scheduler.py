"""
Automated database backup scheduler service
Handles periodic backups, compression, and retention policies
"""

import asyncio
import json
import os
import shutil
import zipfile
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..routes.database import backup_database_internal


class BackupScheduler:
    """Manages automated database backups"""
    
    def __init__(self):
        self.running = False
        self.backup_dir = "backups"
        self.archived_dir = "backups/archived"
        self.config_file = "backup_config.json"
        self.ensure_directories()
        self.load_config()
    
    def ensure_directories(self):
        """Create backup directories if they don't exist"""
        os.makedirs(self.backup_dir, exist_ok=True)
        os.makedirs(self.archived_dir, exist_ok=True)
    
    def load_config(self) -> dict:
        """Load backup configuration (retention policy, etc.)"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Error loading backup config: {e}")
        
        # Default config
        default_config = {
            "retention_days": 30,  # Keep backups for 30 days
            "auto_archive_after_days": 14,  # Archive backups after 14 days
            "backup_interval_minutes": 10,
        }
        self.save_config(default_config)
        return default_config
    
    def save_config(self, config: dict):
        """Save backup configuration"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            print(f"Error saving backup config: {e}")
    
    def create_backup(self, backup_name: str = None) -> str:
        """
        Create a new database backup
        Returns the backup filename
        """
        try:
            if not backup_name:
                backup_name = f"auto_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            db = SessionLocal()
            try:
                backup_data = backup_database_internal(db)
                filepath = os.path.join(self.backup_dir, backup_name)
                
                with open(filepath, 'w') as f:
                    json.dump(backup_data, f, indent=2)
                
                print(f"✅ Backup created: {backup_name}")
                return backup_name
            finally:
                db.close()
        
        except Exception as e:
            print(f"❌ Backup failed: {str(e)}")
            return None
    
    def cleanup_old_backups(self):
        """
        Remove backups older than retention policy
        Archive backups older than archive threshold
        """
        try:
            config = self.load_config()
            retention_days = config.get("retention_days", 30)
            archive_days = config.get("auto_archive_after_days", 14)
            
            cutoff_time = datetime.now() - timedelta(days=retention_days)
            archive_cutoff = datetime.now() - timedelta(days=archive_days)
            
            files_deleted = 0
            files_archived = 0
            
            # Process regular backups
            for filename in os.listdir(self.backup_dir):
                if not filename.endswith('.json'):
                    continue
                
                filepath = os.path.join(self.backup_dir, filename)
                file_mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
                
                # Delete old backups
                if file_mtime < cutoff_time:
                    try:
                        os.remove(filepath)
                        files_deleted += 1
                        print(f"🗑️  Deleted old backup: {filename}")
                    except Exception as e:
                        print(f"Error deleting {filename}: {e}")
                
                # Archive old backups (before deleting)
                elif file_mtime < archive_cutoff:
                    self.archive_backup(filename)
                    files_archived += 1
            
            if files_deleted > 0 or files_archived > 0:
                print(f"🧹 Cleanup: {files_archived} archived, {files_deleted} deleted")
        
        except Exception as e:
            print(f"Error during cleanup: {e}")
    
    def archive_backup(self, filename: str):
        """
        Archive a backup into a ZIP file and remove the original
        Zip filename: archived_backups_YYYYMMDD.zip
        """
        try:
            filepath = os.path.join(self.backup_dir, filename)
            if not os.path.exists(filepath):
                return
            
            # Determine which archive to add to (one per day)
            archive_date = datetime.now().strftime("%Y%m%d")
            archive_name = f"archived_backups_{archive_date}.zip"
            archive_path = os.path.join(self.archived_dir, archive_name)
            
            # Add file to zip (or create new zip)
            try:
                with zipfile.ZipFile(archive_path, 'a', zipfile.ZIP_DEFLATED) as zf:
                    # Check if file already in zip
                    if filename not in zf.namelist():
                        zf.write(filepath, arcname=filename)
                        print(f"📦 Archived: {filename} → {archive_name}")
                
                # Remove original after successful archiving
                os.remove(filepath)
            except Exception as e:
                print(f"Error archiving {filename}: {e}")
        
        except Exception as e:
            print(f"Error in archive_backup: {e}")
    
    def list_all_backups(self) -> dict:
        """
        List all available backups (regular + archived)
        Returns dict with 'regular' and 'archived' backup lists
        """
        all_backups = {
            "regular": [],
            "archived": []
        }
        
        try:
            # Regular backups
            for filename in sorted(os.listdir(self.backup_dir), reverse=True):
                if filename.endswith('.json'):
                    filepath = os.path.join(self.backup_dir, filename)
                    file_size = os.path.getsize(filepath)
                    file_mtime = os.path.getmtime(filepath)
                    created_at = datetime.fromtimestamp(file_mtime).isoformat()
                    
                    all_backups["regular"].append({
                        "filename": filename,
                        "size_bytes": file_size,
                        "size_mb": round(file_size / (1024 * 1024), 2),
                        "created_at": created_at,
                        "type": "regular"
                    })
            
            # Archived backups (zips)
            for filename in sorted(os.listdir(self.archived_dir), reverse=True):
                if filename.endswith('.zip'):
                    filepath = os.path.join(self.archived_dir, filename)
                    file_size = os.path.getsize(filepath)
                    file_mtime = os.path.getmtime(filepath)
                    created_at = datetime.fromtimestamp(file_mtime).isoformat()
                    
                    # Count files in zip
                    try:
                        with zipfile.ZipFile(filepath, 'r') as zf:
                            file_count = len(zf.namelist())
                    except:
                        file_count = 0
                    
                    all_backups["archived"].append({
                        "filename": filename,
                        "size_bytes": file_size,
                        "size_mb": round(file_size / (1024 * 1024), 2),
                        "created_at": created_at,
                        "type": "archived",
                        "file_count": file_count
                    })
        
        except Exception as e:
            print(f"Error listing backups: {e}")
        
        return all_backups
    
    def extract_from_archive(self, archive_name: str, backup_filename: str) -> bytes:
        """
        Extract a single backup file from an archive and return contents
        """
        try:
            archive_path = os.path.join(self.archived_dir, archive_name)
            
            if not os.path.exists(archive_path):
                raise Exception("Archive not found")
            
            with zipfile.ZipFile(archive_path, 'r') as zf:
                if backup_filename not in zf.namelist():
                    raise Exception("Backup file not found in archive")
                
                return zf.read(backup_filename)
        
        except Exception as e:
            print(f"Error extracting from archive: {e}")
            raise
    
    async def start(self):
        """Start the backup scheduler loop"""
        self.running = True
        config = self.load_config()
        interval = config.get("backup_interval_minutes", 10) * 60
        
        print(f"🔄 Backup scheduler started (interval: {config.get('backup_interval_minutes')} minutes)")
        
        try:
            while self.running:
                try:
                    # Create scheduled backup
                    self.create_backup()
                    
                    # Cleanup old backups
                    self.cleanup_old_backups()
                    
                except Exception as e:
                    print(f"Error in backup scheduler loop: {e}")
                
                # Wait for next interval
                await asyncio.sleep(interval)
        
        except asyncio.CancelledError:
            print("🛑 Backup scheduler stopped")
            self.running = False
    
    async def stop(self):
        """Stop the backup scheduler"""
        self.running = False


# Global backup scheduler instance
backup_scheduler = BackupScheduler()
