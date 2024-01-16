/**
 * http://wiki.nesdev.com/w/index.php/PPU_nametables
 */
class NameTable {
  public data: Uint8Array;
  public mirrors: number[][];

  constructor() {
    this.data = new Uint8Array(2048).fill(0x00);
    // http://wiki.nesdev.com/w/index.php/Mirroring
    this.mirrors = [
      [0, 0, 1, 1], // Horizontal
      [0, 1, 0, 1], // Vertical
      [0, 0, 0, 0], // Single screen
      [1, 1, 1, 1], // Single screen 2
      [0, 1, 2, 3] // 4 Screen
    ];
  }

  flush() {
    this.data.fill(0x00);
  }

  _resolve(mode: number, address: number) {
    address %= 0x1000;

    return this.mirrors[mode][address / 0x400] * 0x400 + (address % 0x400);
  }

  read8(mode: number, address: number) {
    return this.data[this._resolve(mode, address)];
  }

  write8(mode: number, address: number, value: number) {
    this.data[this._resolve(mode, address)] = value;
  }
}

/**
 * Color lookup table
 * 8 palettes of 4 colors
 */
class PaletteTable {
  public data: Uint8Array;

  constructor() {
    this.data = new Uint8Array(32).fill(0x00);
  }

  flush() {
    this.data.fill(0x00);
  }

  write8(address: number, value: number) {
    address %= 32;

    // Each 4th byte of the palettes are mirrored into each other
    // $3F10/$3F14/$3F18/$3F1C == $3F00/$3F04/$3F08/$3F0C
    if (address % 4 === 0 && address >= 16) {
      address -= 16;
    }

    this.data[address] = value;
  }

  read8(address: number) {
    address %= 32;

    if (address % 4 === 0 && address >= 16) {
      address -= 16;
    }
    return this.data[address];
  }
}

/**
 *
 *   Aka. VRAM
 *
 *   CHR: 0x0000 => 0x2000
 *   Nametable: 0x2000 => 0x3f00
 *   Background palette: 0x3F00 => 0x3F10
 *   Sprite palette: 0x3F00 => 0x3F20
 *
 */
class PPUMemory {
  public paletteTable: PaletteTable;
  public oam: Uint8Array;
  public nameTable: NameTable;
  public mapper: any;

  constructor() {
    this.paletteTable = new PaletteTable();

    // https://wiki.nesdev.com/w/index.php/PPU_OAM
    // Max 64 sprites
    // Byte 0 => Y position
    // Byte 1 => Bank nbr (address in mapper)
    // Byte 2 => Attributes (priority, hori. vert. switch)
    // Byte 3 => X position
    this.oam = new Uint8Array(256).fill(0x00);
    this.nameTable = new NameTable();
    this.mapper = null;
  }

  flush() {
    this.paletteTable.flush();
    this.oam.fill(0x00);
    this.nameTable.flush();
  }

  write8(address: number, value: number) {
    address %= 0x4000;

    if (address < 0x2000) {
      this.mapper.write8(address, value);
    } else if (address < 0x3f00) {
      this.nameTable.write8(this.mapper.mirrorType, address, value);
    } else if (address < 0x4000) {
      this.paletteTable.write8(address, value);
    } else {
      throw new Error("Unknown PPU addr " + address);
    }
  }

  readNametable(address: number) {
    address %= 0x4000;
    return this.nameTable.read8(this.mapper.mirrorType, address);
  }

  read8(address: number) {
    address %= 0x4000;

    if (address < 0x2000) {
      return this.mapper.read8(address);
    } else if (address < 0x3f00) {
      return this.nameTable.read8(this.mapper.mirrorType, address);
    } else if (address < 0x4000) {
      this.paletteTable.read8(address);
    } else {
      throw new Error(`Unknown PPU addr ${address}`);
    }
  }
}

export default PPUMemory;
