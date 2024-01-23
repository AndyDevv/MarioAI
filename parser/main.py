import os
from PIL import Image

# Parameters
tile_width = 16
tile_height = 16
tile_gap = 1
image_path = './src/tileset/mario_tileset.png'

# Open the image
image = Image.open(image_path)
image_width, image_height = image.size

# Calculate the number of tiles in each dimension
tiles_across = (image_width + tile_gap) // (tile_width + tile_gap)
tiles_down = (image_height + tile_gap) // (tile_height + tile_gap)
print(f'Tiles across: {tiles_across}')
print(f'Tiles down: {tiles_down}')
# List to hold the tiles
tiles = []

# Extract tiles
for y in range(tiles_down):
    for x in range(tiles_across):
        left = x * (tile_width + tile_gap)
        upper = y * (tile_height + tile_gap)
        right = left + tile_width
        lower = upper + tile_height
        print(f'({left}, {upper}, {right}, {lower})')
        # Make sure the bounds do not exceed the image's bounds
        if right <= image_width and lower <= image_height:
            tile = image.crop((left, upper, right, lower))
            tiles.append(tile)

# Save the tiles to check if they are extracted correctly
output_dir = './src/tileset/tiles'
os.makedirs(output_dir, exist_ok=True)

for idx, tile in enumerate(tiles):
    tile_path = os.path.join(output_dir, f'tile_{idx:03}.png')
    tile.save(tile_path)

# Return the number of extracted tiles and path to the first tile to check
len(tiles), tiles[0].size, os.path.join(output_dir, 'tile_000.png')
