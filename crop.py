from PIL import Image
img = Image.open('public/logo.png')
# getbbox() works on the alpha channel if it's RGBA and there's full transparency
bbox = img.getbbox()
if bbox:
    cropped = img.crop(bbox)
    cropped.save('public/logo.png')
    print(f"Cropped from {img.size} to {cropped.size}")
else:
    print("No bounding box found (maybe no alpha channel?)")
