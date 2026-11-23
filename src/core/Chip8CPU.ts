/**
 * RetroDeck-8 — Pure TypeScript CHIP-8 CPU Emulator
 *
 * Architecture:
 * - 4096 bytes RAM (0x000 - 0xFFF)
 * - 0x050 - 0x09F: Built-in 4x5 hexadecimal font sprites (0-F)
 * - 0x200 - 0xFFF: Program / Cartridge ROM space
 * - 16 x 8-bit general-purpose registers (V0..VF, VF = carry/collision flag)
 * - 16-bit index register (I), 16-bit program counter (PC)
 * - 16-level call stack + 8-bit stack pointer (SP)
 * - 64 x 32 monochrome framebuffer (2048 pixels)
 * - 16-key hexadecimal keypad (0x0 - 0xF)
 * - 60Hz Delay Timer (DT) & Sound Timer (ST)
 */

import { base64ToBytes } from './base64';
import { disassembleOpcode } from './disassembler';

export const MEMORY_SIZE = 4096;
export const PROGRAM_START = 0x200;
export const FONTSET_START = 0x050;
export const DISPLAY_WIDTH = 64;
export const DISPLAY_HEIGHT = 32;

const FONTSET = new Uint8Array([
  0xf0, 0x90, 0x90, 0x90, 0xf0, // 0
  0x20, 0x60, 0x20, 0x20, 0x70, // 1
  0xf0, 0x10, 0xf0, 0x80, 0xf0, // 2
  0xf0, 0x10, 0xf0, 0x10, 0xf0, // 3
  0x90, 0x90, 0xf0, 0x10, 0x10, // 4
  0xf0, 0x80, 0xf0, 0x10, 0xf0, // 5
  0xf0, 0x80, 0xf0, 0x90, 0xf0, // 6
  0xf0, 0x10, 0x20, 0x40, 0x40, // 7
  0xf0, 0x90, 0xf0, 0x90, 0xf0, // 8
  0xf0, 0x90, 0xf0, 0x10, 0xf0, // 9
  0xf0, 0x90, 0xf0, 0x90, 0x90, // A
  0xe0, 0x90, 0xe0, 0x90, 0xe0, // B
  0xf0, 0x80, 0x80, 0x80, 0xf0, // C
  0xe0, 0x90, 0x90, 0x90, 0xe0, // D
  0xf0, 0x80, 0xf0, 0x80, 0xf0, // E
  0xf0, 0x80, 0xf0, 0x80, 0x80, // F
]);

export interface PixelRun {
  row: number;
  col: number;
  len: number;
}

export interface Chip8Quirks {
  /** If true, 8xy6 / 8xyE shifts VY into VX (COSMAC VIP); if false, shifts VX in-place (modern/SCHIP). */
  shiftUsesVy: boolean;
  /** If true, Fx55 / Fx65 increments I register (COSMAC VIP). */
  incrementIOnLoadStore: boolean;
  /** If true, sprites wrap around screen edges; if false, clipped at edges. */
  wrapSprites: boolean;
  /** If true, 8xy1, 8xy2, 8xy3 bitwise operations reset VF to 0 (COSMAC VIP). */
  logicResetsVf: boolean;
  /** If true, Bnnn jumps to nnn + Vx (SCHIP); if false, jumps to nnn + V0 (COSMAC VIP). */
  jumpUsesVx: boolean;
}

export interface CpuSnapshot {
  pc: number;
  i: number;
  sp: number;
  dt: number;
  st: number;
  v: number[];
  lastOpcode: number;
  disasm: string;
  cycleCount: number;
  halted: boolean;
  waitingForKey: boolean;
  activePixels: number;
}

export class Chip8CPU {
  public memory = new Uint8Array(MEMORY_SIZE);
  public V = new Uint8Array(16);
  public I = 0;
  public PC = PROGRAM_START;
  public stack = new Uint16Array(16);
  public SP = 0;

  public delayTimer = 0;
  public soundTimer = 0;

  public display = new Uint8Array(DISPLAY_WIDTH * DISPLAY_HEIGHT);
  public keys = new Uint8Array(16);

  public drawFlag = false;
  public halted = false;
  public lastOpcode = 0;
  public cycleCount = 0;

  private waitingForKeyReg = -1;
  public quirks: Chip8Quirks;

  constructor(quirks?: Partial<Chip8Quirks>) {
    this.quirks = {
      shiftUsesVy: false,
      incrementIOnLoadStore: false,
      wrapSprites: true,
      logicResetsVf: false,
      jumpUsesVx: false,
      ...quirks,
    };
    this.reset();
  }

  public reset(): void {
    this.memory.fill(0);
    this.V.fill(0);
    this.stack.fill(0);
    this.display.fill(0);
    this.keys.fill(0);

    // Load hexadecimal fontset into 0x050 - 0x09F
    this.memory.set(FONTSET, FONTSET_START);

    this.I = 0;
    this.PC = PROGRAM_START;
    this.SP = 0;
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.drawFlag = true;
    this.halted = false;
    this.lastOpcode = 0;
    this.cycleCount = 0;
    this.waitingForKeyReg = -1;
  }

  public loadRom(romBytes: Uint8Array): void {
    this.reset();
    const maxLen = MEMORY_SIZE - PROGRAM_START;
    const len = Math.min(romBytes.length, maxLen);
    for (let i = 0; i < len; i++) {
      this.memory[PROGRAM_START + i] = romBytes[i];
    }
  }

  public loadRomBase64(base64: string): number {
    const bytes = base64ToBytes(base64);
    this.loadRom(bytes);
    return bytes.length;
  }

  public setKey(keyIndex: number, pressed: boolean): void {
    if (keyIndex < 0 || keyIndex > 15) return;
    this.keys[keyIndex] = pressed ? 1 : 0;

    // If CPU is blocked on Fx0A (LD Vx, K), resume immediately on key press
    if (pressed && this.waitingForKeyReg >= 0) {
      this.V[this.waitingForKeyReg] = keyIndex;
      this.waitingForKeyReg = -1;
    }
  }

  /**
   * Call at 60Hz to decrement Delay & Sound timers.
   * Returns true while Sound Timer is active (buzzer should beep).
   */
  public tickTimers(): boolean {
    if (this.delayTimer > 0) this.delayTimer--;
    if (this.soundTimer > 0) {
      this.soundTimer--;
      return true;
    }
    return false;
  }

  /**
   * Execute N CPU cycles (instructions).
   */
  public cycle(steps = 10): void {
    for (let s = 0; s < steps; s++) {
      if (this.halted || this.waitingForKeyReg >= 0) break;
      this.step();
    }
  }

  /**
   * Execute a single Fetch -> Decode -> Execute cycle.
   */
  public step(): void {
    if (this.halted || this.waitingForKeyReg >= 0) return;
    if (this.PC < 0 || this.PC + 1 >= MEMORY_SIZE) {
      this.halted = true;
      return;
    }

    // Fetch 16-bit big-endian opcode
    const opcode = (this.memory[this.PC] << 8) | this.memory[this.PC + 1];
    this.lastOpcode = opcode;
    this.PC = (this.PC + 2) & 0xfff;
    this.cycleCount++;

    const x = (opcode & 0x0f00) >> 8;
    const y = (opcode & 0x00f0) >> 4;
    const nnn = opcode & 0x0fff;
    const nn = opcode & 0x00ff;
    const n = opcode & 0x000f;

    switch (opcode & 0xf000) {
      case 0x0000:
        if (opcode === 0x00e0) {
          // 00E0: CLS - Clear display
          this.display.fill(0);
          this.drawFlag = true;
        } else if (opcode === 0x00ee) {
          // 00EE: RET - Return from subroutine
          if (this.SP > 0) {
            this.SP--;
            this.PC = this.stack[this.SP];
          }
        }
        break;

      case 0x1000:
        // 1nnn: JP addr
        this.PC = nnn;
        break;

      case 0x2000:
        // 2nnn: CALL addr
        if (this.SP < 16) {
          this.stack[this.SP] = this.PC;
          this.SP++;
          this.PC = nnn;
        }
        break;

      case 0x3000:
        // 3xnn: SE Vx, byte
        if (this.V[x] === nn) this.PC = (this.PC + 2) & 0xfff;
        break;

      case 0x4000:
        // 4xnn: SNE Vx, byte
        if (this.V[x] !== nn) this.PC = (this.PC + 2) & 0xfff;
        break;

      case 0x5000:
        // 5xy0: SE Vx, Vy
        if (n === 0 && this.V[x] === this.V[y]) this.PC = (this.PC + 2) & 0xfff;
        break;

      case 0x6000:
        // 6xnn: LD Vx, byte
        this.V[x] = nn;
        break;

      case 0x7000:
        // 7xnn: ADD Vx, byte (no carry flag change)
        this.V[x] = (this.V[x] + nn) & 0xff;
        break;

      case 0x8000:
        switch (n) {
          case 0x0: // 8xy0: LD Vx, Vy
            this.V[x] = this.V[y];
            break;
          case 0x1: // 8xy1: OR Vx, Vy
            this.V[x] |= this.V[y];
            if (this.quirks.logicResetsVf) this.V[0xf] = 0;
            break;
          case 0x2: // 8xy2: AND Vx, Vy
            this.V[x] &= this.V[y];
            if (this.quirks.logicResetsVf) this.V[0xf] = 0;
            break;
          case 0x3: // 8xy3: XOR Vx, Vy
            this.V[x] ^= this.V[y];
            if (this.quirks.logicResetsVf) this.V[0xf] = 0;
            break;
          case 0x4: { // 8xy4: ADD Vx, Vy (VF = carry)
            const sum = this.V[x] + this.V[y];
            this.V[x] = sum & 0xff;
            this.V[0xf] = sum > 0xff ? 1 : 0;
            break;
          }
          case 0x5: { // 8xy5: SUB Vx, Vy (VF = NOT borrow)
            const noBorrow = this.V[x] >= this.V[y] ? 1 : 0;
            this.V[x] = (this.V[x] - this.V[y]) & 0xff;
            this.V[0xf] = noBorrow;
            break;
          }
          case 0x6: { // 8xy6: SHR Vx
            const src = this.quirks.shiftUsesVy ? this.V[y] : this.V[x];
            const lsb = src & 0x1;
            this.V[x] = src >> 1;
            this.V[0xf] = lsb;
            break;
          }
          case 0x7: { // 8xy7: SUBN Vx, Vy (Vx = Vy - Vx, VF = NOT borrow)
            const noBorrow = this.V[y] >= this.V[x] ? 1 : 0;
            this.V[x] = (this.V[y] - this.V[x]) & 0xff;
            this.V[0xf] = noBorrow;
            break;
          }
          case 0xe: { // 8xyE: SHL Vx
            const src = this.quirks.shiftUsesVy ? this.V[y] : this.V[x];
            const msb = (src & 0x80) >> 7;
            this.V[x] = (src << 1) & 0xff;
            this.V[0xf] = msb;
            break;
          }
        }
        break;

      case 0x9000:
        // 9xy0: SNE Vx, Vy
        if (n === 0 && this.V[x] !== this.V[y]) this.PC = (this.PC + 2) & 0xfff;
        break;

      case 0xa000:
        // Annn: LD I, addr
        this.I = nnn;
        break;

      case 0xb000: {
        // Bnnn: JP V0, addr (or JP Vx, addr in SCHIP)
        const offset = this.quirks.jumpUsesVx ? this.V[x] : this.V[0];
        this.PC = (nnn + offset) & 0xfff;
        break;
      }

      case 0xc000:
        // Cxnn: RND Vx, byte
        this.V[x] = Math.floor(Math.random() * 256) & nn;
        break;

      case 0xd000: {
        // Dxyn: DRW Vx, Vy, nibble
        const startX = this.V[x] % DISPLAY_WIDTH;
        const startY = this.V[y] % DISPLAY_HEIGHT;
        this.V[0xf] = 0;

        for (let row = 0; row < n; row++) {
          const spriteByte = this.memory[(this.I + row) & 0xfff];
          let py = startY + row;
          if (py >= DISPLAY_HEIGHT) {
            if (this.quirks.wrapSprites) py %= DISPLAY_HEIGHT;
            else break;
          }

          for (let col = 0; col < 8; col++) {
            if ((spriteByte & (0x80 >> col)) !== 0) {
              let px = startX + col;
              if (px >= DISPLAY_WIDTH) {
                if (this.quirks.wrapSprites) px %= DISPLAY_WIDTH;
                else continue;
              }

              const idx = py * DISPLAY_WIDTH + px;
              if (this.display[idx] === 1) {
                this.V[0xf] = 1; // Pixel collision detected
              }
              this.display[idx] ^= 1;
            }
          }
        }
        this.drawFlag = true;
        break;
      }

      case 0xe000:
        if (nn === 0x9e) {
          // Ex9E: SKP Vx
          if (this.keys[this.V[x] & 0xf] === 1) this.PC = (this.PC + 2) & 0xfff;
        } else if (nn === 0xa1) {
          // ExA1: SKNP Vx
          if (this.keys[this.V[x] & 0xf] === 0) this.PC = (this.PC + 2) & 0xfff;
        }
        break;

      case 0xf000:
        switch (nn) {
          case 0x07: // Fx07: LD Vx, DT
            this.V[x] = this.delayTimer;
            break;
          case 0x0a: // Fx0A: LD Vx, K (blocking wait for key press)
            this.waitingForKeyReg = x;
            break;
          case 0x15: // Fx15: LD DT, Vx
            this.delayTimer = this.V[x];
            break;
          case 0x18: // Fx18: LD ST, Vx
            this.soundTimer = this.V[x];
            break;
          case 0x1e: // Fx1E: ADD I, Vx
            this.I = (this.I + this.V[x]) & 0xfff;
            break;
          case 0x29: // Fx29: LD F, Vx (font sprite address for hex digit Vx)
            this.I = FONTSET_START + (this.V[x] & 0xf) * 5;
            break;
          case 0x33: { // Fx33: LD B, Vx (BCD representation at I, I+1, I+2)
            const val = this.V[x];
            this.memory[this.I & 0xfff] = Math.floor(val / 100);
            this.memory[(this.I + 1) & 0xfff] = Math.floor((val % 100) / 10);
            this.memory[(this.I + 2) & 0xfff] = val % 10;
            break;
          }
          case 0x55: // Fx55: LD [I], Vx
            for (let idx = 0; idx <= x; idx++) {
              this.memory[(this.I + idx) & 0xfff] = this.V[idx];
            }
            if (this.quirks.incrementIOnLoadStore) {
              this.I = (this.I + x + 1) & 0xfff;
            }
            break;
          case 0x65: // Fx65: LD Vx, [I]
            for (let idx = 0; idx <= x; idx++) {
              this.V[idx] = this.memory[(this.I + idx) & 0xfff];
            }
            if (this.quirks.incrementIOnLoadStore) {
              this.I = (this.I + x + 1) & 0xfff;
            }
            break;
        }
        break;
    }
  }

  /**
   * Run-length encodes active pixels per row into horizontal spans.
   * Reduces 2,048 React Native Views down to ~15-60 Views for 60FPS pure-TSX rendering.
   */
  public getPixelRuns(): PixelRun[] {
    const runs: PixelRun[] = [];
    const buf = this.display;
    for (let row = 0; row < DISPLAY_HEIGHT; row++) {
      const rowOffset = row * DISPLAY_WIDTH;
      let col = 0;
      while (col < DISPLAY_WIDTH) {
        if (buf[rowOffset + col] === 1) {
          const start = col;
          while (col < DISPLAY_WIDTH && buf[rowOffset + col] === 1) {
            col++;
          }
          runs.push({ row, col: start, len: col - start });
        } else {
          col++;
        }
      }
    }
    return runs;
  }

  public getSnapshot(): CpuSnapshot {
    let activePixels = 0;
    for (let i = 0; i < this.display.length; i++) {
      if (this.display[i] === 1) activePixels++;
    }
    return {
      pc: this.PC,
      i: this.I,
      sp: this.SP,
      dt: this.delayTimer,
      st: this.soundTimer,
      v: Array.from(this.V),
      lastOpcode: this.lastOpcode,
      disasm: disassembleOpcode(this.lastOpcode),
      cycleCount: this.cycleCount,
      halted: this.halted,
      waitingForKey: this.waitingForKeyReg >= 0,
      activePixels,
    };
  }
}
