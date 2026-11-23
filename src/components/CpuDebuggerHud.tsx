import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CpuSnapshot } from '../core/Chip8CPU';

interface CpuDebuggerHudProps {
  snapshot: CpuSnapshot;
  runCount: number;
  accentColor: string;
}

const h2 = (n: number) => n.toString(16).toUpperCase().padStart(2, '0');
const h3 = (n: number) => n.toString(16).toUpperCase().padStart(3, '0');
const h4 = (n: number) => n.toString(16).toUpperCase().padStart(4, '0');

export const CpuDebuggerHud: React.FC<CpuDebuggerHudProps> = ({
  snapshot,
  runCount,
  accentColor,
}) => {
  return (
    <View style={[styles.box, { borderColor: `${accentColor}33` }]}>
      <View style={styles.topRow}>
        <Text style={[styles.disasm, { color: accentColor }]} numberOfLines={1}>
          {`[${h4(snapshot.lastOpcode)}] ${snapshot.disasm}`}
        </Text>
        <Text style={styles.metaText}>
          {`${snapshot.activePixels}px • ${runCount} runs`}
        </Text>
      </View>

      <View style={styles.sysRow}>
        <Text style={styles.sysItem}>{`PC:${h3(snapshot.pc)}`}</Text>
        <Text style={styles.sysItem}>{`I:${h3(snapshot.i)}`}</Text>
        <Text style={styles.sysItem}>{`SP:${h2(snapshot.sp)}`}</Text>
        <Text style={styles.sysItem}>{`DT:${h2(snapshot.dt)}`}</Text>
        <Text style={styles.sysItem}>{`ST:${h2(snapshot.st)}`}</Text>
      </View>

      <View style={styles.regGrid}>
        {snapshot.v.map((val, idx) => (
          <View key={idx} style={styles.regCell}>
            <Text style={styles.regLabel}>
              {`V${idx.toString(16).toUpperCase()}`}
            </Text>
            <Text style={[styles.regVal, val > 0 && { color: accentColor }]}>
              {h2(val)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#0A0E14',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disasm: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  metaText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  sysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F151E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sysItem: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  regGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  regCell: {
    width: '11.5%',
    backgroundColor: '#0F151E',
    borderRadius: 4,
    paddingVertical: 3,
    alignItems: 'center',
  },
  regLabel: {
    color: '#475569',
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  regVal: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
});
