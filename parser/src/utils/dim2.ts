export class Dim2 {
    private width_: number;
    private height_: number;

    constructor(width: number, height: number) {
        this.width_ = width;
        this.height_ = height;
    }

    get width(): number {
        return this.width_;
    }

    get height(): number {
        return this.height_;
    }

    set size(size: [number, number]) {
        this.width_ = size[0];
        this.height_ = size[1];
    }

    scale(factor: number): Dim2 {
        return new Dim2(this.width_ * factor, this.height_ * factor);
    }
}