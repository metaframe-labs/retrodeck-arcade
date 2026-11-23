/**
 * Two-pass Pure TypeScript CHIP-8 Macro Assembler.
 * Compiles readable label-based CHIP-8 programs directly into authentic
 * 16-bit big-endian CHIP-8 machine code (Uint8Array / Base64).
 */

import { bytesToBase64 } from './base64';
import { PROGRAM_START } from './Chip8CPU';

interface Fixup {
  offset: number;
  label: string;
  mask: number; // e.g., 0x1000 for JP, 0x2000 for CALL, 0xA000 for LD I
}

export class Chip8Asm {
  private bytes: number[] = [];
  private labels = new Map<string, number>();
  private fixups: Fixup[] = [];

  private emit16(word: number): this {
    this.bytes.push((word >> 8) & 0xff, word & 0xff);
    return this;
  }

  private emitAddrOp(mask: number, target: string | number): this {
    if (typeof target === 'number') {
      return this.emit16(mask | (target & 0x0fff));
    }
    this.fixups.push({ offset: this.bytes.length, label: target, mask });
    return this.emit16(mask);
  }

  public label(name: string): this {
    this.labels.set(name, PROGRAM_START + this.bytes.length);
    return this;
  }

  /** Align to even byte boundary for instructions after odd-length sprite data */
  public align2(): this {
    if (this.bytes.length % 2 !== 0) this.bytes.push(0);
    return this;
  }

  // --- Standard 35 CHIP-8 Opcodes ---
  public cls(): this { return this.emit16(0x00e0); }
  public ret(): this { return this.emit16(0x00ee); }
  public jp(target: string | number): this { return this.emitAddrOp(0x1000, target); }
  public call(target: string | number): this { return this.emitAddrOp(0x2000, target); }
  public se(vx: number, byte: number): this { return this.emit16(0x3000 | ((vx & 0xf) << 8) | (byte & 0xff)); }
  public sne(vx: number, byte: number): this { return this.emit16(0x4000 | ((vx & 0xf) << 8) | (byte & 0xff)); }
  public seReg(vx: number, vy: number): this { return this.emit16(0x5000 | ((vx & 0xf) << 8) | ((vy & 0xf) << 4)); }
  public ld(vx: number, byte: number): this { return this.emit16(0x6000 | ((vx & 0xf) << 8) | (byte & 0xff)); }
  public add(vx: number, byte: number): this { return this.emit16(0x7000 | ((vx & 0xf) << 8) | (byte & 0xff)); }
  public ldReg(vx: number, vy: number): this { return this.emit16(0x8000 | ((vx & 0xf) << 8) | ((vy & 0xf) << 4) | 0x0); }
  public orReg(vx: number, vy: number): this { return this.emit16(0x8000 | ((vx & 0xf) << 8) | ((vy & 0xf) << 4) | 0x1); }
  public andReg(vx: number, vy: number): this { return this.emit16(0x8000 | ((vx & 0xf) << 8) | ((vy & 0xf) << 4) | 0x2); }
  public xorReg(vx: number, vy: number): this { return this.emit16(0x8000 | ((vx & 0xf) << 8) | ((vy & 0xf) << 4) | 0x3); }
  public addReg(vx: number, vy: number): this { return this.emit16(0x8000 | ((vx & 0xf) << 8) | ((vy & 0xf) << 4) | 0x4); }
  public subReg(vx: number, vy: number): this { return this.emit16(0x8000 | ((vx & 0xf) << 8) | ((vy & 0xf) << 4) | 0x5); }
  public shr(vx: number): this { return this.emit16(0x8000 | ((vx & 0xf) << 8) | 0x6); }
  public subnReg(vx: number, vy: number): this { return this.emit16(0x8000 | ((vx & 0xf) << 8) | ((vy & 0xf) << 4) | 0x7); }
  public shl(vx: number): this { return this.emit16(0x8000 | ((vx & 0xf) << 8) | 0xe); }
  public sneReg(vx: number, vy: number): this { return this.emit16(0x9000 | ((vx & 0xf) << 8) | ((vy & 0xf) << 4)); }
  public ldI(target: string | number): this { return this.emitAddrOp(0xa000, target); }
  public jpV0(target: string | number): this { return this.emitAddrOp(0xb000, target); }
  public rnd(vx: number, mask: number): this { return this.emit16(0xc000 | ((vx & 0xf) << 8) | (mask & 0xff)); }
  public drw(vx: number, vy: number, height: number): this {
    return this.emit16(0xd000 | ((vx & 0xf) << 8) | ((vy & 0xf) << 4) | (height & 0xf));
  }
  public skp(vx: number): this { return this.emit16(0xe09e | ((vx & 0xf) << 8)); }
  public sknp(vx: number): this { return this.emit16(0xe0a1 | ((vx & 0xf) << 8)); }
  public ldFromDt(vx: number): this { return this.emit16(0xf007 | ((vx & 0xf) << 8)); }
  public waitKey(vx: number): this { return this.emit16(0xf00a | ((vx & 0xf) << 8)); }
  public ldToDt(vx: number): this { return this.emit16(0xf015 | ((vx & 0xf) << 8)); }
  public ldToSt(vx: number): this { return this.emit16(0xf018 | ((vx & 0xf) << 8)); }
  public addI(vx: number): this { return this.emit16(0xf01e | ((vx & 0xf) << 8)); }
  public ldFont(vx: number): this { return this.emit16(0xf029 | ((vx & 0xf) << 8)); }
  public ldBcd(vx: number): this { return this.emit16(0xf033 | ((vx & 0xf) << 8)); }
  public storeRegs(vx: number): this { return this.emit16(0xf055 | ((vx & 0xf) << 8)); }
  public loadRegs(vx: number): this { return this.emit16(0xf065 | ((vx & 0xf) << 8)); }

  /** Emit raw sprite data from visual ASCII rows like ['#.#.#...', '.###....'] */
  public sprite(labelName: string, rows: string[]): this {
    this.label(labelName);
    for (const row of rows) {
      let byte = 0;
      for (let i = 0; i < 8; i++) {
        if (row[i] === '#' || row[i] === '1' || row[i] === 'X') {
          byte |= 0x80 >> i;
        }
      }
      this.bytes.push(byte);
    }
    return this;
  }

  public data(labelName: string, rawBytes: number[]): this {
    this.label(labelName);
    for (const b of rawBytes) this.bytes.push(b & 0xff);
    return this;
  }

  public compile(): Uint8Array {
    const out = new Uint8Array(this.bytes);
    for (const fix of this.fixups) {
      const addr = this.labels.get(fix.label);
      if (addr === undefined) {
        throw new Error(`Chip8Asm: unresolved label "${fix.label}"`);
      }
      const word = fix.mask | (addr & 0x0fff);
      out[fix.offset] = (word >> 8) & 0xff;
      out[fix.offset + 1] = word & 0xff;
    }
    return out;
  }

  public toBase64(): string {
    return bytesToBase64(this.compile());
  }
}
