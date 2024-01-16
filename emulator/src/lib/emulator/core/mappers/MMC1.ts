import type ROM from "../ROM";
import Mapper from "./Mapper";

import { NAMETABLE_MIRRORS } from "./constants";

const MMC1_MIRRORS = <{ [key: number]: number }>{
  0: NAMETABLE_MIRRORS.SINGLE_SCREEN_0,
  1: NAMETABLE_MIRRORS.SINGLE_SCREEN_1,
  2: NAMETABLE_MIRRORS.VERTICAL,
  3: NAMETABLE_MIRRORS.HORIZONTAL
};

/**
 * http://wiki.nesdev.com/w/index.php/MMC1
 */
class MMC1 extends Mapper {
  public buffer: number;
  public bufferIndex: number;
  public conf: number;
  public prgBankMode: number;
  public chrBankMode: number;

  constructor(rom: ROM) {
    super(rom);
    this.buffer = 0x10;
    this.bufferIndex = 0;
    this.conf = 0x0c;
    this.prgBankMode = 0;
    this.chrBankMode = 0;

    this.prg.switchBank(0x4000, 0x8000, -1);
  }

  read8(address: number) {
    if (address < 0x2000) {
      return this.chr.read8(address);
    } else if (address < 0x8000) {
      return this.sram[address - 0x6000];
    } else {
      return this.prg.read8(address - 0x8000);
    }
  }

  /**
   *  MMC1 has an internal buffer which needs to be written 5 times before switching banks or
   *  updating registers
   */
  write8(address: number, value: number) {
    if (address < 0x2000) {
      this.chr.write8(address, value);
    } else if (address < 0x8000) {
      this.sram[address - 0x6000] = value;
    } else if (value & 0x80) {
      this.buffer = 0x10;
      this.bufferIndex = 0;
      this.control(this.conf | 0x0c);
    } else {
      // Write Register
      this.buffer = (this.buffer >> 1) | ((value & 1) << 4);
      this.bufferIndex++;

      if (this.bufferIndex === 5) {
        value = this.buffer;

        // Control
        if (address < 0xa000) {
          this.control(value);
        } else if (address < 0xc000) {
          // CHR Bank 0
          // @ts-ignore
          const chrBankValue = this.chr.fixed ? value >> 1 : value;
          this.chr.switchBank(0, 0x1000, chrBankValue);
        } else if (address < 0xe000) {
          // CHR Bank 1
          // @ts-ignore
          if (!this.chr.fixed) {
            this.chr.switchBank(0x1000, 0x2000, value);
          }
        } else {

          // PRG Bank
          // @ts-ignore
          const prgBankValue = this.prg.fixed ? value >> 1 : value;

          // @ts-ignore
          if (this.prg.fixed || this.prg.swapMode === 0) {
            this.prg.switchBank(0, 0x8000, prgBankValue);
          } else {
            this.prg.switchBank(0, 0x4000, this.prg.swapMode === 1 ? value : -1);
            this.prg.switchBank(0x4000, 0x8000, prgBankValue);
          }
        }

        this.buffer = 0x10;
        this.bufferIndex = 0;
      }
    }
  }

  control(value: number) {
    this.conf = value;
    this.prgBankMode = (value >> 2) & 3;
    this.chrBankMode = (value >> 4) & 1;
    this.mirrorType = MMC1_MIRRORS[value & 3];

    if (this.prgBankMode === 2) {
      this.prg.swapMode = 0;
    }
    if (this.prgBankMode === 3) {
      this.prg.swapMode = 1;
    }

    // @ts-ignore
    this.prg.fixed = this.prgBankMode === 0 || this.prgBankMode === 1;

    this.chr.fixed = this.chrBankMode === 0;
  }
}

export default MMC1;
