import { TileParser } from "@/core/tileParser";

const parser = await new TileParser("./src/tileset/tiles/0_0.png").init();

// await parser.writeTile(parser.tiles[0], "./src/tileset/tiles/0.png");
parser.convertToTransparent("./src/tileset/tiles/0_0.png").then((tile) => {
    tile.write("./src/tileset/tiles/0.png");
});