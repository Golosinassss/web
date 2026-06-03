import sys
import json
import numpy as np
from PIL import Image

def generate_ascii(cols=180, char_aspect=0.48):
    # Load the smoothed logo image
    img = Image.open('logo-golosinassss.png').convert('RGBA')
    w, h = img.size
    
    # Calculate rows based on columns and character aspect ratio
    rows = int(cols * (h / w) * char_aspect)
    print(f"Generating ASCII logo: {cols} columns x {rows} rows")
    
    # Resize image to target grid size
    small = img.resize((cols, rows), Image.LANCZOS)
    arr = np.array(small)
    
    R, G, B, A = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]
    brightness = (R.astype(int) + G.astype(int) + B.astype(int)) / 3
    
    # A pixel is active if it is bright and opaque enough
    is_active = (brightness > 120) & (A > 100)
    
    lines = []
    for r in range(rows):
        line_chars = []
        for c in range(cols):
            if not is_active[r, c]:
                line_chars.append(' ')
            else:
                # Check neighbors to identify if it is an edge/border
                is_edge = False
                
                # Check 8-neighborhood
                for dr in [-1, 0, 1]:
                    for dc in [-1, 0, 1]:
                        nr, nc = r + dr, c + dc
                        # If neighbor is out of bounds or inactive, it is an edge
                        if nr < 0 or nr >= rows or nc < 0 or nc >= cols:
                            is_edge = True
                            break
                        if not is_active[nr, nc]:
                            is_edge = True
                            break
                    if is_edge:
                        break
                
                if is_edge:
                    line_chars.append('*')
                else:
                    line_chars.append('.')
        lines.append(''.join(line_chars))
        
    # Trim empty lines at start and end
    while lines and lines[-1].strip() == '':
        lines.pop()
    while lines and lines[0].strip() == '':
        lines.pop(0)
        
    # Save as JSON and text
    with open('logo-ascii.json', 'w', encoding='utf-8') as f:
        json.dump(lines, f, ensure_ascii=False)
        
    with open('logo-ascii.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
        
    print(f"Generated ASCII logo with {len(lines)} lines of {cols} columns.")
    print("Sample lines:")
    for l in lines[:3]:
        print(l[:80] + "...")

if __name__ == '__main__':
    cols = 160
    aspect = 0.48
    if len(sys.argv) > 1:
        cols = int(sys.argv[1])
    if len(sys.argv) > 2:
        aspect = float(sys.argv[2])
    generate_ascii(cols, aspect)
