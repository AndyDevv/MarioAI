import type ROM from "../ROM";
import Mapper from "./Mapper";

/**
 *   http://wiki.nesdev.com/w/index.php/NROM
 */

class NROM extends Mapper {
  constructor(rom: ROM) {
    super(rom);

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

  write8(address: number, value: number) {
    if (address < 0x2000) {
      this.chr.write8(address, value);
    } else if (address < 0x8000) {
      this.sram[address - 0x6000] = value;
    } else {
      console.warn("Invalid write addr", address);
    }
  }
}

export default NROM;
