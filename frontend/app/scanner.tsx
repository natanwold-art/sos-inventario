import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../src/constants/theme';
import {
  getProductByBarcode,
  createMovement,
  Product,
} from '../src/database/db';

export default function Scanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const router = useRouter();

  const playBeep = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/beep.mp3')
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Erro ao tocar som:', error);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    setBarcode(data);
    await playBeep();

    try {
      const product = await getProductByBarcode(data);
      setFoundProduct(product);
    } catch (error) {
      console.log('Erro ao buscar produto pelo código:', error);
      setFoundProduct(null);
    }
  };

  const handleScanAgain = () => {
    setBarcode('');
    setFoundProduct(null);
    setScanned(false);
    setIsProcessingAction(false);
  };

  const handleRegisterNew = () => {
    router.push({
      pathname: '/product/add',
      params: { barcode },
    });
  };

  const handleViewProduct = () => {
    if (!foundProduct) return;
    router.push(`/product/${foundProduct.id}`);
  };

  const handleQuickMovement = async (type: 'entrada' | 'saida') => {
    if (!foundProduct || isProcessingAction) return;

    setIsProcessingAction(true);

    try {
      await createMovement(foundProduct.id, type, 1);

      const delta = type === 'entrada' ? 1 : -1;
      const newQuantity = Math.max(0, foundProduct.quantity + delta);

      setFoundProduct({
        ...foundProduct,
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      });

      Alert.alert(
        'Sucesso',
        type === 'entrada'
          ? 'Entrada registrada com sucesso.'
          : 'Saída registrada com sucesso.'
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível registrar a movimentação.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons
          name="camera-outline"
          size={56}
          color={COLORS.primary}
          style={styles.permissionIcon}
        />
        <Text style={styles.permissionTitle}>Permissão da câmera</Text>
        <Text style={styles.permissionText}>
          Precisamos da câmera para ler o código de barras dos produtos.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Permitir câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View style={styles.overlay}>
        <Text style={styles.title}>Scanner Inteligente</Text>
        <Text style={styles.subtitle}>
          Aponte para o código de barras dentro da área marcada
        </Text>

        <View style={styles.scannerFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>

      <View style={styles.bottomPanel}>
        {!scanned ? (
          <>
            <Text style={styles.helperText}>
              Escaneie um produto para registrar entrada, saída ou cadastrar um novo item.
            </Text>
          </>
        ) : foundProduct ? (
          <>
            <View style={styles.statusHeader}>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
              <Text style={styles.statusTitle}>Produto encontrado</Text>
            </View>

            <Text style={styles.productName}>{foundProduct.name}</Text>
            <Text style={styles.productMeta}>Código: {barcode}</Text>
            <Text style={styles.productMeta}>Categoria: {foundProduct.category}</Text>
            <Text style={styles.productStock}>
              Estoque atual: <Text style={styles.productStockValue}>{foundProduct.quantity}</Text>
            </Text>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[styles.quickButton, styles.entryButton]}
                onPress={() => handleQuickMovement('entrada')}
                disabled={isProcessingAction}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.quickButtonText}>Entrada +1</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickButton, styles.exitButton]}
                onPress={() => handleQuickMovement('saida')}
                disabled={isProcessingAction}
              >
                <Ionicons name="remove-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.quickButtonText}>Saída -1</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.darkButton]}
                onPress={handleScanAgain}
              >
                <Text style={styles.secondaryButtonText}>Escanear novamente</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, styles.primaryButton]}
                onPress={handleViewProduct}
              >
                <Text style={styles.secondaryButtonText}>Ver produto</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.statusHeader}>
              <Ionicons name="alert-circle" size={22} color={COLORS.warning} />
              <Text style={styles.statusTitle}>Produto não encontrado</Text>
            </View>

            <Text style={styles.readLabel}>Código lido</Text>
            <Text style={styles.barcodeValue}>{barcode}</Text>
            <Text style={styles.notFoundText}>
              Esse código ainda não existe no seu banco local.
            </Text>

            <View style={styles.secondaryActionsColumn}>
              <TouchableOpacity
                style={[styles.largeActionButton, styles.primaryButton]}
                onPress={handleRegisterNew}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.secondaryButtonText}>Cadastrar novo produto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.largeActionButton, styles.darkButton]}
                onPress={handleScanAgain}
              >
                <Text style={styles.secondaryButtonText}>Escanear novamente</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const FRAME_WIDTH = 280;
const FRAME_HEIGHT = 180;
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  permissionIcon: {
    marginBottom: SPACING.md,
  },
  permissionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  permissionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONT_SIZES.md,
  },
  overlay: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  title: {
    color: '#fff',
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginBottom: 28,
  },
  scannerFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#22c55e',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 10,
  },
  bottomPanel: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    bottom: 28,
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  helperText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  statusTitle: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  productName: {
    color: '#fff',
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: 8,
  },
  productMeta: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: FONT_SIZES.sm,
    marginBottom: 4,
  },
  productStock: {
    color: '#fff',
    fontSize: FONT_SIZES.sm,
    marginTop: 6,
    marginBottom: SPACING.md,
  },
  productStockValue: {
    fontWeight: '700',
    color: '#22c55e',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  entryButton: {
    backgroundColor: COLORS.success,
  },
  exitButton: {
    backgroundColor: COLORS.danger,
  },
  quickButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  secondaryActionsColumn: {
    gap: SPACING.sm,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  darkButton: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  readLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT_SIZES.sm,
    marginBottom: 6,
    textAlign: 'center',
  },
  barcodeValue: {
    color: '#fff',
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  notFoundText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
});