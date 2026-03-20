import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  CATEGORIES,
} from '../../src/constants/theme';
import { createProduct } from '../../src/database/db';

export default function AddProduct() {
  const router = useRouter();
  const { barcode: scannedBarcode } = useLocalSearchParams<{ barcode?: string }>();

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [minQuantity, setMinQuantity] = useState('5');
  const [costPrice, setCostPrice] = useState('0,00');
  const [category, setCategory] = useState('Geral');
  const [showCategories, setShowCategories] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof scannedBarcode === 'string' && scannedBarcode.trim()) {
      setBarcode(scannedBarcode);
    }
  }, [scannedBarcode]);

  const parseCurrencyToNumber = (value: string) => {
    const normalized = value.replace(/\./g, '').replace(',', '.').trim();
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Digite o nome do produto');
      return;
    }

    setIsLoading(true);
    try {
      await createProduct({
        name: name.trim(),
        barcode: barcode.trim() || null,
        quantity: parseInt(quantity) || 0,
        min_quantity: parseInt(minQuantity) || 5,
        category,
        cost_price: parseCurrencyToNumber(costPrice),
      });

      Alert.alert('Sucesso', 'Produto cadastrado com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        Alert.alert('Erro', 'Já existe um produto com este código de barras');
      } else {
        Alert.alert('Erro', 'Erro ao cadastrar produto');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.flex}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome do Produto *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (showCategories) setShowCategories(false);
              }}
              placeholder="Ex: Arroz 5kg"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Código de Barras (opcional)</Text>
            <TextInput
              style={styles.input}
              value={barcode}
              onChangeText={(text) => {
                setBarcode(text);
                if (showCategories) setShowCategories(false);
              }}
              placeholder="Ex: 7891234567890"
              placeholderTextColor={COLORS.textLight}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>Quantidade Inicial</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={(text) => {
                  setQuantity(text);
                  if (showCategories) setShowCategories(false);
                }}
                keyboardType="number-pad"
                selectTextOnFocus
              />
            </View>

            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>Estoque Mínimo</Text>
              <TextInput
                style={styles.input}
                value={minQuantity}
                onChangeText={(text) => {
                  setMinQuantity(text);
                  if (showCategories) setShowCategories(false);
                }}
                keyboardType="number-pad"
                selectTextOnFocus
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Preço de Custo (R$)</Text>
            <TextInput
              style={styles.input}
              value={costPrice}
              onChangeText={(text) => {
                setCostPrice(text);
                if (showCategories) setShowCategories(false);
              }}
              placeholder="Ex: 12,50"
              placeholderTextColor={COLORS.textLight}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Categoria</Text>

            <TouchableOpacity
              style={styles.selectButton}
              activeOpacity={0.85}
              onPress={() => setShowCategories((prev) => !prev)}
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
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="handled"
                >
                  {CATEGORIES.map((cat, index) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        category === cat && styles.categoryOptionSelected,
                        index === CATEGORIES.length - 1 && styles.categoryOptionLast,
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
                      {category === cat && (
                        <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle"
              size={20}
              color={COLORS.primary}
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
              O preço de custo ajuda a calcular o valor total do estoque e o valor em risco dos itens com estoque baixo.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const INPUT_HEIGHT = 58;
const FOOTER_HEIGHT = 92;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: FOOTER_HEIGHT + 28,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    height: INPUT_HEIGHT,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfWidth: {
    flex: 1,
  },
  selectButton: {
    height: INPUT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
  },
  selectButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  categoriesContainer: {
    marginTop: SPACING.sm,
    maxHeight: 220,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  categoryOption: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  categoryOptionLast: {
    borderBottomWidth: 0,
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
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.xs,
  },
  infoIcon: {
    marginTop: 1,
    marginRight: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    gap: SPACING.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});