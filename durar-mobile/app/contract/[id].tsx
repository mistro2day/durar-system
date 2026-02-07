import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, StyleSheet, Platform } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Badge } from '../../components';
import { Typography, Spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

interface Contract {
    id: number;
    startDate: string;
    endDate: string;
    rentAmount: number;
    amount: number;
    status: string;
    rentalType?: string;
    paymentMethod?: string;
    paymentFrequency?: string;
    deposit?: number;
    ejarContractNumber?: string;
    servicesIncluded?: string;
    notes?: string;
    renewalStatus?: string;
    tenantName?: string;
    tenant?: { id: number; name: string; phone: string };
    unit?: { id: number; number: string; property?: { name: string } };
}

const statusLabels: Record<string, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
    ACTIVE: { label: 'نشط', variant: 'success' },
    ENDED: { label: 'منتهي', variant: 'danger' },
    CANCELLED: { label: 'ملغي', variant: 'neutral' },
};

export default function ContractDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [newAmount, setNewAmount] = useState('');
    const [renewing, setRenewing] = useState(false);

    useEffect(() => {
        const fetchContract = async () => {
            try {
                const response = await api.get('/api/contracts');
                const data = Array.isArray(response.data) ? response.data : response.data.items || [];
                const found = data.find((c: Contract) => c.id === Number(id));
                setContract(found || null);
            } catch (error) {
                console.log('[ContractDetail] Error:', error);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchContract();
    }, [id]);

    const renewalDates = useMemo(() => {
        if (!contract?.startDate || !contract?.endDate) return { start: new Date(), end: new Date() };

        const oldStart = new Date(contract.startDate);
        const oldEnd = new Date(contract.endDate);
        const durationTime = oldEnd.getTime() - oldStart.getTime();

        const start = new Date(oldEnd);
        start.setDate(start.getDate() + 1);

        const end = new Date(start.getTime() + durationTime);

        return { start, end };
    }, [contract]);

    const daysLeft = useMemo(() => {
        if (!contract?.endDate) return 999;
        const end = new Date(contract.endDate);
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }, [contract?.endDate]);

    useEffect(() => {
        if (contract) {
            setNewAmount(String(contract.rentAmount || contract.amount || ''));
        }
    }, [contract]);

    const handleRenew = async () => {
        if (!newAmount) {
            Alert.alert('تنبيه', 'الرجاء إدخال مبلغ الإيجار');
            return;
        }

        setRenewing(true);
        try {
            await api.post(`/api/contracts/${id}/renew`, {
                startDate: renewalDates.start,
                endDate: renewalDates.end,
                amount: Number(newAmount),
            });

            Alert.alert('تم بنجاح', 'تم تجديد العقد بنجاح');
            setShowRenewModal(false);
            // Refresh contract data
            const response = await api.get('/api/contracts');
            const data = Array.isArray(response.data) ? response.data : response.data.items || [];
            const found = data.find((c: Contract) => c.id === Number(id));
            setContract(found || null);
        } catch (error: any) {
            console.log('[ContractRenewal] Error:', error);
            Alert.alert('خطأ', error.response?.data?.message || 'فشل تجديد العقد');
        } finally {
            setRenewing(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return dateString;
        }
    };

    const statusInfo = contract ? (statusLabels[contract.status] || { label: contract.status, variant: 'neutral' as const }) : null;
    const tenantName = contract?.tenant?.name || contract?.tenantName || 'غير محدد';
    const rentAmount = contract?.rentAmount ?? contract?.amount ?? 0;

    const DetailRow = ({ label, value }: { label: string; value: string }) => (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs }}>
            <Text style={{ ...Typography.body, color: colors.text }}>{value}</Text>
            <Text style={{ ...Typography.body, color: colors.textSecondary }}>{label}</Text>
        </View>
    );

    return (
        <>
            <Stack.Screen
                options={{
                    title: contract ? `عقد وحدة ${contract.unit?.number || '-'}` : 'تفاصيل العقد',
                    headerShown: true,
                    headerBackTitle: 'رجوع',
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }}
            />

            {loading ? (
                <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </SafeAreaView>
            ) : !contract ? (
                <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
                    <Text style={{ ...Typography.body, color: colors.textSecondary, marginTop: Spacing.md }}>
                        لم يتم العثور على العقد
                    </Text>
                </SafeAreaView>
            ) : (
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
                    <ScrollView contentContainerStyle={{ padding: Spacing.md }}>
                        {/* Header Card */}
                        <Card style={{ marginBottom: Spacing.md }}>
                            <View style={{ alignItems: 'center' }}>
                                {statusInfo && <Badge label={statusInfo.label} variant={statusInfo.variant} />}
                                <Text style={{ ...Typography.largeTitle, color: colors.primary, marginTop: Spacing.md }}>
                                    {rentAmount.toLocaleString('en-US')} ر.س
                                </Text>
                                <Text style={{ ...Typography.subhead, color: colors.textSecondary, marginTop: Spacing.xs }}>
                                    الإيجار الشهري
                                </Text>
                            </View>
                        </Card>

                        {/* Unit & Tenant */}
                        <Card style={{ marginBottom: Spacing.md }}>
                            <TouchableOpacity
                                onPress={() => contract.unit?.id && router.push(`/unit/${contract.unit.id}`)}
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingVertical: Spacing.sm,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.separator,
                                }}
                            >
                                <Ionicons name="chevron-back" size={20} color={colors.textTertiary} />
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>الوحدة</Text>
                                    <Text style={{ ...Typography.body, color: colors.primary }}>
                                        {contract.unit?.number || '-'} • {contract.unit?.property?.name || ''}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => contract.tenant?.id && router.push(`/tenant/${contract.tenant.id}`)}
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingVertical: Spacing.sm,
                                }}
                            >
                                <Ionicons name="chevron-back" size={20} color={colors.textTertiary} />
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>المستأجر</Text>
                                    <Text style={{ ...Typography.body, color: colors.primary }}>
                                        {tenantName}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </Card>

                        {/* Contract Details */}
                        <Card style={{ marginBottom: Spacing.md }}>
                            <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.md }}>
                                تفاصيل العقد
                            </Text>

                            <View style={{ gap: Spacing.sm }}>
                                <DetailRow label="تاريخ البداية" value={formatDate(contract.startDate)} />
                                <DetailRow label="تاريخ النهاية" value={formatDate(contract.endDate)} />
                                <DetailRow label="نوع الإيجار" value={contract.rentalType || '-'} />
                                <DetailRow label="طريقة الدفع" value={contract.paymentMethod || '-'} />
                                <DetailRow label="دورة الدفع" value={contract.paymentFrequency || '-'} />
                                <DetailRow label="التأمين" value={contract.deposit ? `${contract.deposit.toLocaleString('en-US')} ر.س` : '-'} />
                                <DetailRow label="رقم عقد إيجار" value={contract.ejarContractNumber || '-'} />
                                {contract.renewalStatus === 'RENEWED' && (
                                    <View style={{ marginTop: Spacing.sm, padding: Spacing.sm, backgroundColor: colors.success + '20', borderRadius: 8 }}>
                                        <Text style={{ ...Typography.caption1, color: colors.success, textAlign: 'center' }}>
                                            تم تجديد هذا العقد (يوجد عقد ساري)
                                        </Text>
                                    </View>
                                )}
                                {contract.status === 'ACTIVE' && contract.renewalStatus !== 'RENEWED' && (
                                    daysLeft < 60 ? (
                                        <View style={{ marginTop: Spacing.sm, padding: Spacing.sm, backgroundColor: '#FFF7ED', borderRadius: 8, borderColor: '#FED7AA', borderWidth: 1 }}>
                                            <Text style={{ ...Typography.caption1, color: '#C2410C', textAlign: 'center' }}>
                                                متبقي أقل من 60 يوم - قرار التجديد: تجديد أو إنهاء؟
                                            </Text>
                                        </View>
                                    ) : null
                                )}
                            </View>
                        </Card>

                        {/* Services Included */}
                        {contract.servicesIncluded && (
                            <Card style={{ marginBottom: Spacing.md }}>
                                <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.sm }}>
                                    الخدمات المشمولة
                                </Text>
                                <Text style={{ ...Typography.body, color: colors.textSecondary, textAlign: 'right' }}>
                                    {contract.servicesIncluded}
                                </Text>
                            </Card>
                        )}

                        {/* Notes */}
                        {contract.notes && (
                            <Card>
                                <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.sm }}>
                                    ملاحظات
                                </Text>
                                <Text style={{ ...Typography.body, color: colors.textSecondary, textAlign: 'right' }}>
                                    {contract.notes}
                                </Text>
                            </Card>
                        )}

                        {/* Action Buttons */}
                        {contract.status === 'ACTIVE' && contract.renewalStatus !== 'RENEWED' && daysLeft <= 60 && (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => setShowRenewModal(true)}
                                style={{
                                    backgroundColor: colors.primary,
                                    borderRadius: 12,
                                    paddingVertical: Spacing.md,
                                    alignItems: 'center',
                                    marginTop: Spacing.xl,
                                    marginBottom: Spacing.xl,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                    <Ionicons name="refresh" size={20} color="white" />
                                    <Text style={{ ...Typography.headline, color: 'white' }}>تجديد العقد</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </ScrollView>

                    {/* Renewal Modal */}
                    <Modal
                        visible={showRenewModal}
                        transparent
                        animationType="slide"
                        onRequestClose={() => setShowRenewModal(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity onPress={() => setShowRenewModal(false)}>
                                        <Ionicons name="close" size={24} color={colors.text} />
                                    </TouchableOpacity>
                                    <Text style={[styles.modalTitle, { color: colors.text }]}>تجديد العقد</Text>
                                </View>

                                <View style={styles.modalBody}>
                                    <View style={styles.dateInfoContainer}>
                                        <View style={[styles.dateBox, { backgroundColor: colors.background }]}>
                                            <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>بداية العقد الجديد</Text>
                                            <Text style={[styles.dateValue, { color: colors.text }]}>{renewalDates.start.toLocaleDateString('en-CA')}</Text>
                                        </View>
                                        <View style={[styles.dateBox, { backgroundColor: colors.background }]}>
                                            <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>نهاية العقد الجديد</Text>
                                            <Text style={[styles.dateValue, { color: colors.text }]}>{renewalDates.end.toLocaleDateString('en-CA')}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>مبلغ الإيجار (ريال)</Text>
                                        <TextInput
                                            style={[styles.input, {
                                                backgroundColor: colors.background,
                                                color: colors.text,
                                                borderColor: colors.separator
                                            }]}
                                            keyboardType="numeric"
                                            value={newAmount}
                                            onChangeText={setNewAmount}
                                            placeholder="أدخل المبلغ"
                                            placeholderTextColor={colors.textTertiary}
                                        />
                                        <Text style={styles.inputHint}>نفس المبلغ السابق افتراضياً، يمكنك تعديله.</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={handleRenew}
                                    disabled={renewing}
                                    style={[styles.modalButton, { backgroundColor: colors.primary, opacity: renewing ? 0.7 : 1 }]}
                                >
                                    {renewing ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.modalButtonText}>تأكيد التجديد</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                </SafeAreaView>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: Spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? Spacing.xl * 2 : Spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    modalTitle: {
        ...Typography.title3,
        fontWeight: 'bold',
    },
    modalBody: {
        gap: Spacing.lg,
    },
    dateInfoContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    dateBox: {
        flex: 1,
        padding: Spacing.sm,
        borderRadius: 12,
        alignItems: 'center',
    },
    dateLabel: {
        ...Typography.caption2,
        marginBottom: 4,
    },
    dateValue: {
        ...Typography.body,
        fontWeight: '600',
    },
    inputContainer: {
        gap: Spacing.xs,
    },
    inputLabel: {
        ...Typography.subhead,
        textAlign: 'right',
    },
    input: {
        borderRadius: 12,
        padding: Spacing.md,
        textAlign: 'right',
        fontSize: 16,
        borderWidth: 1,
    },
    inputHint: {
        ...Typography.caption1,
        color: '#666',
        textAlign: 'right',
    },
    modalButton: {
        borderRadius: 12,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    modalButtonText: {
        ...Typography.headline,
        color: 'white',
    },
});
