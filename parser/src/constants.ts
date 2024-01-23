export const TILE = {
    WIDTH: 16,
    HEIGHT: 16,
    GAP: 1,
    get FULL_WIDTH(): number {
        return this.WIDTH + (this.GAP * 2);
    },
    get FULL_HEIGHT(): number {
        return this.HEIGHT + (this.GAP * 2);
    }
} as const

export interface Tile {
    x: number;
    y: number;
    image: Buffer;
    // type: string; // any type of block
}