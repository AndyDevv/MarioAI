class BankMemory {
  public data: Uint8Array;
  public swapMode: number;
  public windowSize: number;
  public bankNbr: number;
  public pointers: number[];
  public bankSize: number;
  public p: number;
  public o: number;
  public p1: number;
  public p2: number;
  public fixed: boolean;

  constructor(data: Uint8Array, windowSize: number, bankSize: number) {
    this.data = data;
    this.swapMode = 0;
    this.windowSize = windowSize;
    // bankNbr is the number of 1kb banks we have in all our data
    this.bankNbr = this.data.length / 0x0400;
    this.pointers = new Array(windowSize / 0x0400).fill(0);
    // PRG is 32 by default, CHR is 8, but can be changed
    this.bankSize = bankSize;
    // Tmp variables
    this.p = 0;
    this.o = 0;
    this.p1 = 0;
    this.p2 = 0;
    this.fixed = false;

    for (let i = 0; i < this.pointers.length; i++) {
      this.pointers[i] = i;
    }
  }

  setBankSize(size: number) {
    this.bankSize = size;
  }

  /**
    Move pointers to redirect to new banks
  */
  switchBank(_from: number, _to: number, value: number) {
    this.p1 = _from / 0x0400;
    this.p2 = _to / 0x0400;

    if (value < 0) {
      // Used to select latest bank, penultimate bank
      value = this.bankNbr / this.bankSize + value;
    }

    value *= (this.p2 - this.p1);

    for (let x = 0, i = this.p1; i < this.p2; i++, x++) {
      this.pointers[i] = value + x;
    }
  }

  write8(address: number, value: number) {
    this.p = address / 0x0400
    this.o = address % 0x0400;
    this.data[this.pointers[this.p] * 0x0400 + this.o] = value;
  }

  read8(address: number) {
    this.p = (address / 0x0400);
    this.o = address % 0x0400;
    return this.data[this.pointers[this.p] * 0x0400 + this.o];
  }
}

export default BankMemory;
