import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../src/constants/theme';
import {
  getProductByBarcode,
  createMovement,
  createProduct,
  Product,
} from '../src/database/db';

export default function Scanner() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [newProductName, setNewProductName] = useState('');
  const [isNewProduct, setIsNewProduct] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const playBeep = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/buttons/beep-01a.mp3' },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned) return;
    
    const barcode = result.data;
    setScanned(true);
    setLastBarcode(barcode);
    
    await playBeep();
    
    try {
      const product = await getProductByBarcode(barcode);
      if (product) {
        setFoundProduct(product);
        setIsNewProduct(false);
      } else {
        setFoundProduct(null);
        setIsNewProduct(true);
        setNewProductName('');
      }
      setQuantity('1');
      setShowModal(true);
    } catch (error) {
      console.error('Error looking up product:', error);
      Alert.alert('Erro', 'Erro ao buscar produto');
      setScanned(false);
    }
  };

  const handleStockEntry = async () => {
    const qty = parseInt(quantity) || 1;
    
    try {
      if (isNewProduct && lastBarcode) {
        if (!newProductName.trim()) {
          Alert.alert('Atenção', 'Digite o nome do produto');
          return;
        }
        const productId = await createProduct({
          name: newProductName.trim(),
          barcode: lastBarcode,
          quantity: qty,
          min_quantity: 5,
          category: 'Geral',
        });
        Alert.alert('Sucesso', `Produto cadastrado com ${qty} unidades!`);
      } else if (foundProduct) {
        await createMovement(foundProduct.id, 'entrada', qty);
        Alert.alert('Sucesso', `+${qty} unidades adicionadas!`);
      }
      closeModal();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Erro', 'Erro ao processar entrada');
    }
  };

  const handleStockExit = async () => {
    if (!foundProduct) return;
    
    const qty = parseInt(quantity) || 1;
    
    if (qty > foundProduct.quantity) {
      Alert.alert('Atenção', `Estoque atual: ${foundProduct.quantity} unidades`);
      return;
    }
    
    try {
      await createMovement(foundProduct.id, 'saida', qty);
      Alert.alert('Sucesso', `-${qty} unidades removidas!`);
      closeModal();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Erro', 'Erro ao processar saída');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setScanned(false);
    setFoundProduct(null);
    setLastBarcode(null);
    setQuantity('1');
    setNewProductName('');
    setIsNewProduct(false);
  };

  const adjustQuantity = (delta: number) => {
    const current = parseInt(quantity) || 0;
    const newQty = Math.max(1, current + delta);
    setQuantity(newQty.toString());
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={80} color={COLORS.textSecondary} />
        <Text style={styles.permissionTitle}>Permissão de Câmera</Text>
        <Text style={styles.permissionText}>
          Precisamos acessar sua câmera para escanear códigos de barras
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Permitir Acesso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instructionText}>
            Aponte a câmera para o código de barras
          </Text>
        </View>
      </CameraView>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="close" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={closeModal}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {isNewProduct ? (
              <>
                <Ionicons name="cube-outline" size={48} color={COLORS.warning} />
                <Text style={styles.modalTitle}>Novo Produto</Text>
                <Text style={styles.modalBarcode}>Código: {lastBarcode}</Text>
                <TextInput
                  style={styles.nameInput}
                  placeholder="Nome do produto"
                  value={newProductName}
                  onChangeText={setNewProductName}
                  autoFocus
                />
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
                <Text style={styles.modalTitle}>{foundProduct?.name}</Text>
                <Text style={styles.stockInfo}>
                  Estoque atual: {foundProduct?.quantity} unidades
                </Text>
              </>
            )}

            <Text style={styles.quantityLabel}>Quantidade:</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => adjustQuantity(-1)}
              >
                <Ionicons name="remove" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => adjustQuantity(1)}
              >
                <Ionicons name="add" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.entryBtn]}
                onPress={handleStockEntry}
              >
                <Ionicons name="arrow-down-circle" size={24} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>
                  {isNewProduct ? 'Cadastrar' : 'Entrada'}
                </Text>
              </TouchableOpacity>

              {!isNewProduct && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.exitBtn]}
                  onPress={handleStockExit}
                >
                  <Ionicons name="arrow-up-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Saída</Text>
                </TouchableOpacity>
              )}
            </View>

            {!isNewProduct && foundProduct && (
              <TouchableOpacity
                style={styles.detailsLink}
                onPress={() => {
                  closeModal();
                  router.push(`/product/${foundProduct.id}`);
                }}
              >
                <Text style={styles.detailsLinkText}>Ver detalhes do produto</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanArea: {
    width: 280,
    height: 180,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.xl,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  permissionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  permissionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    padding: SPACING.sm,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  modalBarcode: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  stockInfo: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  nameInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.md,
  },
  quantityLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quantityInput: {
    width: 80,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    textAlign: 'center',
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  entryBtn: {
    backgroundColor: COLORS.success,
  },
  exitBtn: {
    backgroundColor: COLORS.danger,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    padding: SPACING.sm,
  },
  detailsLinkText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
  },
});
