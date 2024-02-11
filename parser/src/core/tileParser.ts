import { TILE } from "@/constants";
import Jimp from 'jimp';
import { Dim2 } from "@/utils";
import { promises as fs } from 'fs';

export class TileParser {
    public tiles: Jimp[] = [];

    private path: string;
    private image: Jimp;
    private size: Dim2;
    private tileDir: string;

    static tileBackground: string = '#6ec160';

    public constructor(path: string) {
        this.path = path;

        this.tileDir = './src/tileset/tiles';
    }

    public async init() {
        this.image = await Jimp.read(this.path);

        this.size = new Dim2(this.image.bitmap.width, this.image.bitmap.height);

        const tilesAcross = Math.floor((this.size.width + TILE.GAP) / (TILE.WIDTH + TILE.GAP));
        const tilesDown = Math.floor((this.size.height + TILE.GAP) / (TILE.HEIGHT + TILE.GAP));

        // Extract tiles
        for (let y = 0; y < tilesDown; y++) {
            for (let x = 0; x < tilesAcross; x++) {
                const left = x * (TILE.WIDTH + TILE.GAP) + TILE.GAP;
                const top = y * (TILE.HEIGHT + TILE.GAP) + TILE.GAP;
                const right = left + TILE.WIDTH;
                const bottom = top + TILE.HEIGHT;

                // console.log(`(${left}, ${top}, ${right}, ${bottom})`);

                if (right <= this.size.width && bottom <= this.size.height) {
                    const tile = this.image.clone().crop(left, top, TILE.WIDTH, TILE.HEIGHT);
                    // const targetColor = Jimp.cssColorToHex(TileParser.tileBackground); // Convert CSS color to Jimp hex color

                    // tile.scan(0, 0, tile.bitmap.width, tile.bitmap.height, function (x, y, idx) {
                    //     const currentColor = this.getPixelColor(x, y);
                    //     console.log(x, y);
                    //     if (currentColor === targetColor) {

                    //         this.setPixelColor(0x00000000, x, y);
                    //     }
                    // });

                    this.tiles.push(tile);
                }
            }
        }
        // console.log(this.tiles.length);
        return this;
    }

    public async convertToTransparent(path: string) {
        const tile = await Jimp.read(path);

        const targetColor = Jimp.cssColorToHex(TileParser.tileBackground); // Convert CSS color to Jimp hex color

        tile.scan(0, 0, tile.bitmap.width, tile.bitmap.height, function (x, y, idx) {
            const currentColor = this.getPixelColor(x, y);
            console.log(x, y);
            if (currentColor === targetColor) {

                this.setPixelColor(0x00000000, x, y);
            }
        });

        return tile;
    }

    public async writeTile(tile: Jimp, path: string) {
        await fs.mkdir(this.tileDir, { recursive: true });

        await tile.writeAsync(path);
    }
}
