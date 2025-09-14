#!/usr/bin/env python3
"""
Simple test script for database service functionality.
This script tests only the database service without importing the full pipeline.
"""

import sys
import os
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

def test_database_service_basic():
    """Test basic database service functionality."""
    print("🧪 Testing Database Service (Basic)...")
    
    try:
        from app.services.database_service import DatabaseService
        
        # Test database initialization
        db_service = DatabaseService()
        print(f"✅ Database initialized at: {db_service.db_path}")
        
        # Test database stats
        stats = db_service.get_database_stats()
        print(f"✅ Database stats: {stats}")
        
        # Test storing sample text
        row_id = db_service.store_extracted_text(
            "test_file.pdf", 
            1, 
            "This is a test page content for testing the database integration."
        )
        print(f"✅ Stored test text with ID: {row_id}")
        
        # Test retrieving the stored text
        pages = db_service.get_file_pages("test_file.pdf")
        print(f"✅ Retrieved {len(pages)} pages for test file")
        
        # Test search functionality
        search_results = db_service.search_text("test page content")
        print(f"✅ Search found {len(search_results)} results")
        
        print("✅ Database service tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing database operations: {e}")
        return False


def test_database_utils():
    """Test database utility functions."""
    print("\n🧪 Testing Database Utilities...")
    
    try:
        from app.services.database_service import DatabaseService
        
        db_service = DatabaseService()
        
        # Test database stats method
        db_stats = db_service.get_database_stats()
        print(f"✅ Database stats retrieved: {db_stats}")
        
        # Test search method
        search_results = db_service.search_text("test")
        print(f"✅ Search through database: {len(search_results)} results")
        
        print("✅ Database utilities tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing database utilities: {e}")
        return False


def main():
    """Run all tests."""
    print("🚀 Starting Simple Database Tests\n")
    
    tests = [
        test_database_service_basic,
        test_database_utils
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                print(f"❌ Test {test.__name__} failed")
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Database integration is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
    
    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 