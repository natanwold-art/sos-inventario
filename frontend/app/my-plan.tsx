import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { getLicenseStatus } from '../src/services/license';

export default function MyPlanScreen() {
  const [loading, setLoading] = useState(true);
  const [license, setLicense] = useState<{
    companyName: string | null;
    ownerName: string | null;
    activationCode: string | null;
    premiumExpiresAt: string | null;
    lastValidatedAt: string | null;
    premiumActive: boolean;
  }>({
    companyName: null,
    ownerName: null,
    activationCode: null,
    premiumExpiresAt: null,
    lastValidatedAt: null,
    premiumActive: false,
  });

  const PIX_KEY = '71988720448';
  const WHATSAPP_NUMBER = '5571988720448';

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const status = await getLicenseStatus();

      setLicense({
        companyName: status.companyName ?? null,
        ownerName: status.ownerName ?? null,
        activationCode: status.activationCode ?? null,
        premiumExpiresAt: status.premiumExpiresAt ?? null,
        lastValidatedAt: status.lastValidatedAt ?? null,
        premiumActive: !!status.premiumActive,
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os dados do plano.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyPix = async () => {
    try {
      await Clipboard.setStringAsync(PIX_KEY);
      Alert.alert('Copiado', 'Chave Pix copiada com sucesso.');
    } catch {
      Alert.alert('Erro', 'Não foi possível copiar a chave Pix.');
    }
  };

  const handleOpenWhatsApp = async () => {
    try {
      const message = encodeURIComponent(
        `Olá! Quero renovar meu plano do SOS Inventário.\n\nCódigo: ${license.activationCode ?? 'N/A'}`
      );

      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    }
  };

  const handleRenewPlan = async () => {
    try {
      await Clipboard.setStringAsync(PIX_KEY);

      Alert.alert(
        'Renovação do plano',
        'A chave Pix foi copiada. Agora envie o comprovante pelo WhatsApp para liberar seu novo período.',
        [
          { text: 'Fechar', style: 'cancel' },
          { text: 'Falar no WhatsApp', onPress: handleOpenWhatsApp },
        ]
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível iniciar a renovação.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Meu Plano</Text>
      <Text style={styles.subtitle}>
        Acompanhe o status da sua licença e renove quando precisar.
      </Text>

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Ionicons
            name={license.premiumActive ? 'checkmark-circle' : 'alert-circle'}
            size={22}
            color={license.premiumActive ? '#16A34A' : '#DC2626'}
          />
          <Text
            style={[
              styles.statusText,
              { color: license.premiumActive ? '#16A34A' : '#DC2626' },
            ]}
          >
            {license.premiumActive ? 'Plano ativo' : 'Plano inativo'}
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.label}>Empresa</Text>
        <Text style={styles.value}>{license.companyName || '—'}</Text>

        <Text style={styles.label}>Responsável</Text>
        <Text style={styles.value}>{license.ownerName || '—'}</Text>

        <Text style={styles.label}>Código ativo</Text>
        <Text style={styles.value}>{license.activationCode || '—'}</Text>

        <Text style={styles.label}>Vencimento</Text>
        <Text style={styles.value}>{formatDate(license.premiumExpiresAt)}</Text>

        <Text style={styles.label}>Última validação</Text>
        <Text style={styles.value}>{formatDate(license.lastValidatedAt)}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Renovação</Text>
        <Text style={styles.helpText}>
          Para renovar seu plano, faça o pagamento via Pix e fale conosco pelo
          WhatsApp para liberar um novo período.
        </Text>

        <Text style={styles.label}>Chave Pix</Text>
        <Text style={styles.value}>{PIX_KEY}</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={handleRenewPlan}>
          <Text style={styles.primaryButtonText}>Renovar plano</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleCopyPix}>
          <Text style={styles.secondaryButtonText}>Copiar chave Pix</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.whatsappButton} onPress={handleOpenWhatsApp}>
          <Text style={styles.whatsappButtonText}>Falar no WhatsApp</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <Text style={styles.loadingText}>Carregando informações do plano...</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F7F8FA',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 20,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontSize: 17,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  helpText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 21,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 10,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  whatsappButton: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loadingText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 20,
  },
});