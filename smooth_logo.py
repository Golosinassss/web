import sys
from PIL import Image, ImageFilter

def smooth_logo(blur_radius=1.5, threshold=128):
    try:
        # Load the transparent logo
        img = Image.open('logo-golosinassss.png').convert('RGBA')
        r, g, b, alpha = img.split()
        
        # 1. Binarize alpha channel at a high threshold to clean up fuzzy edges
        bin_alpha = alpha.point(lambda p: 255 if p > 150 else 0)
        
        # 2. Apply Gaussian blur to smooth out wobbly details
        blurred = bin_alpha.filter(ImageFilter.GaussianBlur(radius=blur_radius))
        
        # 3. Re-threshold to get a clean, smoothed boundary
        smooth_alpha = blurred.point(lambda p: 255 if p > threshold else 0)
        
        # 4. Make the RGB solid white so there are no gray colors in the core
        white = Image.new('L', img.size, 255)
        
        # Merge back
        final_img = Image.merge('RGBA', (white, white, white, smooth_alpha))
        final_img.save('logo-golosinassss.png')
        print(f"Success: Smoothed logo with blur_radius={blur_radius}, threshold={threshold}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    blur = 1.5
    thresh = 128
    if len(sys.argv) > 1:
        blur = float(sys.argv[1])
    if len(sys.argv) > 2:
        thresh = int(sys.argv[2])
    smooth_logo(blur, thresh)
