/**
 * CertificationsScreen
 *
 * Cross-platform (iOS / Android / Web) screen for managing the current
 * user's licences & certifications (learner's permit, driver's licence,
 * PrDP, K53 instructor cert, etc.).
 *
 * Reachable from both Student and Instructor profile stacks.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '../../theme/ThemeContext';
import ApiService from '../../services/api';

// ─── Types ─────────────────────────────────────────────────

type CertType =
  | 'learners_licence'
  | 'drivers_licence'
  | 'prdp'
  | 'k53_instructor'
  | 'defensive_driving'
  | 'first_aid'
  | 'other';

interface Certification {
  id: number;
  user_id: number;
  cert_type: CertType;
  cert_code?: string | null;
  number?: string | null;
  issuing_authority?: string | null;
  issued_date?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  is_expired: boolean;
  days_until_expiry: number | null;
}

const CERT_TYPE_LABELS: Record<CertType, string> = {
  learners_licence: "Learner's Licence",
  drivers_licence: "Driver's Licence",
  prdp: 'Professional Driving Permit (PrDP)',
  k53_instructor: 'K53 Instructor Certification',
  defensive_driving: 'Defensive Driving',
  first_aid: 'First Aid',
  other: 'Other',
};

const CERT_TYPE_OPTIONS: CertType[] = [
  'learners_licence',
  'drivers_licence',
  'prdp',
  'k53_instructor',
  'defensive_driving',
  'first_aid',
  'other',
];

const emptyForm = {
  cert_type: 'drivers_licence' as CertType,
  cert_code: '',
  number: '',
  issuing_authority: '',
  issued_date: '',
  expiry_date: '',
  notes: '',
};

// ─── Helpers ───────────────────────────────────────────────

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return iso;
}

function expiryBadge(cert: Certification, colors: any) {
  if (!cert.expiry_date) {
    return { label: 'No expiry', bg: colors.surface, fg: colors.textSecondary };
  }
  if (cert.is_expired) {
    return { label: 'Expired', bg: '#fee2e2', fg: '#b91c1c' };
  }
  if (cert.days_until_expiry !== null && cert.days_until_expiry <= 30) {
    return {
      label: `Expires in ${cert.days_until_expiry}d`,
      bg: '#fef3c7',
      fg: '#92400e',
    };
  }
  return { label: 'Valid', bg: '#dcfce7', fg: '#166534' };
}

// ─── Screen ────────────────────────────────────────────────

export default function CertificationsScreen() {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [items, setItems] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.listMyCertifications();
      setItems(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load certifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (cert: Certification) => {
    setEditingId(cert.id);
    setForm({
      cert_type: cert.cert_type,
      cert_code: cert.cert_code || '',
      number: cert.number || '',
      issuing_authority: cert.issuing_authority || '',
      issued_date: cert.issued_date || '',
      expiry_date: cert.expiry_date || '',
      notes: cert.notes || '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = {
        cert_type: form.cert_type,
        cert_code: form.cert_code || null,
        number: form.number || null,
        issuing_authority: form.issuing_authority || null,
        issued_date: form.issued_date || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
      };
      if (editingId !== null) {
        await ApiService.updateMyCertification(editingId, payload);
      } else {
        await ApiService.createMyCertification(payload);
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to save certification');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (cert: Certification) => {
    try {
      await ApiService.deleteMyCertification(cert.id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to delete certification');
    }
  };

  const renderItem = ({ item }: { item: Certification }) => {
    const badge = expiryBadge(item, colors);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {CERT_TYPE_LABELS[item.cert_type] || item.cert_type}
              {item.cert_code ? `  ·  Code ${item.cert_code}` : ''}
            </Text>
            {item.number ? (
              <Text style={styles.cardSubtitle}>No. {item.number}</Text>
            ) : null}
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Issued</Text>
          <Text style={styles.metaValue}>{formatDate(item.issued_date)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Expires</Text>
          <Text style={styles.metaValue}>{formatDate(item.expiry_date)}</Text>
        </View>
        {item.issuing_authority ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Authority</Text>
            <Text style={styles.metaValue}>{item.issuing_authority}</Text>
          </View>
        ) : null}
        {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => openEdit(item)}
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="pencil" size={16} color="#fff" />
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={() => remove(item)}
            style={[styles.actionBtn, { backgroundColor: '#dc2626' }]}
          >
            <Ionicons name="trash" size={16} color="#fff" />
            <Text style={styles.actionText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>My Certifications</Text>
          <Text style={styles.subheading}>
            Track learner's permits, licences and instructor credentials.
          </Text>
        </View>
        <Pressable
          onPress={openAdd}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No certifications yet.</Text>
          <Text style={styles.emptySub}>Tap “Add” to record your first one.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      {/* ─── Add / Edit Modal ─── */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingId !== null ? 'Edit Certification' : 'Add Certification'}
            </Text>

            <Text style={styles.fieldLabel}>Type</Text>
            <Pressable
              style={styles.input}
              onPress={() => setTypePickerOpen((v) => !v)}
            >
              <Text style={{ color: colors.text }}>
                {CERT_TYPE_LABELS[form.cert_type]}
              </Text>
            </Pressable>
            {typePickerOpen ? (
              <View style={styles.pickerList}>
                {CERT_TYPE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt}
                    style={styles.pickerItem}
                    onPress={() => {
                      setForm({ ...form, cert_type: opt });
                      setTypePickerOpen(false);
                    }}
                  >
                    <Text style={{ color: colors.text }}>{CERT_TYPE_LABELS[opt]}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Code (e.g. B, EC1)</Text>
            <TextInput
              style={styles.input}
              value={form.cert_code}
              onChangeText={(t) => setForm({ ...form, cert_code: t })}
              placeholder="B"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.fieldLabel}>Number</Text>
            <TextInput
              style={styles.input}
              value={form.number}
              onChangeText={(t) => setForm({ ...form, number: t })}
              placeholder="Licence / certificate number"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.fieldLabel}>Issuing Authority</Text>
            <TextInput
              style={styles.input}
              value={form.issuing_authority}
              onChangeText={(t) => setForm({ ...form, issuing_authority: t })}
              placeholder="e.g. Department of Transport"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.fieldLabel}>Issued Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.issued_date}
              onChangeText={(t) => setForm({ ...form, issued_date: t })}
              placeholder="2023-04-15"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Expiry Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.expiry_date}
              onChangeText={(t) => setForm({ ...form, expiry_date: t })}
              placeholder="2028-04-15"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              value={form.notes}
              onChangeText={(t) => setForm({ ...form, notes: t })}
              placeholder="Optional"
              placeholderTextColor={colors.textSecondary}
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setModalOpen(false)}
                style={[styles.modalBtn, { backgroundColor: colors.surface }]}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={saving}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '600' }}>
                    {editingId !== null ? 'Save Changes' : 'Add'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────

function useStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    heading: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    subheading: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    addBtnText: { color: '#fff', fontWeight: '600' },
    errorText: {
      color: '#dc2626',
      marginBottom: 8,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 16,
      marginTop: 12,
    },
    emptySub: { color: colors.textSecondary, marginTop: 4 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    cardTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
    cardSubtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeText: { fontSize: 11, fontWeight: '700' },
    metaRow: { flexDirection: 'row', marginTop: 2 },
    metaLabel: {
      color: colors.textSecondary,
      width: 80,
      fontSize: 13,
    },
    metaValue: { color: colors.text, fontSize: 13, flex: 1 },
    notes: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 6,
      fontStyle: 'italic',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      gap: 4,
    },
    actionText: { color: '#fff', fontWeight: '600', fontSize: 13 },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalCard: {
      width: '100%',
      maxWidth: 480,
      maxHeight: '90%',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      ...Platform.select({
        web: { overflow: 'scroll' as any },
        default: {},
      }),
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 12,
    },
    fieldLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 8,
      marginBottom: 4,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 10,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    pickerList: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      marginTop: 4,
      backgroundColor: colors.surface,
    },
    pickerItem: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 16,
    },
    modalBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      minWidth: 100,
      alignItems: 'center',
    },
  });
}
