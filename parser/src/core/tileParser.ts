import { type Tile, TILE } from "@/constants";
import Jimp from 'jimp';
import { Dim2 } from "@/utils";
import { promises as fs } from 'fs';

export class TileParser {
    public tiles: Jimp[] = [];

    private path: string;
    private image: Jimp;
    private size: Dim2;
    private tileDir: string;

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
                const left = x * (TILE.WIDTH + TILE.GAP);
                const top = y * (TILE.HEIGHT + TILE.GAP);
                const right = left + TILE.WIDTH;
                const bottom = top + TILE.HEIGHT;

                console.log(`(${left}, ${top}, ${right}, ${bottom})`);

                if (right <= this.size.width && bottom <= this.size.height) {
                    const tile = this.image.clone().crop(left, top, TILE.WIDTH, TILE.HEIGHT);

                    this.tiles.push(tile);
                }
            }
        }
        console.log(this.tiles.length);
        return this;
    }

    public async writeTile(tile: Jimp, path: string) {
        await fs.mkdir(this.tileDir, { recursive: true });

        await tile.writeAsync(path);
    }
}