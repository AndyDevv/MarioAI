import fs from "fs";

type _Symbol = {
  name: string;
  address: number;
  lineNum: number;
};

class SymbolFile {
  private symbols: _Symbol[];
  private nameToAddr: Map<string, number>;
  private addrToName: Map<number, string>;

  constructor(fname: string) {
    const fileContent = fs.readFileSync(fname, "utf-8");
    const lines = fileContent.split("\n");
    this.symbols = lines
      .map((line) => this.parseSymbol(line))
      .filter((symbol) => symbol != null);

    this.symbols.sort((a, b) => a.address - b.address);
    this.nameToAddr = new Map<string, number>();
    this.addrToName = new Map<number, string>();

    this.symbols.forEach(symbol => {
      this.nameToAddr.set(symbol.name, symbol.address);
      this.addrToName.set(symbol.address, symbol.name);
    });
  }

  private parseSymbol(line: string): _Symbol | null {
    const re =
      /(?<name>[A-Z0-9_]+) *= \$(?<address>[A-F0-9]*) *; <> \d+, statement #(?<lineNum>\d+)/;
    const match = re.exec(line);

    if (match && match.groups) {
      return {
        name: match.groups["name"],
        address: parseInt(match.groups["address"], 16),
        lineNum: parseInt(match.groups["lineNum"], 10),
      };
    }

    return null;
  }

  public getAddress(name: string): number {
    return this.nameToAddr[name];
  }
}
