import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import {
  activateLicenseOnline,
  getLicenseStatus,
  getTrialInfo,
} from '../src/services/license';

export default function SubscriptionScreen() {
  const router = useRouter();

  const [activationCode, setActivationCode] = useState('');
  const [trialRemainingDays, setTrialRemainingDays] = useState(0);
  const [loading, setLoading] = useState(false);

  const PIX_KEY = '71988720448';
  const WHATSAPP_NUMBER = '5571988720448';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const trial = await getTrialInfo();
      const status = await getLicenseStatus();

      setTrialRemainingDays(trial.remainingDays);

      if (status.hasAccess) {
        router.replace('/dashboard' as any);
      }
    } catch (error) {
      console.error('Erro ao carregar status da licença:', error);
    }
  };

  const handleActivate = async () => {
    if (!activationCode.trim()) {
      Alert.alert('Atenção', 'Digite o código de liberação.');
      return;
    }

    try {
      setLoading(true);

      const result = await activateLicenseOnline(activationCode);

      if (!result.success) {
        Alert.alert('Erro', result.message);
        return;
      }

      Alert.alert('Sucesso', result.message);
      router.replace('/dashboard' as any);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível ativar a licença.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = async () => {
    try {
      await Clipboard.setStringAsync(PIX_KEY);
      Alert.alert('Copiado', 'Chave Pix copiada com sucesso.');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível copiar a chave Pix.');
    }
  };

  const handleOpenWhatsApp = async () => {
    try {
      const message = encodeURIComponent(
        'Olá! Fiz o pagamento do SOS Inventário e quero meu código de liberação.'
      );

      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ative o SOS Inventário</Text>

      <Text style={styles.subtitle}>
        Seu período grátis terminou. Para continuar usando o app, escolha um
        plano, faça o pagamento via Pix e receba seu código de liberação.
      </Text>

      <View style={styles.alertBox}>
        <Text style={styles.alertTitle}>Teste grátis</Text>
        <Text style={styles.alertText}>
          Dias restantes: <Text style={styles.bold}>{trialRemainingDays}</Text>
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Planos</Text>

      <View style={styles.planCard}>
        <Text style={styles.planName}>Plano Mensal</Text>
        <Text style={styles.planPrice}>R$ 29,90</Text>
        <Text style={styles.planDesc}>Acesso por 30 dias</Text>
      </View>

      <View style={styles.planCard}>
        <Text style={styles.planName}>Plano Trimestral</Text>
        <Text style={styles.planPrice}>R$ 79,90</Text>
        <Text style={styles.planDesc}>Acesso por 90 dias</Text>
      </View>

      <View style={styles.planCard}>
        <Text style={styles.planName}>Plano Anual</Text>
        <Text style={styles.planPrice}>R$ 249,90</Text>
        <Text style={styles.planDesc}>Acesso por 365 dias</Text>
      </View>

      <Text style={styles.sectionTitle}>Pagamento</Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Chave Pix</Text>
        <Text style={styles.infoValue}>{PIX_KEY}</Text>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleCopyPix}>
          <Text style={styles.secondaryButtonText}>Copiar chave Pix</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Suporte e liberação</Text>
        <Text style={styles.infoValue}>WhatsApp: +{WHATSAPP_NUMBER}</Text>

        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={handleOpenWhatsApp}
        >
          <Text style={styles.whatsappButtonText}>Falar no WhatsApp</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Código de liberação</Text>

      <TextInput
        style={styles.input}
        placeholder="Digite seu código"
        value={activationCode}
        onChangeText={setActivationCode}
        autoCapitalize="characters"
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.disabledButton]}
        onPress={handleActivate}
        disabled={loading}
      >
        <Text style={styles.primaryButtonText}>
          {loading ? 'Ativando...' : 'Ativar licença'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Seus dados continuam salvos. Após o pagamento, basta inserir o código
        para liberar novamente o app.
      </Text>
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
  alertBox: {
    backgroundColor: '#FFF4E5',
    borderRadius: 14,
    padding: 16,
    marginBottom: 22,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 6,
  },
  alertText: {
    fontSize: 14,
    color: '#7C2D12',
  },
  bold: {
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginTop: 6,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  planName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  planPrice: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 6,
  },
  planDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
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
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
  footerText: {
    marginTop: 18,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
  },
});