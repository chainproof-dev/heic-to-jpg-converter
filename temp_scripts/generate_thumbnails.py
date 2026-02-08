import os
import subprocess
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install pillow pillow-heif")
    exit(1)

# Configuration
SOURCE_DIR = Path(r"C:\Users\RDP\Downloads\project\samples\images")
OUTPUT_DIR = Path(r"C:\Users\RDP\Downloads\project\samples\previews")
THUMBNAIL_SIZE = (400, 300)  # Max width x height
JPEG_QUALITY = 85

def create_fallback_thumbnail(output_path, text):
    """Create a fallback thumbnail image with text."""
    try:
        img = Image.new('RGB', THUMBNAIL_SIZE, color=(240, 240, 240))
        d = ImageDraw.Draw(img)
        
        # Try to load a font, fallback to default
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except IOError:
            font = ImageFont.load_default()
        
        # Draw centered text (simple approximation)
        text = "Preview\nUnavailable"
        d.text((THUMBNAIL_SIZE[0]/2, THUMBNAIL_SIZE[1]/2), text, fill=(100, 100, 100), anchor="mm", align="center", font=font)
        
        img.save(output_path, 'JPEG', quality=JPEG_QUALITY)
        print(f"  ⚠ Created fallback: {output_path.name}")
    except Exception as e:
        print(f"  ✗ Failed to create fallback: {e}")

def convert_with_magick(input_path, output_path):
    """Try to convert using ImageMagick CLI."""
    try:
        # Use [0] to select the first frame/image in the HEIC container
        cmd = [
            "magick", 
            f"{input_path}[0]", 
            "-resize", f"{THUMBNAIL_SIZE[0]}x{THUMBNAIL_SIZE[1]}", 
            "-quality", str(JPEG_QUALITY),
            str(output_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0 and output_path.exists():
            print(f"  ✓ Created (magick): {output_path.name}")
            return True
        else:
            print(f"  ✗ Magick failed: {result.stderr}")
            return False
    except FileNotFoundError:
        print("  ✗ Magick not found")
        return False
    except Exception as e:
        print(f"  ✗ Magick error: {e}")
        return False

def generate_thumbnails():
    """Generate JPG thumbnails from all HEIC files."""
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Get all HEIC files
    heic_files = list(SOURCE_DIR.glob("*.heic"))
    print(f"Found {len(heic_files)} HEIC files to process")
    
    success_count = 0
    error_count = 0
    
    for heic_path in heic_files:
        try:
            # Generate output filename (same name but .jpg)
            output_name = heic_path.stem + ".jpg"
            output_path = OUTPUT_DIR / output_name
            
            print(f"Processing: {heic_path.name} -> {output_name}")
            
            if output_path.exists():
                print(f"  ✓ Skipped (exists): {output_name}")
                success_count += 1
                continue

            # Open HEIC and convert
            with Image.open(heic_path) as img:
                print(f"  - Mode: {img.mode}, Size: {img.size}")
                # Convert to RGB (HEIC may have alpha channel)
                if img.mode in ('RGBA', 'LA', 'P'):
                    # Create white background for transparency
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Create thumbnail (maintains aspect ratio)
                img.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
                
                # Save as JPEG
                img.save(output_path, 'JPEG', quality=JPEG_QUALITY, optimize=True)
                
            success_count += 1
            print(f"  ✓ Created: {output_path.name} ({output_path.stat().st_size // 1024}KB)")
            
        except Exception as e:
            print(f"  ✗ Pillow Error: {e}")
            # Try Magick fallback
            if convert_with_magick(heic_path, output_path):
                success_count += 1
            else:
                error_count += 1
                create_fallback_thumbnail(output_path, heic_path.name)
    
    print(f"\n{'='*50}")
    print(f"Thumbnail generation complete!")
    print(f"  Success: {success_count}")
    print(f"  Errors: {error_count}")
    print(f"  Output: {OUTPUT_DIR}")

if __name__ == "__main__":
    generate_thumbnails()
