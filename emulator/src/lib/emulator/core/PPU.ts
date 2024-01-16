import PPUMemory from "./PPUMemory";
import type ROM from "./ROM";

import {
  INTERRUPTS,
  RENDERING_MODES,
  COLORS,
  SCANLINES,
  CYCLES
} from "./constants";

/**
 * Picture Processing Unit.
 * Handles graphics.
 */
class PPU {
  public memory: PPUMemory;
  public cycle: number;
  public cycleType: number;
  public scanline: number;
  public scanlineType: number;
  public interrupt: number;
  public v: number;
  public t: number;
  public y: number;
  public x: number;
  public w: number;
  public f: number;
  public register: number;
  public nmiOccurred: number;
  public nmiOutput: number | boolean;
  public backgroundTileBuffer: number[];
  public lowTileByte: number;
  public highTileByte: number;
  public attributeTableByte: number;
  public spriteCount: number;
  public sprites: any[];
  public registerRead: number;
  public registerBuffer: number;
  public fNameTable: number;
  public fIncrement: number;
  public fSpriteTable: number;
  public fBackgroundTable: number;
  public fSpriteSize: number;
  public fMasterSlave: number;
  public fGrayscale: number;
  public fShowLeftBackground: number;
  public fShowLeftSprites: number;
  public fShowBackground: number;
  public fShowSprites: number;
  public fRedTint: number;
  public fGreenTint: number;
  public fBlueTint: number;
  public fSpriteZeroHit: number;
  public fSpriteOverflow: number;
  public tmpOamAddress: number;
  public oamAddress: number;
  public bufferedData: number;
  public backgroundColor: number;
  public spriteColor: number;
  public spriteIndex: number;
  public isBackgroundPixel: boolean;
  public backgroundPixel: number;
  public spritePixel: number;
  public color: number;
  public frameReady: boolean;
  public patternTable1: Uint8Array;
  public patternTable2: Uint8Array;
  public oamTable: Uint8Array;
  public patternTablesColors: number[][];
  public renderingMode: any;
  public frameBuffer: Uint8Array;
  public frameBackgroundBuffer: Uint8Array;
  public frameSpriteBuffer: Uint8Array;
  public frameColorBuffer: Uint32Array;
  public tileData: number[];
  public lastRegisterValue: number;

  constructor() {
    this.memory = new PPUMemory();
    this.cycle = 0;
    this.cycleType = null;
    this.scanline = 261;
    this.scanlineType = null;
    this.interrupt = null;

    //
    // PPU registers
    // https://wiki.nesdev.com/w/index.php/PPU_scrolling#PPU_registers
    //

    // v & t are pointers used to point where to read & write to PPU memory (background)

    // current vram address (15 bit)
    this.v = 0;
    // temporary vram address (15 bit)
    // can also be thought of as the address of the top left onscreen tile.
    this.t = 0;
    // Y, used to help compute vram address
    this.y = 0;
    // fine x scroll (3 bit)
    this.x = 0;
    // write toggle (1 bit)
    this.w = 0;
    // even/odd frame flag (1 bit)
    this.f = 0;

    this.register = 0;

    // NMI flags (Non Maskable Interrupt) controls VBlank
    // https://wiki.nesdev.com/w/index.php/NMI
    this.nmiOccurred = 0;
    this.nmiOutput = 0;

    //
    // Containers holding bufferized data to display
    //

    // Background & Sprites temporary variables
    this.backgroundTileBuffer = [];
    this.lowTileByte = 0;
    this.highTileByte = 0;
    this.attributeTableByte = 0;
    this.spriteCount = 0;
    this.sprites = new Array(8);

    for (var i = 0; i < 8; i++) {
      this.sprites[i] = {
        buffer: [],
        x: null,
        priority: null,
        index: null
      };
    }

    //
    // Registers
    //

    this.registerRead = 0;
    this.registerBuffer = 0;

    // 0x2000 PPUCTRL
    // Current nametable 0: $2000; 1: $2400; 2: $2800; 3: $2C00
    this.fNameTable = 0;
    // Increment vram of 1 or 32
    this.fIncrement = 0;
    // 0x0000 or 0x1000 (ignored in 8x16 mode)
    this.fSpriteTable = 0;
    // 0x0000 or 0x1000
    this.fBackgroundTable = 0;
    // 8x8 or 8x16
    this.fSpriteSize = 0;
    // Unused yet ?
    this.fMasterSlave = 0;

    // 0x2001 PPUMASK
    this.fGrayscale = 0; // 0: color; 1: grayscale
    this.fShowLeftBackground = 0; // 0: hide; 1: show
    this.fShowLeftSprites = 0; // 0: hide; 1: show
    this.fShowBackground = 0; // 0: hide; 1: show
    this.fShowSprites = 0; // 0: hide; 1: show
    // Unused
    this.fRedTint = 0; // 0: normal; 1: emphasized
    this.fGreenTint = 0; // 0: normal; 1: emphasized
    this.fBlueTint = 0; // 0: normal; 1: emphasized

    // 0x2002 PPUSTATUS

    // Set if sprite 0 overlaps background pixel
    this.fSpriteZeroHit = 0;
    this.fSpriteOverflow = 0;

    // 0x2003 OAMADDR
    this.tmpOamAddress = 0;
    this.oamAddress = 0;

    // 0x2007 PPUDATA
    this.bufferedData = 0; // for buffered reads

    // Pixel rendering variables
    this.backgroundColor = 0;
    this.spriteColor = 0;
    this.spriteIndex = 0;
    this.isBackgroundPixel = true;
    this.backgroundPixel = 0;
    this.spritePixel = 0;
    this.color = 0;

    // Buffered data
    this.setRenderingMode(RENDERING_MODES.NORMAL);
    this.resetBuffers();

    this.frameReady = false;

    //
    // Debug data & variables
    //
    this.patternTable1 = new Uint8Array(160 * 160 * 4).fill(0xff);
    this.patternTable2 = new Uint8Array(160 * 160 * 4).fill(0xff); // 124 x 124 + 2px spacing
    this.oamTable = new Uint8Array(80 * 160 * 4); // 64 x 124 + 2 px spacing

    this.patternTablesColors = [
      [0xff, 0xff, 0xff],
      [0x33, 0x33, 0x33],
      [0xbf, 0xbf, 0xbf],
      [0x00, 0x00, 0x00]
    ];
  }

  /**
   * Utils methods
   */

  connectROM(rom: ROM) {
    this.memory.mapper = rom.mapper;
  }

  resetBuffers() {
    this.frameBuffer = new Uint8Array(256 * 240 * 4).fill(0x00);
    this.frameBackgroundBuffer = new Uint8Array(256 * 240 * 4).fill(0x00);
    this.frameSpriteBuffer = new Uint8Array(256 * 240 * 4).fill(0x00);
    this.frameColorBuffer = new Uint32Array(256 * 240).fill(0x00);
  }

  /**
   *  Used for debugging
   */

  _parsePatternTable(_from: number, to: number, patternTable: Uint8Array) {
    let value = null;
    let lowTileData = 0;
    let highTileData = 0;
    let v = 0;
    let i = _from;
    let y = 0;
    let z = 0;
    let s = 0;

    while (i < to) {
      lowTileData = this.memory.read8(i);
      highTileData = this.memory.read8(i + 8);

      z = 0;

      while (z < 8) {
        value = (((lowTileData >> z) & 1) << 1) + ((highTileData >> z) & 1);
        v = (i % 8) * 160; // Tmp vertical position
        v += y * 160; // Permanent vertical position;
        v += 7 - z; // Tmp horizontal position
        v += (s % 16) * 10; // Permanent horizontal position
        v *= 4; // RGBA

        patternTable[v] = this.patternTablesColors[value][0];
        patternTable[v + 1] = this.patternTablesColors[value][1];
        patternTable[v + 2] = this.patternTablesColors[value][2];
        patternTable[v + 3] = 0xff;

        z++;
      }

      if (i % 256 === 0 && i > _from) {
        y += 10; // 10 instead of 8 because need 2px spacing for display
      }

      i++;

      if (i % 8 === 0) {
        i += 8;
        s++;
      }
    }
    return patternTable;
  }

  getPatternTables() {
    return [
      this._parsePatternTable(0, 4096, this.patternTable1),
      this._parsePatternTable(4096, 8192, this.patternTable2)
    ];
  }

  getOamTable() {
    let tile, table, spriteSize, attributes, address, lowTileData, highTileData, tileShiftX, tileShiftY, tableY, value, v, isReversedVertically, isReversedHorizontally;

    tableY = 0;
    const SPRITE_COUNT = 64;
    const TILE_SIZE = 8;
    const BYTES_PER_TILE = 16;
    const SPRITES_PER_ROW = 8;
    const TILE_SHIFT = 80;
    const RGBA_CHANNELS = 4;
    const FULL_ALPHA = 0xff;

    // Not all sprites slots are used
    // We must flush it at each frame otherwhise we'll end up
    // with stale sprites
    this.oamTable.fill(FULL_ALPHA);

    for (let sprite = 0; sprite < SPRITE_COUNT; sprite++) {
      tile = this.memory.oam[sprite * 4 + 1];
      spriteSize = this.getSpriteSize();

      if (this.fSpriteSize === 0) {
        table = this.fSpriteTable;
      } else {
        table = tile & 1;
        tile = tile & 0xfe;
      }

      attributes = this.memory.oam[sprite * 4 + 2];
      address = 0x1000 * table + tile * TILE_SIZE;
      isReversedVertically = (attributes & 0x80) === 0x80;
      isReversedHorizontally = (attributes & 0x40) === 0x40;

      if (tile === 0) {
        // Unused sprite
        continue;
      }

      for (let tileY = 0; tileY < spriteSize; tileY++) {
        lowTileData = this.memory.read8(address);
        highTileData = this.memory.read8(address + BYTES_PER_TILE);
        tileShiftY = isReversedVertically ? spriteSize - 1 - tileY : tileY;

        for (let tileX = 0; tileX < TILE_SIZE; tileX++) {
          tileShiftX = isReversedHorizontally ? TILE_SIZE - 1 - tileX : tileX;
          value =
            ((lowTileData >> tileShiftX) & 1) |
            (((highTileData >> tileShiftX) & 1) << 1);
          v = tileShiftY * TILE_SHIFT;
          v += tableY * TILE_SHIFT;
          v += TILE_SIZE - 1 - tileX;
          v += (sprite % SPRITES_PER_ROW) * TILE_SIZE + (sprite % SPRITES_PER_ROW) * 2;
          v *= RGBA_CHANNELS;

          this.oamTable[v] = this.patternTablesColors[value][0];
          this.oamTable[v + 1] = this.patternTablesColors[value][1];
          this.oamTable[v + 2] = this.patternTablesColors[value][2];
          this.oamTable[v + 3] = FULL_ALPHA;
        }

        address++;

        if (this.fSpriteSize !== 0 && tileY === TILE_SIZE - 1) {
          tile++;
          address = 0x1000 * table + tile * TILE_SIZE;
        }
      }

      if (sprite % SPRITES_PER_ROW === 0 && sprite > 0) {
        tableY += 18;
      }
    }

    return this.oamTable;
  }

  /**
   * Init methods, configuration
   */

  reset() {
    // Clean dat shit
    this.memory.flush();
    this.cycle = 0;
    this.scanline = 261;
    this.v = 0;
    this.t = 0;
    this.x = 0;
    this.w = 0;
    this.f = 0;
    this.register = 0;
    this.nmiOccurred = 0;
    this.nmiOutput = 0;
    this.lowTileByte = 0;
    this.highTileByte = 0;
    this.tileData = [];
    this.spriteCount = 0;
    this.fNameTable = 0;
    this.fIncrement = 0;
    this.fSpriteTable = 0;
    this.fBackgroundTable = 0;
    this.fSpriteSize = 0;
    this.fMasterSlave = 0;
    this.fGrayscale = 0;
    this.fShowLeftBackground = 0;
    this.fShowLeftSprites = 0;
    this.fShowBackground = 0;
    this.fShowSprites = 0;
    this.fRedTint = 0;
    this.fGreenTint = 0;
    this.fBlueTint = 0;
    this.fSpriteZeroHit = 0;
    this.fSpriteOverflow = 0;
    this.oamAddress = 0;
    this.bufferedData = 0;
    this.frameBuffer.fill(0x00);
    this.frameReady = false;
  }

  setRenderingMode(mode: number) {
    this.renderingMode = {
      [RENDERING_MODES.NORMAL]: this.normalRenderingMode,
      [RENDERING_MODES.SPLIT]: this.splitRenderingMode
    }[mode];
  }

  /**
   * Emulation related methods
   */

  getSpriteSize() {
    return this.fSpriteSize ? 16 : 8;
  }

  /*  Handles the read communication between CPU and PPU */
  read8(address: number) {
    switch (address) {
      case 0x2002: {
        /**
         * 0x2002: PPUSTATUS
         * Used to describe the status of a PPU frame
         * Note: Resets write toggle `w`
         */
        this.registerRead = this.register & 0x1f;
        this.registerRead = this.registerRead | (this.fSpriteOverflow << 5);
        this.registerRead = this.registerRead | (this.fSpriteZeroHit << 6);
        if (this.nmiOccurred) {
          // Avoid reading the NMI right after it is set
          if (this.cycle !== 2 || this.scanline !== 241) {
            this.registerRead = this.registerRead | (1 << 7);
          }
        }
        this.nmiOccurred = 0;
        this.w = 0;

        return this.registerRead;
      }
      case 0x2004: {
        return this.memory.oam[this.oamAddress];
      }
      case 0x2007: {
        this.registerRead = this.memory.read8(this.v);
        // Emulate buffered reads
        if (this.v % 0x4000 < 0x3f00) {
          this.registerBuffer = this.bufferedData;
          this.bufferedData = this.registerRead;
          this.registerRead = this.registerBuffer;
        } else {
          this.bufferedData = this.memory.read8(this.v - 0x1000);
        }
        // Increment v address
        if (this.fIncrement === 0) {
          this.v++;
        } else {
          this.v += 32;
        }
        return this.registerRead;
      }
    }
    return 0;
  }

  /* Handles the write communication between CPU and PPU */
  write8(address: number, value: number) {
    // Pointer to the last value written to a register
    // Used by PPUSTATUS (0x2002)
    this.lastRegisterValue = value;

    switch (address) {
      case 0x2000: {
        // 0x2000: PPUCTR
        // Sets 7 flags that control where/how the ROM data is read
        this.fNameTable = (value >> 0) & 0b11;
        this.fIncrement = (value >> 2) & 1;
        this.fSpriteTable = (value >> 3) & 1;
        this.fBackgroundTable = (value >> 4) & 1;
        this.fSpriteSize = (value >> 5) & 1;
        this.fMasterSlave = (value >> 6) & 1;
        this.nmiOutput = ((value >> 7) & 1) === 1;
        this.t = (this.t & 0b1111_0011_1111_1111) | ((value & 0b11) << 10);
        break;
      }
      case 0x2001: {
        // 0x2001: PPUMASK
        // Sets 8 flags (1 byte) that control how to display pixels on screen
        this.fGrayscale = (value >> 0) & 1;
        this.fShowLeftBackground = (value >> 1) & 1;
        this.fShowLeftSprites = (value >> 2) & 1;
        this.fShowBackground = (value >> 3) & 1;
        this.fShowSprites = (value >> 4) & 1;
        this.fRedTint = (value >> 5) & 1;
        this.fGreenTint = (value >> 6) & 1;
        this.fBlueTint = (value >> 7) & 1;
        break;
      }
      case 0x2003: {
        // 0x2003: OAMADDR
        this.oamAddress = value;
        break;
      }
      case 0x2004: {
        // 0x2004: OAMDATA (write)
        this.memory.oam[this.oamAddress] = value;
        this.oamAddress++;
        break;
      }
      case 0x2005: {
        // 0x2005: PPUSCROLL
        // Update the scroll variables, aka which pixel of the nametable will be
        // at the top left of the screen
        if (this.w === 0) {
          this.t = (this.t & 0b1111_1111_1110_0000) | (value >> 3);
          this.x = value & 0b111;
          this.w = 1;
        } else {
          this.t = (this.t & 0b1000_1111_1100_0000) | ((value & 0b11111000) << 2);
          this.w = 0;
        }
        break;
      }
      case 0x2006: {
        if (this.w === 0) {
          this.t = (this.t & 0b1000_0000_1111_1111) | ((value & 0b00111111) << 8);
          this.w = 1;
        } else {
          this.t = (this.t & 0b1111_1111_0000_0000) | value;
          this.v = this.t;
          this.w = 0;
        }
        break;
      }
      case 0x2007: {
        // 0x2007: PPUDATA
        this.memory.write8(this.v, value);
        this.v += this.fIncrement === 0 ? 1 : 32;
        break;
      }
      case 0x4014: {
        // 0x4014 is handled by the CPU to avoid using CPU methods here
        break;
      }
    }
  }

  //
  // https://wiki.nesdev.com/w/index.php/PPU_scrolling
  //

  updateScrollingX() {
    // https://wiki.nesdev.com/w/index.php/PPU_scrolling#Coarse_X_increment
    // increment hori(v)
    // if coarse X === 31
    if ((this.v & 0x001f) === 31) {
      // coarse X = 0
      this.v = this.v & 0xffe0;
      // switch horizontal nametable
      this.v = this.v ^ 0x0400;
    } else {
      // increment coarse X
      this.v++;
    }
  }

  updateScrollingY() {
    // This one really is a mess
    // Values are coming from nesdev, don't touch, don't break
    if (this.cycleType === CYCLES.INCREMENT_Y) {
      // https://wiki.nesdev.com/w/index.php/PPU_scrolling#Y_increment
      // increment vert(v)
      // if fine Y < 7
      if ((this.v & 0x7000) !== 0x7000) {
        // increment fine Y
        this.v += 0x1000;
      } else {
        // fine Y = 0
        this.v = this.v & 0x8fff;
        // let y = coarse Y
        this.y = (this.v & 0x03e0) >> 5;
        if (this.y === 29) {
          // coarse Y = 0
          this.y = 0;
          // switch vertical nametable
          this.v = this.v ^ 0x0800;
        } else if (this.y === 31) {
          // coarse Y = 0, nametable not switched
          this.y = 0;
        } else {
          // increment coarse Y
          this.y++;
        }
        // put coarse Y back into v
        this.v = (this.v & 0xfc1f) | (this.y << 5);
      }
    }

    if (this.cycleType === CYCLES.COPY_X) {
      // https://wiki.nesdev.com/w/index.php/PPU_scrolling#At_dot_257_of_each_scanline
      this.v = (this.v & 0xfbe0) | (this.t & 0x041f);
    }
  }

  setVerticalBlank() {
    this.nmiOccurred = 1;
  }

  /**
   * Called at the end of vertical blank
   * Prepares the PPU for next frame
   */
  clearVerticalBlank() {
    this.nmiOccurred = 0;
    this.frameReady = true;
  }

  acknowledgeFrame() {
    // Must be called by code handling the NES
    this.frameReady = false;

    if (this.fShowSprites === 1) {
      this.fSpriteOverflow = 0;
      this.fSpriteZeroHit = 0;
    }

    this.frameBackgroundBuffer.fill(0x00);
    this.frameSpriteBuffer.fill(0x00);
  }

  /**
   * Returns the current background pixel
   * if background mode is enabled.
   *
   * This is where fine x is used as it points to
   * the correct bit of the current tile to use.
   */
  getCurrentBackgroundPixel() {
    if (this.fShowBackground === 0) {
      return 0;
    }

    return this.backgroundTileBuffer[this.x] & 0x0f;
  }

  /**
   * Return the current sprite pixel
   * if sprite mode is enabled and there is a pixel to display.
   */
  getCurrentSpritePixel() {
    var color, offset;

    if (this.fShowSprites === 0) {
      return [0, 0];
    }

    for (var i = 0; i < this.spriteCount; i++) {
      offset = this.cycle - 1 - this.sprites[i].x;
      if (offset < 0 || offset > 7) {
        continue;
      }

      color = this.sprites[i].buffer[offset] & 0x0f;

      if (color % 4 === 0) {
        continue;
      }
      return [i, color | 0x10];
    }
    return [0, 0];
  }

  /**
   * Assign a RGBA color to the int8 array
   */
  setColorToBuffer(buffer: Uint8Array, i: number, color: number): void {
    buffer[i] = (color >> 16) & 0xff;
    buffer[i + 1] = (color >> 8) & 0xff;
    buffer[i + 2] = color & 0xff;
    buffer[i + 3] = 0xff;
  }

  normalRenderingMode(pos: number, colorPos: number, c: number) {
    this.setColorToBuffer(this.frameBuffer, colorPos, c);
  }

  splitRenderingMode(pos: number, colorPos: number, c: number) {
    this.frameColorBuffer[pos] = c;

    if (this.isBackgroundPixel) {
      this.setColorToBuffer(this.frameBackgroundBuffer, colorPos, c);
    } else {
      this.setColorToBuffer(this.frameSpriteBuffer, colorPos, c);
      this.setColorToBuffer(this.frameBackgroundBuffer, colorPos, 0x00);
    }
  }

  /**
   * Render either a background or sprite pixel or a black pixel
   * Executed 256 times per visible (240) scanline
   */
  renderPixel() {
    const x = this.cycle - 1;
    const y = this.scanline;
    const pos = y * 256 + x;

    const showLeftBackground = x >= 8 || this.fShowLeftBackground !== 0;
    const showLeftSprites = x >= 8 || this.fShowLeftSprites !== 0;

    this.isBackgroundPixel = true;
    this.color = 0;

    this.backgroundColor = showLeftBackground
      ? this.getCurrentBackgroundPixel()
      : 0;

    [this.spriteIndex, this.spriteColor] = showLeftSprites
      ? this.getCurrentSpritePixel()
      : [0, 0];

    this.backgroundPixel = this.backgroundColor % 4;
    this.spritePixel = this.spriteColor % 4;

    if (this.backgroundPixel === 0 && this.spritePixel !== 0) {
      this.color = this.spriteColor;
      this.isBackgroundPixel = false;
    } else if (this.backgroundPixel !== 0 && this.spritePixel === 0) {
      this.color = this.backgroundColor;
    } else if (this.backgroundPixel !== 0 && this.spritePixel !== 0) {
      const sprite = this.sprites[this.spriteIndex];
      if (sprite.index === 0 && x < 255) {
        this.fSpriteZeroHit = 1;
      }
      this.color = sprite.priority === 0 ? this.spriteColor : this.backgroundColor;
      this.isBackgroundPixel = sprite.priority === 0;
    }

    const paletteIndex = this.memory.paletteTable.read8(this.color);
    const rgbColor = COLORS[paletteIndex];

    // Fills the buffer at pos `x`, `y` with rgb color `c`
    this.renderingMode(pos, pos * 4, rgbColor);
  }

  /**
   *  Helper method that appends a tile line to `tileData`
   *  by reading & concatenating lowTileByte, highTileByte and attributeTableByte.
   *  Must be called 8 times (or 16 for some sprites) to generate a sprite
   */
  readTileRow(
    tileData: number[],
    attributeTableByte: number,
    lowTileByte: number,
    highTileByte: number,
    isReversedHorizontally: boolean,
    flush: boolean
  ) {
    let tileShiftX = 0;
    let value = 0;

    if (flush) {
      tileData.length = 0;
    }

    for (let tileX = 0; tileX < 8; tileX++) {
      tileShiftX = isReversedHorizontally ? tileX : 7 - tileX;
      value =
        attributeTableByte |
        (((lowTileByte >> tileShiftX) & 1) |
          (((highTileByte >> tileShiftX) & 1) << 1));

      tileData.push(value);
    }
  }

  fetchSpriteRow(tileData: number[], i: number, row: number) {
    let tile = this.memory.oam[i * 4 + 1];
    const attributes = this.memory.oam[i * 4 + 2];
    const attributeTableByte = ((attributes & 3) << 2);
    const spriteSize = this.getSpriteSize();

    let table = this.fSpriteSize === 0 ? this.fSpriteTable : tile & 1;
    let isReversedVertically = (attributes & 0x80) === 0x80;
    let isReversedHorizontally = (attributes & 0x40) === 0x40;

    if (isReversedVertically) {
      row = spriteSize - 1 - row;
    }

    if (row > 7) {
      tile++;
      row %= 8;
    }

    const address = 0x1000 * table + (tile & 0xfe) * 16 + row;
    const lowTileByte = this.memory.read8(address);
    const highTileByte = this.memory.read8(address + 8);

    this.readTileRow(
      tileData,
      attributeTableByte,
      lowTileByte,
      highTileByte,
      isReversedHorizontally,
      true
    );
  }

  /**
   * Retrieves the sprites that are to be rendered on the next scanline
   * Executed at the end of a scanline
   */
  fetchAndStoreSpriteRows() {
    const spriteSize = this.getSpriteSize();
    this.spriteCount = 0;

    for (let i = 0; i < 64; i++) {
      const y = this.memory.oam[i * 4];
      const row = this.scanline - y;

      if (row < 0 || row >= spriteSize || this.spriteCount >= 8) {
        if (this.spriteCount > 8) {
          this.spriteCount = 8;
          this.fSpriteOverflow = 1;
        }
        break;
      }

      const attributes = this.memory.oam[i * 4 + 2];
      const spriteBuffer = this.sprites[this.spriteCount].buffer;

      this.fetchSpriteRow(spriteBuffer, i, row);

      const sprite = this.sprites[this.spriteCount];
      sprite.x = this.memory.oam[i * 4 + 3];
      sprite.priority = (attributes >> 5) & 1;
      sprite.index = i;

      this.spriteCount++;
    }
  }


  /**
   * Actions that should be done over 8 ticks
   * but instead done into 1 call because YOLO.
   *
   * Retrieves the background tiles that are to be rendered on the next X bytes
   *
   * - Read the nametable byte using current `v`
   * - Fetch corresponding attribute byte using current `v`
   * - Read CHR/Pattern table low+high bytes
   */
  fetchAndStoreBackgroundRow() {
    var address;
    var shift;
    var fineY;
    var nameTableByte = 0;

    // Fetch Name Table Byte
    address = 0x2000 | (this.v & 0x0fff);
    nameTableByte = this.memory.read8(address);

    // Fetch Attribute Table Byte
    address =
      0x23c0 |
      (this.v & 0x0c00) |
      ((this.v >> 4) & 0x38) |
      ((this.v >> 2) & 0x07);
    shift = ((this.v >> 4) & 4) | (this.v & 2);
    this.attributeTableByte = ((this.memory.read8(address) >> shift) & 3) << 2;

    // Fetch Low Tile Byte
    fineY = (this.v >> 12) & 7;
    address = 0x1000 * this.fBackgroundTable + nameTableByte * 16 + fineY;
    this.lowTileByte = this.memory.read8(address);

    // Fetch High Tile Byte
    fineY = (this.v >> 12) & 7;
    address = 0x1000 * this.fBackgroundTable + nameTableByte * 16 + fineY;
    this.highTileByte = this.memory.read8(address + 8);

    // Store Tile Data
    this.readTileRow(
      this.backgroundTileBuffer,
      this.attributeTableByte,
      this.lowTileByte,
      this.highTileByte,
      false,
      false
    );
  }

  /**
   * Determines the type of the cycle
   * Refer to https://wiki.nesdev.com/w/images/d/d1/Ntsc_timing.png
   */
  _cycleType() {
    if (this.cycle === 0) {
      return CYCLES.ZERO;
    } else if (this.cycle === 1) {
      return CYCLES.ONE;
    } else if (this.cycle > 1 && this.cycle < 257) {
      return CYCLES.VISIBLE;
    } else if (this.cycle === 321) {
      return CYCLES.FLUSH_TILEDATA;
    } else if (this.cycle > 321 && this.cycle < 337) {
      return CYCLES.PREFETCH;
    } else if (this.cycle === 259) {
      return CYCLES.SPRITES;
    } else if (this.cycle === 258) {
      return CYCLES.INCREMENT_Y;
    } else if (this.cycle === 257) {
      return CYCLES.COPY_X;
    } else if (this.cycle > 279 && this.cycle < 305) {
      return CYCLES.COPY_Y;
    } else if (this.cycle === 340) {
      return CYCLES.MAPPER_TICK;
    } else {
      return CYCLES.IDLE;
    }
  }

  /**
   * Determines the type of the scanline
   */
  _scanlineType() {
    if (this.scanline < 240) {
      return SCANLINES.VISIBLE;
    } else if (this.scanline === 241) {
      return SCANLINES.VBLANK;
    } else if (this.scanline === 261) {
      return SCANLINES.PRELINE;
    } else {
      return SCANLINES.IDLE;
    }
  }

  doPreline() {
    if (
      this.cycleType === CYCLES.ONE ||
      this.cycleType === CYCLES.VISIBLE ||
      this.cycleType === CYCLES.PREFETCH
    ) {
      this.backgroundTileBuffer.shift();

      if (this.cycle % 8 === 0) {
        if (this.cycle < 256) {
          this.fetchAndStoreBackgroundRow();
        }
        this.updateScrollingX();
      }
    }

    if (this.cycleType === CYCLES.SPRITES) {
      this.spriteCount = 0;
    }

    if (this.cycleType === CYCLES.COPY_Y) {
      // https://wiki.nesdev.com/w/index.php/PPU_scrolling#During_dots_280_to_304_of_the_pre-render_scanline_.28end_of_vblank.29
      this.v = (this.v & 0x841f) | (this.t & 0x7be0);
    }

    this.updateScrollingY();

    if (this.cycleType === CYCLES.ONE) {
      this.clearVerticalBlank();
    }

    if (this.cycleType === CYCLES.MAPPER_TICK) {
      if (this.memory.mapper.tick()) {
        return INTERRUPTS.IRQ;
      }
    }
  }

  doVisibleLine() {
    if (this.cycleType === CYCLES.ONE || this.cycleType === CYCLES.VISIBLE) {
      this.renderPixel();
    }

    if (this.cycleType === CYCLES.VISIBLE) {
      this.backgroundTileBuffer.shift();

      if (this.cycle % 8 === 0) {
        if (this.cycle < 256) {
          this.fetchAndStoreBackgroundRow();
        }
        this.updateScrollingX();
      }
    } else if (this.cycleType === CYCLES.FLUSH_TILEDATA) {
      // Hackish hack, empty the remaining tile data at the beginning of prefetch
      // Needs improvement
      this.backgroundTileBuffer.length = 0;
    } else if (this.cycleType === CYCLES.PREFETCH) {
      if (this.cycle % 8 === 0) {
        this.fetchAndStoreBackgroundRow();
        this.updateScrollingX();
      }
    }

    this.updateScrollingY();

    if (this.cycleType === CYCLES.SPRITES) {
      this.fetchAndStoreSpriteRows();
    }

    if (this.cycleType === CYCLES.MAPPER_TICK) {
      if (this.memory.mapper.tick()) {
        return INTERRUPTS.IRQ;
      }
    }

    return null;
  }

  doVBlankLine() {
    if (this.cycleType === CYCLES.SPRITES) {
      this.spriteCount = 0;
    }

    // Vertical Blank is set at second tick of scanline 241
    if (this.cycleType === CYCLES.ONE) {
      this.setVerticalBlank();
      if (this.nmiOutput) {
        return INTERRUPTS.NMI; // Clean this shit
      }
    }

    return null;
  }

  incrementCounters() {
    this.cycle++;

    // Skip one cycle when background is on for each odd frame
    if (
      this.scanline === 261 &&
      this.cycle === 340 &&
      this.fShowBackground !== 0 &&
      this.f === 1
    ) {
      this.cycle++;
      this.f = this.f ^ 1;
    }

    if (this.cycle === 341) {
      this.cycle = 0;
      this.scanline++;
      if (this.scanline === 262) {
        this.scanline = 0;
      }
    }
  }

  /**
   * Main function of PPU.
   * Increments counters (cycle, scanline, frame)
   * Executes one action based on scanline + cycle
   */
  tick() {
    this.cycleType = this._cycleType();
    this.scanlineType = this._scanlineType();

    if (this.scanlineType === SCANLINES.VBLANK) {
      this.interrupt = this.doVBlankLine();
    } else if (this.fShowBackground !== 0 || this.fShowSprites !== 0) {
      if (this.scanlineType === SCANLINES.PRELINE) {
        this.interrupt = this.doPreline();
      } else if (this.scanlineType === SCANLINES.VISIBLE) {
        this.interrupt = this.doVisibleLine();
      }
    } else {
      this.interrupt = null;
    }

    this.incrementCounters();

    return this.interrupt;
  }
}

export default PPU;
