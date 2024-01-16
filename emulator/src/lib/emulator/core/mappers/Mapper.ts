import BankMemory from "./Bank";

/**
 * http://wiki.nesdev.com/w/index.php/Mapper
 */
class Mapper {
  public chr: BankMemory;
  public prg: BankMemory;
  public sram: number[];
  public mirrorType: number;

  constructor(rom: any) {
    this.chr = new BankMemory(rom.chr, 0x2000, 8);
    this.prg = new BankMemory(rom.prg, 0x8000, 16);
    this.sram = new Array(0x2000).fill(0xff);
    this.mirrorType = rom.mirrorType;
  }

  /**
   *  Only used for a few mappers
   */
  tick() { }
}

export default Mapper;
