"""
Test script to verify the configuration system is working correctly.
"""
import sys
from pathlib import Path

# Add the parent directory to the path so we can import our package
sys.path.append(str(Path(__file__).parent))

# Import the config module - this will load the .env file
from app import config

def test_config_loading():
    """Test that the configuration was loaded correctly."""
    print("\n=== Testing Configuration Loading ===")
    print(f"Using Hugging Face model: {config.settings.HUGGINGFACE_MODEL}")
    print(f"Chunk size: {config.settings.CHUNK_SIZE}")
    print(f"Chunk overlap: {config.settings.CHUNK_OVERLAP}")
    print(f"ChromaDB path: {config.settings.CHROMA_DB_PATH}")
    print(f"Chroma collection: {config.settings.CHROMA_COLLECTION_NAME}")
    print("Configuration loaded successfully!")
    return True

if __name__ == "__main__":
    try:
        test_config_loading()
    except Exception as e:
        print(f"Error: {str(e)}")
        print("\nPlease make sure you have a .env file in the Backend directory")
        print("with the required environment variables. See .env.example")
        print("for a template.")
        sys.exit(1)
