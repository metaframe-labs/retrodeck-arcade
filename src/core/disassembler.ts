/**
 * Real-time CHIP-8 Opcode Disassembler for RetroDeck-8 CPU Debugger HUD.
 */

const hex2 = (n: number) => '0x' + (n & 0xff).toString(16).toUpperCase().padStart(2, '0');
const hex3 = (n: number) => '0x' + (n & 0xfff).toString(16).toUpperCase().padStart(3, '0');
const reg = (x: number) => 'V' + (x & 0xf).toString(16).toUpperCase();

export function disassembleOpcode(opcode: number): string {
  const nnn = opcode & 0x0fff;
  const nn = opcode & 0x00ff;
  const n = opcode & 0x000f;
  const x = (opcode & 0x0f00) >> 8;
  const y = (opcode & 0x00f0) >> 4;

  switch (opcode & 0xf000) {
    case 0x0000:
      if (opcode === 0x00e0) return 'CLS';
      if (opcode === 0x00ee) return 'RET';
      return `SYS ${hex3(nnn)}`;
    case 0x1000:
      return `JP ${hex3(nnn)}`;
    case 0x2000:
      return `CALL ${hex3(nnn)}`;
    case 0x3000:
      return `SE ${reg(x)}, ${hex2(nn)}`;
    case 0x4000:
      return `SNE ${reg(x)}, ${hex2(nn)}`;
    case 0x5000:
      return `SE ${reg(x)}, ${reg(y)}`;
    case 0x6000:
      return `LD ${reg(x)}, ${hex2(nn)}`;
    case 0x7000:
      return `ADD ${reg(x)}, ${hex2(nn)}`;
    case 0x8000:
      switch (n) {
        case 0x0: return `LD ${reg(x)}, ${reg(y)}`;
        case 0x1: return `OR ${reg(x)}, ${reg(y)}`;
        case 0x2: return `AND ${reg(x)}, ${reg(y)}`;
        case 0x3: return `XOR ${reg(x)}, ${reg(y)}`;
        case 0x4: return `ADD ${reg(x)}, ${reg(y)}`;
        case 0x5: return `SUB ${reg(x)}, ${reg(y)}`;
        case 0x6: return `SHR ${reg(x)}`;
        case 0x7: return `SUBN ${reg(x)}, ${reg(y)}`;
        case 0xe: return `SHL ${reg(x)}`;
        default: return `DATA ${hex3(opcode)}`;
      }
    case 0x9000:
      return `SNE ${reg(x)}, ${reg(y)}`;
    case 0xa000:
      return `LD I, ${hex3(nnn)}`;
    case 0xb000:
      return `JP V0, ${hex3(nnn)}`;
    case 0xc000:
      return `RND ${reg(x)}, ${hex2(nn)}`;
    case 0xd000:
      return `DRW ${reg(x)}, ${reg(y)}, ${n}`;
    case 0xe000:
      if (nn === 0x9e) return `SKP ${reg(x)}`;
      if (nn === 0xa1) return `SKNP ${reg(x)}`;
      return `DATA ${hex3(opcode)}`;
    case 0xf000:
      switch (nn) {
        case 0x07: return `LD ${reg(x)}, DT`;
        case 0x0a: return `LD ${reg(x)}, K`;
        case 0x15: return `LD DT, ${reg(x)}`;
        case 0x18: return `LD ST, ${reg(x)}`;
        case 0x1e: return `ADD I, ${reg(x)}`;
        case 0x29: return `LD F, ${reg(x)}`;
        case 0x33: return `LD B, ${reg(x)}`;
        case 0x55: return `LD [I], ${reg(x)}`;
        case 0x65: return `LD ${reg(x)}, [I]`;
        default: return `DATA ${hex3(opcode)}`;
      }
    default:
      return `NOP`;
  }
}
