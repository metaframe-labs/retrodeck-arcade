import { transform } from 'sucrase';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance } from '../types';

export interface CompilationResult {
  success: boolean;
  game?: ArcadeGameInstance;
  error?: string;
  compiledJs?: string;
}

export function compileCustomCartridge(sourceCode: string): CompilationResult {
  try {
    // 1. Transform TS & JSX in real time via Sucrase
    const result = transform(sourceCode, {
      transforms: ['jsx', 'typescript', 'imports'],
      jsxPragma: 'React.createElement',
      jsxFragmentPragma: 'React.Fragment',
    });

    const compiledJs = result.code;

    // 2. CommonJS / ES module scope
    const exports: { default?: any; [key: string]: any } = {};
    const module = { exports };

    const sandboxRequire = (name: string) => {
      if (name === 'react') return React;
      if (name === 'react-native') {
        return {
          View,
          Text,
          StyleSheet,
        };
      }
      throw new Error(
        `Module '${name}' is not supported in the Cartridge sandbox. Only 'react' and 'react-native' can be imported.`
      );
    };

    // 3. Evaluate inside Hermes JS VM
    const fn = new Function(
      'React',
      'View',
      'Text',
      'StyleSheet',
      'exports',
      'module',
      'require',
      'console',
      compiledJs
    );

    fn(
      React,
      View,
      Text,
      StyleSheet,
      exports,
      module,
      sandboxRequire,
      console
    );

    const GameClass = exports.default || module.exports?.default || module.exports;

    if (!GameClass) {
      return {
        success: false,
        error: "Code must export a default game class: 'export default class MyGame { ... }'",
        compiledJs,
      };
    }

    const instance: ArcadeGameInstance =
      typeof GameClass === 'function' ? new GameClass() : GameClass;

    if (typeof instance.update !== 'function' || typeof instance.renderEntities !== 'function') {
      return {
        success: false,
        error: "Game class must implement 'update(input, dt)' and 'renderEntities(palette)' methods.",
        compiledJs,
      };
    }

    if (typeof instance.init !== 'function') {
      instance.init = () => {};
    }
    if (typeof instance.reset !== 'function') {
      instance.reset = () => instance.init();
    }
    if (typeof instance.getStats !== 'function') {
      instance.getStats = () => ({
        score: 0,
        highScore: 0,
        lives: 3,
        level: 1,
        gameOver: false,
      });
    }

    return {
      success: true,
      game: instance,
      compiledJs,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}
