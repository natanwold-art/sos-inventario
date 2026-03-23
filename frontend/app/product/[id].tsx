import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, CATEGORIES } from '../../src/constants/theme';
import {
  getProductById,
  updateProduct,
  deleteProduct,
  createMovement,
  Product,
} from '../../src/database/db';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [category, setCategory] = useState('Geral');
  const [showCategories, setShowCategories] = useState(false);

  // Quick stock adjustment
  const [adjustQuantity, setAdjustQuantity] = useState('1');

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const data = await getProductById(parseInt(id));
      if (data) {
        setProduct(data);
        setName(data.name);
        setBarcode(data.barcode || '');
        setMinQuantity(data.min_quantity.toString());
        setCategory(data.category);
      } else {
        Alert.alert('Erro', 'Produto não encontrado');
        router.back();
      }
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Erro', 'Erro ao carregar produto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Digite o nome do produto');
      return;
    }

    setIsSaving(true);
    try {
      await updateProduct(parseInt(id), {
        name: name.trim(),
        barcode: barcode.trim() || null,
        min_quantity: parseInt(minQuantity) || 5,
        category,
      });
      await loadProduct();
      setIsEditing(false);
      Alert.alert('Sucesso', 'Produto atualizado!');
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        Alert.alert('Erro', 'Já existe um produto com este código de barras');
      } else {
        Alert.alert('Erro', 'Erro ao atualizar produto');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir "${product?.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(parseInt(id));
              router.back();
            } catch (error) {
              Alert.alert('Erro', 'Erro ao excluir produto');
            }
          },
        },
      ]
    );
  };

  const handleStockEntry = async () => {
    const qty = parseInt(adjustQuantity) || 1;
    try {
      await createMovement(parseInt(id), 'entrada', qty);
      await loadProduct();
      Alert.alert('Sucesso', `+${qty} unidades adicionadas!`);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao registrar entrada');
    }
  };

  const handleStockExit = async () => {
    const qty = parseInt(adjustQuantity) || 1;
    if (product && qty > product.quantity) {
      Alert.alert('Atenção', `Estoque atual: ${product.quantity} unidades`);
      return;
    }
    try {
      await createMovement(parseInt(id), 'saida', qty);
      await loadProduct();
      Alert.alert('Sucesso', `-${qty} unidades removidas!`);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao registrar saída');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!product) return null;

  const isLowStock = product.quantity <= product.min_quantity;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Stock Status Card */}
        <View style={[styles.stockCard, isLowStock && styles.stockCardWarning]}>
          <View style={styles.stockInfo}>
            <Text style={styles.stockLabel}>Estoque Atual</Text>
            <Text style={[styles.stockQuantity, isLowStock && styles.stockQuantityWarning]}>
              {product.quantity}
            </Text>
            <Text style={styles.stockUnit}>unidades</Text>
          </View>
          {isLowStock && (
            <View style={styles.warningBadge}>
              <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
              <Text style={styles.warningText}>Estoque baixo!</Text>
            </View>
          )}
        </View>

        {/* Quick Stock Adjustment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ajuste Rápido</Text>
          <View style={styles.adjustContainer}>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => {
                  const current = parseInt(adjustQuantity) || 1;
                  setAdjustQuantity(Math.max(1, current - 1).toString());
                }}
              >
                <Ionicons name="remove" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TextInput
                style={styles.qtyInput}
                value={adjustQuantity}
                onChangeText={setAdjustQuantity}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => {
                  const current = parseInt(adjustQuantity) || 0;
                  setAdjustQuantity((current + 1).toString());
                }}
              >
                <Ionicons name="add" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.adjustButtons}>
              <TouchableOpacity
                style={[styles.adjustBtn, styles.entryBtn]}
                onPress={handleStockEntry}
              >
                <Ionicons name="arrow-down-circle" size={20} color="#FFFFFF" />
                <Text style={styles.adjustBtnText}>Entrada</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustBtn, styles.exitBtn]}
                onPress={handleStockExit}
              >
                <Ionicons name="arrow-up-circle" size={20} color="#FFFFFF" />
                <Text style={styles.adjustBtnText}>Saída</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Product Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dados do Produto</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Ionicons
                name={isEditing ? 'close' : 'create-outline'}
                size={22}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nome</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Código de Barras</Text>
                <TextInput
                  style={styles.input}
                  value={barcode}
                  onChangeText={setBarcode}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Estoque Mínimo</Text>
                <TextInput
                  style={styles.input}
                  value={minQuantity}
                  onChangeText={setMinQuantity}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Categoria</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowCategories(!showCategories)}
                >
                  <Text style={styles.selectButtonText}>{category}</Text>
                  <Ionicons
                    name={showCategories ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
                {showCategories && (
                  <View style={styles.categoriesContainer}>
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryOption,
                          category === cat && styles.categoryOptionSelected,
                        ]}
                        onPress={() => {
                          setCategory(cat);
                          setShowCategories(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.categoryOptionText,
                            category === cat && styles.categoryOptionTextSelected,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.saveBtnText}>
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Nome</Text>
                <Text style={styles.detailValue}>{product.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Código de Barras</Text>
                <Text style={styles.detailValue}>{product.barcode || 'Não informado'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estoque Mínimo</Text>
                <Text style={styles.detailValue}>{product.min_quantity} unidades</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Categoria</Text>
                <Text style={styles.detailValue}>{product.category}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
          <Text style={styles.deleteButtonText}>Excluir Produto</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  stockCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  stockCardWarning: {
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  stockInfo: {
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  stockQuantity: {
    fontSize: 56,
    fontWeight: '700',
    color: COLORS.text,
  },
  stockQuantityWarning: {
    color: COLORS.danger,
  },
  stockUnit: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  warningText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.danger,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  adjustContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  qtyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qtyInput: {
    width: 80,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    textAlign: 'center',
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    backgroundColor: COLORS.background,
  },
  adjustButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  adjustBtn: {
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
  adjustBtnText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  detailLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  selectButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  categoriesContainer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    maxHeight: 150,
  },
  categoryOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  categoryOptionSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  categoryOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  categoryOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  supplierButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  supplierButtonText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  deleteButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.danger,
  },
});
