import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  initLicense,
  isLicenseActive,
  checkLicenseOnline,
  getLicenseStatus,
} from '../src/services/license';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        await initLicense();

        const status = await getLicenseStatus();

        if (!status.trialExpired) {
          router.replace('/dashboard' as any);
          return;
        }

        if (!status.activationCode) {
          router.replace('/subscription' as any);
          return;
        }

        const localAccess = await isLicenseActive();

        if (localAccess) {
          const onlineCheck = await checkLicenseOnline();

          if (onlineCheck.success && onlineCheck.hasAccess) {
            router.replace('/dashboard' as any);
            return;
          }

          router.replace('/dashboard' as any);
          return;
        }

        const onlineCheck = await checkLicenseOnline();

        if (onlineCheck.success && onlineCheck.hasAccess) {
          router.replace('/dashboard' as any);
          return;
        }

        router.replace('/subscription' as any);
      } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        router.replace('/subscription' as any);
      }
    };

    checkAccess();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});