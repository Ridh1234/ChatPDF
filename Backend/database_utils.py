#!/usr/bin/env python3
"""
Database utility script for maintenance operations.
Provides functions for database cleanup, backup, and health checks.
"""

import sys
import os
import shutil
from pathlib import Path
from datetime import datetime, timedelta
import argparse

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.services.database_service import DatabaseService


def backup_database(db_path: str, backup_dir: str = None):
    """
    Create a backup of the database.
    
    Args:
        db_path: Path to the database file
        backup_dir: Directory to store backups (default: same directory as db)
    """
    db_path = Path(db_path)
    
    if not db_path.exists():
        print(f"❌ Database not found: {db_path}")
        return False
    
    if backup_dir is None:
        backup_dir = db_path.parent / "backups"
    else:
        backup_dir = Path(backup_dir)
    
    # Create backup directory if it doesn't exist
    backup_dir.mkdir(parents=True, exist_ok=True)
    
    # Create backup filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"{db_path.stem}_backup_{timestamp}{db_path.suffix}"
    backup_path = backup_dir / backup_filename
    
    try:
        # Copy database file
        shutil.copy2(db_path, backup_path)
        print(f"✅ Database backed up to: {backup_path}")
        
        # Get backup file size
        backup_size = backup_path.stat().st_size
        print(f"📊 Backup size: {backup_size / (1024 * 1024):.2f} MB")
        
        return True
        
    except Exception as e:
        print(f"❌ Backup failed: {e}")
        return False


def cleanup_old_records(db_path: str, days_old: int = 30):
    """
    Clean up old records from the database.
    
    Args:
        db_path: Path to the database file
        days_old: Remove records older than this many days
    """
    try:
        db_service = DatabaseService(db_path)
        
        # Get stats before cleanup
        stats_before = db_service.get_database_stats()
        print(f"📊 Before cleanup: {stats_before['total_records']} records")
        
        # Perform cleanup
        deleted_count = db_service.cleanup_old_records(days_old)
        
        if deleted_count > 0:
            print(f"🧹 Cleaned up {deleted_count} records older than {days_old} days")
            
            # Get stats after cleanup
            stats_after = db_service.get_database_stats()
            print(f"📊 After cleanup: {stats_after['total_records']} records")
            
            # Calculate space saved
            space_saved = stats_before['database_size_bytes'] - stats_after['database_size_bytes']
            print(f"💾 Space saved: {space_saved / (1024 * 1024):.2f} MB")
        else:
            print(f"ℹ️  No records older than {days_old} days found")
        
        return True
        
    except Exception as e:
        print(f"❌ Cleanup failed: {e}")
        return False


def show_database_info(db_path: str):
    """
    Display comprehensive database information.
    
    Args:
        db_path: Path to the database file
    """
    try:
        db_service = DatabaseService(db_path)
        stats = db_service.get_database_info()
        
        if "error" in stats:
            print(f"❌ Failed to get database info: {stats['error']}")
            return False
        
        print("📊 Database Information")
        print("=" * 50)
        print(f"Database Path: {stats['database_path']}")
        print(f"Total Records: {stats['total_records']:,}")
        print(f"Total Files: {stats['total_files']:,}")
        print(f"Total Pages: {stats['total_pages']:,}")
        print(f"Database Size: {stats['database_size_mb']:.2f} MB")
        print(f"Average Pages per File: {stats['total_pages'] / stats['total_files']:.1f}" if stats['total_files'] > 0 else "Average Pages per File: 0")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to get database info: {e}")
        return False


def search_database(db_path: str, query: str, limit: int = 50):
    """
    Search the database for specific text.
    
    Args:
        db_path: Path to the database file
        query: Text to search for
        limit: Maximum number of results
    """
    try:
        db_service = DatabaseService(db_path)
        results = db_service.search_text(query, limit)
        
        print(f"🔍 Search Results for: '{query}'")
        print("=" * 50)
        print(f"Total Results: {len(results)}")
        print()
        
        for i, result in enumerate(results[:limit], 1):
            print(f"{i}. File: {result['file_name']}")
            print(f"   Page: {result['page_number']}")
            print(f"   Date: {result['created_at']}")
            print(f"   Content Preview: {result['text_content'][:100]}...")
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ Search failed: {e}")
        return False


def main():
    """Main function to handle command line arguments."""
    parser = argparse.ArgumentParser(
        description="Database utility script for PDF extraction pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python database_utils.py --info
  python database_utils.py --backup
  python database_utils.py --cleanup --days 30
  python database_utils.py --search "invoice number" --limit 20
  python database_utils.py --backup --backup-dir /path/to/backups
        """
    )
    
    parser.add_argument(
        "--db-path", 
        default="app/documents.db",
        help="Path to the database file (default: app/documents.db)"
    )
    
    parser.add_argument(
        "--info", 
        action="store_true",
        help="Show database information and statistics"
    )
    
    parser.add_argument(
        "--backup", 
        action="store_true",
        help="Create a backup of the database"
    )
    
    parser.add_argument(
        "--backup-dir",
        help="Directory to store backups (default: same directory as database)"
    )
    
    parser.add_argument(
        "--cleanup", 
        action="store_true",
        help="Clean up old records from the database"
    )
    
    parser.add_argument(
        "--days", 
        type=int, 
        default=30,
        help="Age in days for cleanup (default: 30)"
    )
    
    parser.add_argument(
        "--search",
        help="Search for text in the database"
    )
    
    parser.add_argument(
        "--limit", 
        type=int, 
        default=50,
        help="Maximum number of search results (default: 50)"
    )
    
    args = parser.parse_args()
    
    # Validate database path
    db_path = Path(args.db_path)
    if not db_path.exists() and not args.backup:
        print(f"❌ Database not found: {db_path}")
        print("💡 Use --backup to create a new database")
        return 1
    
    success = True
    
    # Show database info
    if args.info:
        success &= show_database_info(str(db_path))
    
    # Create backup
    if args.backup:
        success &= backup_database(str(db_path), args.backup_dir)
    
    # Cleanup old records
    if args.cleanup:
        success &= cleanup_old_records(str(db_path), args.days)
    
    # Search database
    if args.search:
        success &= search_database(str(db_path), args.search, args.limit)
    
    # If no specific action specified, show info
    if not any([args.info, args.backup, args.cleanup, args.search]):
        success &= show_database_info(str(db_path))
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main()) 