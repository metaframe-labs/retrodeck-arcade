import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GAME_TEMPLATES, GameTemplate } from '../arcade/compiler/templates';
import { compileCustomCartridge } from '../arcade/compiler/CartridgeCompiler';
import { ArcadeCartridgeDef } from '../arcade/types';

interface DevCartModalProps {
  visible: boolean;
  accentColor: string;
  onClose: () => void;
  onLoadCustomCartridge: (cart: ArcadeCartridgeDef) => void;
}

export const DevCartModal: React.FC<DevCartModalProps> = ({
  visible,
  accentColor,
  onClose,
  onLoadCustomCartridge,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(GAME_TEMPLATES[0].id);
  const [cartTitle, setCartTitle] = useState('CUSTOM GAME');
  const [code, setCode] = useState(GAME_TEMPLATES[0].code);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);

  const handleSelectTemplate = (tmpl: GameTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setCode(tmpl.code);
    setCartTitle(tmpl.name);
    setErrorMsg(null);
  };

  const handleBurnToCartridge = () => {
    setCompiling(true);
    setErrorMsg(null);

    // Let UI tick once before compiling
    setTimeout(() => {
      const result = compileCustomCartridge(code);

      if (!result.success || !result.game) {
        setErrorMsg(result.error || 'Could not run game code. Please check syntax.');
        setCompiling(false);
        return;
      }

      // Build runnable cartridge definition
      const customCart: ArcadeCartridgeDef = {
        id: `dev-cart-${Date.now()}`,
        title: cartTitle.toUpperCase() || 'CUSTOM GAME',
        subtitle: 'Custom Retro Game Cartridge',
        genre: 'CUSTOM',
        year: '2026',
        defaultPalette: 'nokia',
        controlsHint: 'D-PAD / [A] / [B]: Custom game controls',
        gamepadLabels: {
          up: '▲',
          down: '▼',
          left: '◀',
          right: '▶',
          a: 'A',
          b: 'B',
          upLabel: '▲',
          downLabel: '▼',
          leftLabel: '◀',
          rightLabel: '▶',
          aLabel: 'A',
          bLabel: 'B',
        },
        createGame: () => {
          // Re-compile fresh instance on cartridge restart
          const freshResult = compileCustomCartridge(code);
          return freshResult.game || result.game!;
        },
      };

      setCompiling(false);
      onLoadCustomCartridge(customCart);
      onClose();
    }, 40);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
          <View>
            <View style={styles.badgeRow}>
              <View style={[styles.led, { backgroundColor: accentColor }]} />
              <Text style={[styles.eyebrow, { color: accentColor }]}>
                RETRODECK // GAME STUDIO
              </Text>
            </View>
            <Text style={styles.title}>Design Your Own Game</Text>
          </View>

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#CBD5E1" />
          </Pressable>
        </View>

        {/* Template Selector Bar */}
        <View style={styles.templateSection}>
          <Text style={styles.sectionLabel}>READY-TO-PLAY TEMPLATES:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templateList}
          >
            {GAME_TEMPLATES.map((tmpl) => {
              const isSelected = tmpl.id === selectedTemplateId;
              return (
                <Pressable
                  key={tmpl.id}
                  onPress={() => handleSelectTemplate(tmpl)}
                  style={[
                    styles.templateChip,
                    isSelected && {
                      borderColor: accentColor,
                      backgroundColor: `${accentColor}18`,
                    },
                  ]}
                >
                  <Ionicons
                    name="game-controller-outline"
                    size={12}
                    color={isSelected ? accentColor : '#94A3B8'}
                  />
                  <Text style={[styles.templateText, isSelected && { color: accentColor }]}>
                    {tmpl.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Cartridge Title Input */}
        <View style={styles.titleInputWrap}>
          <Text style={styles.inputPrefix}>GAME TITLE:</Text>
          <TextInput
            style={styles.titleInput}
            value={cartTitle}
            onChangeText={setCartTitle}
            placeholder="Enter game title..."
            placeholderTextColor="#64748B"
            autoCapitalize="characters"
          />
        </View>

        {/* Code Editor */}
        <View style={styles.editorContainer}>
          <View style={styles.editorTopBar}>
            <Text style={styles.editorTitle}>Live Game Code Editor</Text>
            <Text style={styles.editorMeta}>{code.length} Characters</Text>
          </View>
          <TextInput
            style={styles.editorInput}
            value={code}
            onChangeText={(txt) => {
              setCode(txt);
              setErrorMsg(null);
            }}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            textAlignVertical="top"
          />
        </View>

        {/* Error Terminal Banner */}
        {errorMsg && (
          <View style={styles.errorBanner}>
            <View style={styles.errorHeader}>
              <Ionicons name="warning-outline" size={14} color="#FF0055" />
              <Text style={styles.errorTitle}>CODE INSPECTION // ERROR DETECTED</Text>
            </View>
            <Text style={styles.errorText} numberOfLines={4}>
              {errorMsg}
            </Text>
          </View>
        )}

        {/* Bottom Action Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) + 8 }]}>
          <Pressable
            onPress={handleBurnToCartridge}
            disabled={compiling}
            style={[
              styles.burnBtn,
              { backgroundColor: accentColor },
              compiling && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="play" size={18} color="#000000" />
            <Text style={styles.burnBtnText}>
              {compiling ? 'PREPARING...' : 'INSERT CART & PLAY'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#04070B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#16202E',
    backgroundColor: '#090F17',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  led: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#121C2B',
  },
  templateSection: {
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#070C12',
    borderBottomWidth: 1,
    borderBottomColor: '#16202E',
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  templateList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E2D42',
    backgroundColor: '#0D1522',
  },
  templateText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  titleInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#070C12',
    borderBottomWidth: 1,
    borderBottomColor: '#16202E',
    gap: 8,
  },
  inputPrefix: {
    color: '#10B981',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '900',
  },
  titleInput: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    padding: 0,
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#020508',
  },
  editorTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: '#0A101A',
    borderBottomWidth: 1,
    borderBottomColor: '#162235',
  },
  editorTitle: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  editorMeta: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'monospace',
  },
  editorInput: {
    flex: 1,
    padding: 12,
    color: '#00FFAA',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  errorBanner: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 0, 85, 0.14)',
    borderWidth: 1,
    borderColor: '#FF0055',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  errorTitle: {
    color: '#FF0055',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  errorText: {
    color: '#FECDD3',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  footer: {
    padding: 14,
    backgroundColor: '#080E17',
    borderTopWidth: 1,
    borderTopColor: '#16202E',
  },
  burnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  burnBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
});
