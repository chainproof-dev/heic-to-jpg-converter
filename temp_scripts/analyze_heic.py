#!/usr/bin/env python3
"""
HEIC Image Analyzer Script
Extracts metadata, fingerprints, and generates preview info for HEIC sample files.
"""

import os
import json
import hashlib
import shutil
from pathlib import Path
from datetime import datetime

# Source and destination paths
SOURCE_DIR = Path(r"C:\Users\RDP\Downloads\childrens-show-theater")
PROJECT_DIR = Path(r"C:\Users\RDP\Downloads\project")
SAMPLES_DIR = PROJECT_DIR / "samples"
IMAGES_DIR = SAMPLES_DIR / "images"

# Image naming mapping - clean URL-friendly names
IMAGE_MAPPING = {
    "Regolith Samples 1.HEIC": {
        "new_name": "regolith-samples.heic",
        "title": "Regolith Samples",
        "description": "Abstract textured surface sample with natural patterns",
        "category": "abstract"
    },
    "alpha_1440x960.heic": {
        "new_name": "alpha-transparency-test.heic",
        "title": "Alpha Transparency Test",
        "description": "HEIC image with alpha channel transparency",
        "category": "technical"
    },
    "chef-with-trumpet.heic": {
        "new_name": "chef-with-trumpet.heic",
        "title": "Chef with Trumpet",
        "description": "Artistic photo of a chef figurine holding a trumpet",
        "category": "artistic"
    },
    "childrens-show-theater.heic": {
        "new_name": "childrens-theater-show.heic",
        "title": "Children's Theater Show",
        "description": "Live performance at a children's theater venue",
        "category": "events"
    },
    "classic-car.heic": {
        "new_name": "classic-vintage-car.heic",
        "title": "Classic Vintage Car",
        "description": "Beautifully preserved classic automobile",
        "category": "vehicles"
    },
    "greyhounds-looking-for-a-table.heic": {
        "new_name": "greyhounds-restaurant.heic",
        "title": "Greyhounds at Restaurant",
        "description": "Elegant greyhound dogs looking for a table",
        "category": "animals"
    },
    "grid_960x640.heic": {
        "new_name": "grid-pattern-test.heic",
        "title": "Grid Pattern Test",
        "description": "Technical grid pattern for testing image rendering",
        "category": "technical"
    },
    "image1.heic": {
        "new_name": "sample-image-01.heic",
        "title": "Sample Image 01",
        "description": "High-quality HEIC sample photograph",
        "category": "samples"
    },
    "image2.heic": {
        "new_name": "sample-image-02.heic",
        "title": "Sample Image 02",
        "description": "High-quality HEIC sample photograph",
        "category": "samples"
    },
    "image3.heic": {
        "new_name": "sample-image-03.heic",
        "title": "Sample Image 03",
        "description": "High-quality HEIC sample photograph",
        "category": "samples"
    },
    "overlay_1000x680.heic": {
        "new_name": "overlay-composition-test.heic",
        "title": "Overlay Composition Test",
        "description": "HEIC image with overlay composition layers",
        "category": "technical"
    },
    "random_collection_1440x960.heic": {
        "new_name": "random-collection.heic",
        "title": "Random Collection",
        "description": "Curated collection of random visual elements",
        "category": "artistic"
    },
    "season_collection_1440x960.heic": {
        "new_name": "seasonal-collection.heic",
        "title": "Seasonal Collection",
        "description": "Seasonal themed visual collection",
        "category": "artistic"
    },
    "sewing-threads.heic": {
        "new_name": "sewing-threads-colorful.heic",
        "title": "Colorful Sewing Threads",
        "description": "Vibrant arrangement of colorful sewing threads",
        "category": "objects"
    },
    "shelf-christmas-decoration.heic": {
        "new_name": "christmas-decoration-shelf.heic",
        "title": "Christmas Decoration Shelf",
        "description": "Festive Christmas decorations arranged on a shelf",
        "category": "holidays"
    },
    "soundboard.heic": {
        "new_name": "audio-soundboard.heic",
        "title": "Audio Soundboard",
        "description": "Professional audio mixing soundboard equipment",
        "category": "technology"
    }
}

def calculate_fingerprints(file_path):
    """Calculate MD5 and SHA256 hashes for a file."""
    md5_hash = hashlib.md5()
    sha256_hash = hashlib.sha256()
    
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            md5_hash.update(chunk)
            sha256_hash.update(chunk)
    
    return {
        "md5": md5_hash.hexdigest(),
        "sha256": sha256_hash.hexdigest()
    }

def get_file_size_formatted(size_bytes):
    """Format file size in human-readable format."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"

def extract_heic_info(file_path):
    """Extract basic info from HEIC file without external dependencies."""
    file_size = os.path.getsize(file_path)
    
    # Try to extract resolution from filename if present
    filename = os.path.basename(file_path)
    resolution = None
    
    # Check for resolution patterns like _1440x960 or _960x640
    import re
    res_match = re.search(r'(\d{3,4})x(\d{3,4})', filename)
    if res_match:
        resolution = {
            "width": int(res_match.group(1)),
            "height": int(res_match.group(2))
        }
    
    return {
        "file_size_bytes": file_size,
        "file_size_formatted": get_file_size_formatted(file_size),
        "resolution": resolution
    }

def try_extract_with_pillow(file_path):
    """Try to extract image info using pillow-heif if available."""
    try:
        from pillow_heif import register_heif_opener
        from PIL import Image
        
        register_heif_opener()
        
        with Image.open(file_path) as img:
            return {
                "width": img.width,
                "height": img.height,
                "mode": img.mode,
                "format": img.format
            }
    except ImportError:
        return None
    except Exception as e:
        print(f"  Warning: Could not read with pillow-heif: {e}")
        return None

def process_images():
    """Process all HEIC images and generate metadata."""
    print("=" * 60)
    print("HEIC Image Analyzer")
    print("=" * 60)
    
    # Create directories
    SAMPLES_DIR.mkdir(exist_ok=True)
    IMAGES_DIR.mkdir(exist_ok=True)
    
    print(f"\nSource directory: {SOURCE_DIR}")
    print(f"Destination directory: {SAMPLES_DIR}")
    print(f"\nProcessing {len(IMAGE_MAPPING)} images...\n")
    
    metadata = {
        "generated_at": datetime.now().isoformat(),
        "total_images": 0,
        "total_size_bytes": 0,
        "images": []
    }
    
    for original_name, info in IMAGE_MAPPING.items():
        source_path = SOURCE_DIR / original_name
        
        if not source_path.exists():
            print(f"⚠ SKIP: {original_name} (not found)")
            continue
        
        print(f"Processing: {original_name}")
        
        # Copy file with new name
        dest_path = IMAGES_DIR / info["new_name"]
        shutil.copy2(source_path, dest_path)
        print(f"  → Copied to: {info['new_name']}")
        
        # Extract file info
        file_info = extract_heic_info(source_path)
        print(f"  → Size: {file_info['file_size_formatted']}")
        
        # Try to get resolution with pillow-heif
        pillow_info = try_extract_with_pillow(source_path)
        if pillow_info:
            file_info["resolution"] = {
                "width": pillow_info["width"],
                "height": pillow_info["height"]
            }
            print(f"  → Resolution: {pillow_info['width']}x{pillow_info['height']}")
        elif file_info.get("resolution"):
            print(f"  → Resolution (from filename): {file_info['resolution']['width']}x{file_info['resolution']['height']}")
        
        # Calculate fingerprints
        fingerprints = calculate_fingerprints(source_path)
        print(f"  → MD5: {fingerprints['md5'][:16]}...")
        print(f"  → SHA256: {fingerprints['sha256'][:16]}...")
        
        # Build image metadata
        image_data = {
            "id": info["new_name"].replace(".heic", "").replace("-", "_"),
            "original_name": original_name,
            "filename": info["new_name"],
            "title": info["title"],
            "description": info["description"],
            "category": info["category"],
            "file_size_bytes": file_info["file_size_bytes"],
            "file_size_formatted": file_info["file_size_formatted"],
            "resolution": file_info.get("resolution"),
            "fingerprints": fingerprints,
            "download_path": f"/samples/images/{info['new_name']}"
        }
        
        metadata["images"].append(image_data)
        metadata["total_images"] += 1
        metadata["total_size_bytes"] += file_info["file_size_bytes"]
        
        print()
    
    # Add total size formatted
    metadata["total_size_formatted"] = get_file_size_formatted(metadata["total_size_bytes"])
    
    # Save metadata
    metadata_path = SAMPLES_DIR / "metadata.json"
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    print("=" * 60)
    print(f"✓ Processed {metadata['total_images']} images")
    print(f"✓ Total size: {metadata['total_size_formatted']}")
    print(f"✓ Metadata saved to: {metadata_path}")
    print("=" * 60)
    
    return metadata

if __name__ == "__main__":
    process_images()
