/**
 * RetroDeck-8 Built-in 8-Bit Cartridge Library
 *
 * Authentic CHIP-8 arcade masterpieces & classic cartridge ROMs encoded in Base64.
 * Swapping a cartridge simply loads its romBase64 into Chip8CPU at 0x200!
 */

import { Chip8Asm } from './assembler';
import { Chip8Quirks } from './Chip8CPU';

export interface GamepadMapping {
  up?: number;
  down?: number;
  left?: number;
  right?: number;
  a?: number;
  b?: number;
  upLabel?: string;
  downLabel?: string;
  leftLabel?: string;
  rightLabel?: string;
  aLabel?: string;
  bLabel?: string;
}

export interface RetroCartridge {
  id: string;
  title: string;
  subtitle: string;
  year: string;
  genre: string;
  romBase64: string;
  byteLength: number;
  recommendedIps: number; // Instructions per frame (at 60fps)
  defaultPalette: 'phosphor' | 'nokia' | 'amber' | 'crimson' | 'oled';
  controlsHint: string;
  gamepad: GamepadMapping;
  quirks?: Partial<Chip8Quirks>;
}

// =========================================================================
// AUTHENTIC PUBLIC DOMAIN CHIP-8 MASTERPIECES (BASE64 BINARIES)
// =========================================================================

/** SPACE INVADERS by David Winter (1978) - 1301 Bytes */
export const ROM_SPACE_INVADERS =
  'EiVTUEFDRSBJTlZBREVSUyAwLjkxIEJ5IERhdmlkIFdJTlRFUmAAYQBiCKPd0BhxCPIeMSASLXAIYQAwQBItaQVsFW4AI5FgCvAV8AcwABJLI5F+ARJFZgBoHGkAagRrCmwEbTxuDwDgI3UjUf0VYATgnhJ9I3U4AHj/I3VgBuCeEosjdTg5eAEjdTYAEp9gBeCeEulmAWUbhICj2dRRo9nUUXX/Nf8SrWYAEunUUT8BEunUUWYAg0BzA4O1YviDImIIMwASySN9ggZDCBLTMxAS1SN9ggYzGBLdI32CBkMgEuczKBLpI30+ABMHeQZJGGkAagRrCmwEffRuDwDgI1Ejdf0VEm/3BzcAEm/9FSNRi6Q7EhMbfAJq/DsCEyN8AmoEI1E8GBJvAOCk3WAUYQhiD9AfcAjyHjAsEzNg//AV8AcwABNB8AoA4KcG/mUSJaPB+R5hCCNpgQYjaYEGI2mBBiNpe9AA7oDggBIwANvGewwA7qPZYBzYBADuI1GOIyNRYAXwGPAV8AcwABOJAO5qAI3gawTpoRJXpgz9HvBlMP8Tr2oAawRtAW4BE5elCvAe28Z7CH0BegE6BxOXAO48fv//mZl+//8kJOd+/zw8ftuBQjx+/9sQOHz+AAB/AD8AfwAAAAEBAQMDAwMAAD8gICAgICAgID8ICP8AAP4A/AD+AAAAfkJCYmJiYgAA/wAAAAAAAAAA/wAA/wB9AEF9BX19AADCwsZEbCg4AAD/AAAAAAAAAAD/AAD/APcQFPf3BAQAAHxE/sLCwsIAAP8AAAAAAAAAAP8AAP8A7yAo6OgvLwAA+YXFxcXF+QAA/wAAAAAAAAAA/wAA/wC+ACAwIL6+AAD3BOeFhYT0AAD/AAAAAAAAAAD/AAD/AAB/AD8AfwAAAO8o7wDgYG8AAP8AAAAAAAAAAP8AAP8AAP4A/AD+AAAAwADAwMDAwAAA/AQEBAQEBAQE/BAQ//mBuYuamvoA+oqampuZ+OYlJfQ0NDQAFxQ0NzYmx99QUFzY2N8A3xEfEhsZ2XxE/oaGhvyE/oKC/v6AwMDA/vyCwsLC/P6A+MDA/v6A8MDAwP6AvoaG/oaG/oaGhhAQEBAQEBgYGEhIeJyQsMCwnICAwMDA/u6SkoaGhv6ChoaGhnyChoaGfP6C/sDAwHyCwsrEev6G/pCchP7A/gIC/v4QMDAwMIKCwsLC/oKCgu44EIaGlpKS7oJEODhEgoKC/jAwMP4CHvCA/gAAAAAGBgAAAGBgwAAAAAAAABgYGBgAGHzGDBgAGAAA/v4AAP6ChoaG/ggICBgYGP4C/sDA/v4CHgYG/oTExP4EBP6A/gYG/sDAwP6C/v4CAgYGBnxE/oaG/v6C/gYGBkT+RET+RKioqKioqKhsWgAMGKgwTn4AEhhmbKhaZlQkZgBISBgSqAaQqBIAfjASqIQwTnIYZqioqKioqJBUeKhIeGxyqBIYbHJmVJCocioYqDBOfgASGGZsqHJUqFpmGH4YTnKocioYMGaoME5+AGwwVE6cqKioqKioqEhUfhiokFR4ZqhsKjBaqIQwciqo2KgAThKo5KKoAE4SqGwqVFRyqIQwciqo3pyocioYqAxUSFp4chhmqGYYWlRmcmyocioAcqhyKhioME5+ABIYZmyoAGYYqDBODGYYAGwwTiSocioYMGaoHlRmDBicqCRUVBKoQngMPKiuqKioqKioqP8AAAAAAAAAAAAAAAAAAAA=';

/** TETRIS by Fran Dachille (1991) - 494 Bytes */
export const ROM_TETRIS =
  'orQj5iK2cAHQETAlEgZx/9ARYBrQEWAlMQASDsRwRHASHMMDYB5hAyJc9RXQFD8BEjzQFHH/0BQjQBIc56EicuihIoTpoSKW4p4SUGYA9hX2BzYAEjzQFHEBEiqixPQeZgBDAWYEQwJmCEMDZgz2HgDu0BRw/yM0PwEA7tAUcAEjNADu0BRwASM0PwEA7tAUcP8jNADu0BRzAUMEYwAiXCM0PwEA7tAUc/9D/2MDIlwjNADugABnBWgGaQRhH2UQYgcA7kDgAABAwEAAAOBAAEBgQABAQGAAIOAAAMBAQAAA4IAAQEDAAADgIABgQEAAgOAAAEDAgADAYAAAQMCAAMBgAACAwEAAAGDAAIDAQAAAYMAAwMAAAMDAAADAwAAAwMAAAEBAQEAA8AAAQEBAQADwAADQFGY1dv82ABM4AO6itIwQPB58ATwefAE8HnwBI15LCiNykcAA7nEBE1BgG2sA0BE/AHsB0BFwATAlE2IA7mAb0BFwATAlE3SOEI3gfv9gG2sA0OE/ABOQ0OETlNDRewFwATAlE4ZLABOmff9+/z0BE4IjwD8BI8B6ASPAgKBtB4DSQAR1/kUCZQQA7qcA8lWoBPoz8mXwKW0ybgDd5X0F8Snd5X0F8ind5acA8mWitADuagBgGQDuNyM=';

/** BRIX (BREAKOUT) by Andreas Gustafsson (1990) - 280 Bytes */
export const ROM_BRIX =
  'bgVlAGsGagCjDNqxegQ6QBIIewI7EhIGbCBtH6MQ3NEi9mAAYQCjEtARcAijDtARYEDwFfAHMAASNMYPZx5oAWn/ow7WcaMQ3NFgBOChfP5gBuChfAJgP4wC3NGjDtZxhoSHlGA/hgJhH4cSRx8SrEYAaAFGP2j/RwBpAdZxPwESqkcfEqpgBYB1PwASqmAB8BiAYGH8gBKjDNBxYP6JAyL2dQEi9kVgEt4SRmn/gGCAxT8BEsphAoAVPwES4IAVPwES7oAVPwES6GAg8BijDn7/gOCABGEA0BE+ABIwEt54/0j+aP8S7ngBSAJoAWAE8Bhp/xJwoxT1M/Jl8SljN2QA00VzBfIp00UA7uAAgAD8AKoAAAAAAA==';

/** BLINKY (PAC-MAN) by Hans Christian Egeberg (1991) - 2356 Bytes */
export const ROM_BLINKY =
  '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AMAAAACAgAAAwICAgMAAgAAMCAgICAgICAgICAgICAgNDAgICAgICAgICAgICAgIDQplBQUFBeUFBeUFBQUFxQoKZQUFBQXlBQXlBQUFBcUKCgUMCAgPBQwNBQgICA0FDg8FDAgIDwUMDQUICAgNBQoKBQplBgWVCgo1BQXFCjUFBZUKZQUFlQoKNQUGxQoFCgoFDwUICAgICAwIDwUICAgICA8FCAgMCAgICA8FDwUKCnUFtQUFBQXFCmUFtQXlBQXlBbUFxQplBQUFBbUF1QoKBQwICAgIDQUPBQwIDwUIDwUICA0FDwUMCAgICA0FCg8FD2UFBcUKNeWVCmUFsAUFtQXFCjXllQplBQXFDwUPB3QF1QgPBQ4PBQgPBQwICAgIDQUIDwUIDwUID3UF1AcKBQo1BQX1BQW1BQXVCAgNDAgPdQUFtQUF9QUFlQoFCgoFCAgIDQUMCAgIDTUFxQoKZQWVDAgICA0FDAgIDwUKCnUFBsUKBQgICAgICA8FCA8FCAgICAgIDwUKZQYF1QoKBQwNBQo1BQUFBeUFBfUFBfUFBeUFBQUFlQoFDA0FCgoFCA8FCAgICAgPBQwNBQgPBQwNBQgICAgIDwUIDwUKCjUFBbUFBQUFBQWVCgo1BQWVCgo1BQUFBQUFtQUFlQoICAgICAgICAgICAgPCAgICAgPCAgICAgICAgICAgIDzxCmZlCPAEQD3iEMjKEeAAQ4Hj8/v6EeAAQ4A==';

/** UFO by Lutz V (1977 / 1992) - 224 Bytes */
export const ROM_UFO =
  'os1pOGoI2aOi0GsAbAPbw6LWZB1lH9RRZwBoDyKiIqxIABIiZB5lHKLT1FNuAGaAbQTtoWb/bQXtoWYAbQbtoWYBNoAi2KLQ28PNAYvU28M/ABKSos3Zo80BPQBt/3n+2aM/ABKMTgASLqLT1FNFABKGdf+EZNRTPwESRm0IjVJNCBKMEpIirHj/Eh4ioncFEpYioncPIqJtA/0YotPUUxKGovj3M2MAIrYA7qL4+DNjMiK2AO5tG/Jl8CnT1XMF8SnT1XMF8inT1QDuAXz+fGDwYEDgoPjUbgFtEP0YAO4=';

// =========================================================================
// PROCEDURAL RETRO CARTRIDGES (PONG & BIOS BENCHMARK)
// =========================================================================

function buildPongRom(): string {
  const a = new Chip8Asm();

  a.label('init')
    .cls()
    .ld(0, 12) // Player Y
    .ld(1, 12) // AI Y
    .ld(6, 0)  // Player score
    .ld(7, 0)  // AI score
    .jp('serve_ball');

  a.label('serve_ball')
    .cls()
    .ld(2, 31) // Ball X
    .rnd(3, 0x0f)
    .add(3, 8) // Ball Y in 8..23
    .ld(4, 1)  // VX = +1
    .ld(5, 1)  // VY = +1
    .call('draw_all');

  a.label('loop')
    .ld(10, 2)
    .ldToDt(10)
    .label('wait_dt')
    .ldFromDt(10)
    .se(10, 0)
    .jp('wait_dt')

    .call('draw_objects')

    // Player UP (key 0x1)
    .ld(8, 0x1)
    .sknp(8)
    .jp('p_up')
    .jp('check_p_down')
    .label('p_up')
    .se(0, 1)
    .add(0, 255) // -1

    // Player DOWN (key 0x4)
    .label('check_p_down')
    .ld(8, 0x4)
    .sknp(8)
    .jp('p_down')
    .jp('ai_move')
    .label('p_down')
    .se(0, 25)
    .add(0, 1)

    // Simple AI tracks Ball Y
    .label('ai_move')
    .ldReg(8, 1)
    .add(8, 2)
    .subReg(8, 3)
    .se(15, 0)
    .jp('ai_up')
    .se(1, 25)
    .add(1, 1)
    .jp('move_ball')
    .label('ai_up')
    .se(1, 1)
    .add(1, 255)

    .label('move_ball')
    .addReg(2, 4)
    .addReg(3, 5)

    // Bounce top/bottom (Y <= 0 or Y >= 30)
    .se(3, 0)
    .jp('check_bottom')
    .ld(5, 1)
    .ld(10, 2)
    .ldToSt(10)
    .jp('check_left_paddle')

    .label('check_bottom')
    .se(3, 30)
    .jp('check_left_paddle')
    .ld(5, 255)
    .ld(10, 2)
    .ldToSt(10)

    // Left Paddle Check (Anti-Tunneling & Full Hitbox)
    .label('check_left_paddle')
    .se(2, 3)
    .jp('chk_left_x2')
    .jp('eval_left_hit')
    .label('chk_left_x2')
    .se(2, 2)
    .jp('chk_left_goal')

    .label('eval_left_hit')
    .ldReg(8, 3)
    .add(8, 1)
    .subReg(8, 0)
    .se(15, 1)
    .jp('chk_left_goal')
    .ld(9, 6)
    .subReg(9, 8)
    .se(15, 1)
    .jp('chk_left_goal')

    // Hit Left Paddle!
    .ld(4, 1)
    .ld(2, 3)
    .se(8, 0)
    .jp('chk_lh1')
    .ld(5, 255)
    .label('chk_lh1')
    .se(8, 1)
    .jp('chk_lh2')
    .ld(5, 255)
    .label('chk_lh2')
    .se(8, 5)
    .jp('chk_lh6')
    .ld(5, 1)
    .label('chk_lh6')
    .se(8, 6)
    .jp('beep_l_paddle')
    .ld(5, 1)
    .label('beep_l_paddle')
    .ld(10, 3)
    .ldToSt(10)
    .jp('render_frame')

    .label('chk_left_goal')
    .se(2, 1)
    .jp('chk_l0')
    .jp('ai_scores')
    .label('chk_l0')
    .se(2, 0)
    .jp('check_right_paddle')
    .label('ai_scores')
    .add(7, 1)
    .ld(10, 8)
    .ldToSt(10)
    .se(7, 10)
    .jp('serve_ball')
    .jp('init')

    // Right Paddle Check (AI)
    .label('check_right_paddle')
    .se(2, 58)
    .jp('chk_r59')
    .jp('eval_right_hit')
    .label('chk_r59')
    .se(2, 59)
    .jp('chk_right_goal')

    .label('eval_right_hit')
    .ldReg(8, 3)
    .add(8, 1)
    .subReg(8, 1)
    .se(15, 1)
    .jp('chk_right_goal')
    .ld(9, 6)
    .subReg(9, 8)
    .se(15, 1)
    .jp('chk_right_goal')

    // Hit Right Paddle!
    .ld(4, 255)
    .ld(2, 58)
    .se(8, 0)
    .jp('chk_rh1')
    .ld(5, 255)
    .label('chk_rh1')
    .se(8, 1)
    .jp('chk_rh2')
    .ld(5, 255)
    .label('chk_rh2')
    .se(8, 5)
    .jp('chk_rh6')
    .ld(5, 1)
    .label('chk_rh6')
    .se(8, 6)
    .jp('beep_r_paddle')
    .ld(5, 1)
    .label('beep_r_paddle')
    .ld(10, 3)
    .ldToSt(10)
    .jp('render_frame')

    .label('chk_right_goal')
    .se(2, 61)
    .jp('chk_r62')
    .jp('player_scores')
    .label('chk_r62')
    .se(2, 62)
    .jp('render_frame')
    .label('player_scores')
    .add(6, 1)
    .ld(10, 8)
    .ldToSt(10)
    .se(6, 10)
    .jp('serve_ball')
    .jp('init')

    .label('render_frame')
    .call('draw_objects')
    .jp('loop');

  a.label('draw_all')
    .ld(9, 22)
    .ld(10, 1)
    .ldFont(6)
    .drw(9, 10, 5)
    .ld(9, 38)
    .ldFont(7)
    .drw(9, 10, 5)
    .ldI('spr_net')
    .ld(9, 31)
    .ld(10, 0)
    .drw(9, 10, 8)
    .ld(10, 10)
    .drw(9, 10, 8)
    .ld(10, 20)
    .drw(9, 10, 8)
    .call('draw_objects')
    .ret();

  a.label('draw_objects')
    .ldI('spr_paddle')
    .ld(9, 2)
    .drw(9, 0, 6)
    .ld(9, 60)
    .drw(9, 1, 6)
    .ldI('spr_ball')
    .drw(2, 3, 2)
    .ret();

  a.sprite('spr_paddle', [
    '#.......',
    '#.......',
    '#.......',
    '#.......',
    '#.......',
    '#.......',
  ]);
  a.sprite('spr_ball', [
    '##......',
    '##......',
  ]);
  a.sprite('spr_net', [
    '#.......',
    '........',
    '#.......',
    '........',
    '#.......',
    '........',
    '#.......',
    '........',
  ]);

  return a.toBase64();
}

function buildBootDemoRom(): string {
  const a = new Chip8Asm();

  a.label('init')
    .cls()
    .ld(0, 14).ld(1, 8).ldI('ch_r').drw(0, 1, 7)
    .ld(0, 24).ldI('ch_d').drw(0, 1, 7)
    .ld(0, 34).ldI('ch_dash').drw(0, 1, 7)
    .ld(0, 44).ldI('ch_8').drw(0, 1, 7)
    .ld(2, 6)
    .ld(3, 21)
    .ld(4, 1)
    .ld(5, 1)
    .ldI('spr_orb')
    .drw(2, 3, 4);

  a.label('loop')
    .ld(10, 2)
    .ldToDt(10)
    .label('wait')
    .ldFromDt(10)
    .se(10, 0)
    .jp('wait')

    .ldI('spr_orb')
    .drw(2, 3, 4)

    .addReg(2, 4)
    .addReg(3, 5)

    .se(2, 1)
    .jp('chk_xr')
    .ld(4, 1)
    .jp('chk_yt')
    .label('chk_xr')
    .se(2, 58)
    .jp('chk_yt')
    .ld(4, 255)

    .label('chk_yt')
    .se(3, 18)
    .jp('chk_yb')
    .ld(5, 1)
    .jp('redraw')
    .label('chk_yb')
    .se(3, 27)
    .jp('redraw')
    .ld(5, 255)

    .label('redraw')
    .ldI('spr_orb')
    .drw(2, 3, 4)
    .jp('loop');

  a.sprite('ch_r', [
    '#####...',
    '#....#..',
    '#....#..',
    '#####...',
    '#..#....',
    '#...#...',
    '#....#..',
  ]);
  a.sprite('ch_d', [
    '####....',
    '#...#...',
    '#....#..',
    '#....#..',
    '#....#..',
    '#...#...',
    '####....',
  ]);
  a.sprite('ch_dash', [
    '........',
    '........',
    '........',
    '.####...',
    '........',
    '........',
    '........',
  ]);
  a.sprite('ch_8', [
    '.####...',
    '#....#..',
    '#....#..',
    '.####...',
    '#....#..',
    '#....#..',
    '.####...',
  ]);
  a.sprite('spr_orb', [
    '.##.....',
    '#..#....',
    '#..#....',
    '.##.....',
  ]);

  return a.toBase64();
}

function makeCartridge(
  meta: Omit<RetroCartridge, 'romBase64' | 'byteLength'>,
  romBase64: string
): RetroCartridge {
  const clean = romBase64.replace(/=+$/, '');
  const byteLength = Math.floor((clean.length * 3) / 4);
  return { ...meta, romBase64, byteLength };
}

export const RETRO_CARTRIDGES: RetroCartridge[] = [
  makeCartridge(
    {
      id: 'space-invaders',
      title: 'SPACE INVADERS',
      subtitle: 'Legendary Arcade Invasion',
      year: '1978',
      genre: 'ARCADE',
      recommendedIps: 12,
      defaultPalette: 'phosphor',
      controlsHint: 'LEFT / RIGHT: Move (4/6), FIRE / START: Button A or 5',
      quirks: {
        shiftUsesVy: true,
        incrementIOnLoadStore: true,
        logicResetsVf: true,
        jumpUsesVx: false,
      },
      gamepad: {
        left: 0x4,
        right: 0x6,
        up: 0x5,
        a: 0x5,
        b: 0x5,
        leftLabel: '◀',
        rightLabel: '▶',
        upLabel: 'START',
        aLabel: 'FIRE',
        bLabel: 'FIRE',
      },
    },
    ROM_SPACE_INVADERS
  ),
  makeCartridge(
    {
      id: 'tetris',
      title: 'TETRIS',
      subtitle: 'Original Handheld Puzzle',
      year: '1991',
      genre: 'PUZZLE',
      recommendedIps: 18,
      defaultPalette: 'nokia',
      controlsHint: 'A: Rotate (4), ◀/▶: Move (5/6), B/▼: Drop (7)',
      quirks: {
        shiftUsesVy: false,
        incrementIOnLoadStore: false,
        logicResetsVf: false,
        jumpUsesVx: false,
      },
      gamepad: {
        left: 0x5,
        right: 0x6,
        down: 0x7,
        up: 0x4,
        a: 0x4,
        b: 0x7,
        leftLabel: '◀',
        rightLabel: '▶',
        downLabel: '▼',
        upLabel: 'ROT',
        aLabel: 'ROT',
        bLabel: 'DROP',
      },
    },
    ROM_TETRIS
  ),
  makeCartridge(
    {
      id: 'brix',
      title: 'BRIX (BREAKOUT)',
      subtitle: 'Classic Multi-Row Brick Breaker',
      year: '1990',
      genre: 'ARCADE',
      recommendedIps: 16,
      defaultPalette: 'amber',
      controlsHint: '◀ / ▶: Move Paddle (Keys 4 & 6), Smash all bricks!',
      quirks: {
        shiftUsesVy: false,
        incrementIOnLoadStore: false,
        logicResetsVf: false,
        jumpUsesVx: false,
      },
      gamepad: {
        left: 0x4,
        right: 0x6,
        a: 0x6,
        b: 0x4,
        leftLabel: '◀',
        rightLabel: '▶',
        aLabel: '▶',
        bLabel: '◀',
      },
    },
    ROM_BRIX
  ),
  makeCartridge(
    {
      id: 'blinky',
      title: 'BLINKY (PAC-MAN)',
      subtitle: 'Authentic 8-Bit Maze Runner',
      year: '1991',
      genre: 'MAZE',
      recommendedIps: 30,
      defaultPalette: 'oled',
      controlsHint: 'D-PAD: Navigate maze (3,6,7,8), A: Start (F), B: Select (1)',
      quirks: {
        shiftUsesVy: false,
        incrementIOnLoadStore: false,
        logicResetsVf: false,
        jumpUsesVx: false,
      },
      gamepad: {
        up: 0x3,
        down: 0x6,
        left: 0x7,
        right: 0x8,
        a: 0xf,
        b: 0x1,
        upLabel: '▲',
        downLabel: '▼',
        leftLabel: '◀',
        rightLabel: '▶',
        aLabel: 'START',
        bLabel: 'LVL',
      },
    },
    ROM_BLINKY
  ),
  makeCartridge(
    {
      id: 'ufo',
      title: 'UFO INTERCEPTOR',
      subtitle: '3-Tier Anti-Air Flak Cannon',
      year: '1977',
      genre: 'ACTION',
      recommendedIps: 15,
      defaultPalette: 'crimson',
      controlsHint: 'Shoot flying targets: ◀: Left-Diag (4), ▲/A: Up (5), ▶/B: Right-Diag (6)',
      quirks: {
        shiftUsesVy: true,
        incrementIOnLoadStore: true,
        logicResetsVf: true,
        jumpUsesVx: false,
      },
      gamepad: {
        left: 0x4,
        up: 0x5,
        right: 0x6,
        a: 0x5,
        b: 0x4,
        leftLabel: '◀L',
        upLabel: '▲UP',
        rightLabel: 'R▶',
        aLabel: '▲UP',
        bLabel: '◀L',
      },
    },
    ROM_UFO
  ),
  makeCartridge(
    {
      id: 'pong-8',
      title: 'PONG-8 CYBER',
      subtitle: '1P vs AI Paddle with Spin Deflection',
      year: '1977',
      genre: 'ARCADE',
      recommendedIps: 60,
      defaultPalette: 'phosphor',
      controlsHint: '▲ / ▼: Move paddle (Keys 1 & 4), hit edges to add spin!',
      quirks: {
        shiftUsesVy: false,
        incrementIOnLoadStore: false,
        logicResetsVf: false,
        jumpUsesVx: false,
      },
      gamepad: {
        up: 0x1,
        down: 0x4,
        left: 0x1,
        right: 0x4,
        a: 0x1,
        b: 0x4,
        upLabel: '▲',
        downLabel: '▼',
        aLabel: '▲',
        bLabel: '▼',
      },
    },
    buildPongRom()
  ),
  makeCartridge(
    {
      id: 'boot-demo-8',
      title: 'RD-8 BIOS DEMO',
      subtitle: '64x32 Hardware Benchmark',
      year: '2026',
      genre: 'SYSTEM',
      recommendedIps: 25,
      defaultPalette: 'nokia',
      controlsHint: 'Hardware display & opcode verification ROM',
      quirks: {
        shiftUsesVy: false,
        incrementIOnLoadStore: false,
        logicResetsVf: false,
        jumpUsesVx: false,
      },
      gamepad: {
        up: 0x2,
        down: 0x8,
        left: 0x4,
        right: 0x6,
        a: 0x5,
        b: 0x0,
      },
    },
    buildBootDemoRom()
  ),
];
