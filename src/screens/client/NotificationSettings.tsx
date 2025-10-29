import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import ScreenWrapper from '../../components/ScreenWrapper';
import { APP_CONFIG, FONTS, TYPOGRAPHY_STYLES } from '../../constants';
import { useAuth } from '../../hooks/redux';
import { db, COLLECTIONS } from '../../config/firebase';

export default function NotificationSettings() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const userRef = doc(db, COLLECTIONS.USERS, user.id);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          setEnabled(data.notificationsEnabled !== false);
        }
      } catch (e) {
        console.warn('Failed to load notification setting');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const persistSetting = async (next: boolean) => {
    if (!user?.id) return;
    try {
      setSaving(true);
      const userRef = doc(db, COLLECTIONS.USERS, user.id);
      await updateDoc(userRef, {
        notificationsEnabled: next,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to update notification settings.');
      setEnabled(prev => !next); // revert UI
    } finally {
      setSaving(false);
    }
  };

  const toggleNotifications = (next: boolean) => {
    setEnabled(next);
    persistSetting(next);
  };

  return (
    <ScreenWrapper title="Notification Settings" showBackButton={true}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications" size={22} color={APP_CONFIG.primaryColor} />
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Enable Notifications</Text>
                <Text style={styles.rowSubtitle}>
                  {enabled ? 'You will receive updates and reminders.' : 'All notifications are turned off.'}
                </Text>
              </View>
            </View>
            <Switch
              value={enabled}
              onValueChange={toggleNotifications}
              disabled={saving || loading}
              trackColor={{ false: '#d1d5db', true: APP_CONFIG.primaryColor }}
              thumbColor={enabled ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.noteBox}>
            <Ionicons name="information-circle-outline" size={18} color={APP_CONFIG.primaryColor} />
            <Text style={styles.noteText}>
              You can stop notifications anytime using the switch above. Turn it back on to resume.
            </Text>
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  rowTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: '#111827',
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  noteBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#4B5563',
    flex: 1,
    marginLeft: 8,
  },
});


