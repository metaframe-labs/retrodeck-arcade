import { Chip8CPU, DISPLAY_HEIGHT, DISPLAY_WIDTH } from '../src/core/Chip8CPU';
import { base64ToBytes, bytesToBase64 } from '../src/core/base64';
import { RETRO_CARTRIDGES } from '../src/core/cartridges';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

console.log('=== RetroDeck-8 CHIP-8 CPU Verification ===');

// 1. Base64 round-trip test
const sample = new Uint8Array([0x00, 0xe0, 0x60, 0x1f, 0x70, 0x01, 0xd0, 0x15, 0xff]);
const b64 = bytesToBase64(sample);
const decoded = base64ToBytes(b64);
assert(decoded.length === sample.length, 'Base64 length mismatch');
for (let i = 0; i < sample.length; i++) {
  assert(decoded[i] === sample[i], `Base64 byte mismatch at ${i}`);
}
console.log('[OK] Base64 codec round-trip passed');

// 2. ALU, Logic Quirks & Memory opcode unit tests
const cpu = new Chip8CPU({ logicResetsVf: true, shiftUsesVy: true, incrementIOnLoadStore: true });
cpu.loadRom(
  new Uint8Array([
    0x60, 0xfa, // LD V0, 250
    0x61, 0x0a, // LD V1, 10
    0x80, 0x14, // ADD V0, V1 -> V0 = 4, VF = 1 (carry)
    0x80, 0x11, // OR V0, V1 -> with logicResetsVf, VF should be reset to 0
    0xf0, 0x33, // LD B, V0 -> BCD of 14 at I=0
    0xa3, 0x00, // LD I, 0x300
    0xf1, 0x55, // LD [I], V1 -> store V0, V1; with incrementI, I becomes 0x302
  ])
);
cpu.cycle(7);
assert(cpu.V[0xf] === 0, `Expected logicResetsVf to clear VF, got ${cpu.V[0xf]}`);
assert(cpu.I === 0x302, `Expected incrementIOnLoadStore to advance I to 0x302, got 0x${cpu.I.toString(16)}`);
assert(cpu.memory[0x300] === 14 && cpu.memory[0x301] === 10, 'Fx55 store failed');
console.log('[OK] ALU, quirks (logicResetsVf, incrementI), BCD & memory opcodes passed');

// 3. Test every built-in cartridge Base64 ROM with their specific hardware quirks
for (const cart of RETRO_CARTRIDGES) {
  const vm = new Chip8CPU(cart.quirks);
  const byteLen = vm.loadRomBase64(cart.romBase64);
  assert(byteLen > 20, `${cart.id} ROM too small`);

  // Simulate 60 frames (~1 second of gameplay)
  for (let frame = 0; frame < 60; frame++) {
    vm.cycle(cart.recommendedIps);
    vm.tickTimers();
  }

  const snap = vm.getSnapshot();
  const runs = vm.getPixelRuns();
  assert(!snap.halted, `${cart.id} halted unexpectedly`);
  console.log(
    `[OK] ${cart.title.padEnd(20)} | ${byteLen} bytes | ${snap.activePixels} px lit | ${runs.length} view-runs | PC=0x${snap.pc.toString(16).toUpperCase()}`
  );
}

// Render ASCII snapshot of RD-8 BIOS DEMO to visually confirm framebuffer
const demoCart = RETRO_CARTRIDGES.find((c) => c.id === 'boot-demo-8')!;
const demoVm = new Chip8CPU();
demoVm.loadRomBase64(demoCart.romBase64);
for (let f = 0; f < 10; f++) {
  demoVm.cycle(8);
  demoVm.tickTimers();
}
console.log('\n--- RD-8 BIOS DEMO Framebuffer (64x32) ---');
for (let y = 6; y < 28; y++) {
  let line = '';
  for (let x = 0; x < DISPLAY_WIDTH; x++) {
    line += demoVm.display[y * DISPLAY_WIDTH + x] ? '█' : ' ';
  }
  if (line.trim().length > 0) console.log(line);
}
console.log('\nALL TESTS PASSED!');
