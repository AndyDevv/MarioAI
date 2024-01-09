class CPUMEMORY {
  public zero_point: Uint8Array;
  public stack: Uint8Array;
  public ram: Uint8Array;

  constructor() {
    this.zero_point = new Uint8Array(256).fill(0xff);
    this.stack = new Uint8Array(256).fill(0xff);
    this.ram = new Uint8Array(1536).fill(0xff);
  }

  read(address: number) {
    address %= 0x800;

    if (address < 0x100) {
      return this.zero_point[address];
    } else if (address < 0x200) {
      return this.stack[address - 0x100];
    } else {
      return this.ram[address - 0x200];
    }
  }
}
export { CPUMEMORY };
