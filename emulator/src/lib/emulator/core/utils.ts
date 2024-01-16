export function isPageCrossed(addr1: number, addr2: number) {
  // A page is crossed when the high byte differs from addr1 to addr2
  return addr1 >> 8 !== addr2 >> 8;
}
