import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Badge, Button } from '../../components';
import { Typography, Spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

interface Invoice {
    id: number;
    amount: number;
    dueDate: string;
    paidDate?: string;
    status: string;
    invoiceNumber?: string;
    description?: string;
    notes?: string;
    tenant?: { id: number; name: string; phone?: string };
    contract?: { id: number; unit?: { id: number; number: string; property?: { name: string } } };
}

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
    PENDING: { label: 'مستحقة', variant: 'warning' },
    PAID: { label: 'مدفوعة', variant: 'success' },
    OVERDUE: { label: 'متأخرة', variant: 'danger' },
    CANCELLED: { label: 'ملغية', variant: 'neutral' },
};

export default function InvoiceDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const response = await api.get('/api/invoices');
                const data = Array.isArray(response.data) ? response.data : response.data.items || [];
                const found = data.find((i: Invoice) => i.id === Number(id));
                setInvoice(found || null);
            } catch (error) {
                console.log('[InvoiceDetail] Error:', error);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchInvoice();
    }, [id]);

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

    const handleMarkAsPaid = async () => {
        Alert.alert(
            'تأكيد الدفع',
            'هل تريد تسجيل هذه الفاتورة كمدفوعة؟',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'تأكيد',
                    onPress: async () => {
                        try {
                            await api.patch(`/api/invoices/${id}`, { status: 'PAID', paidDate: new Date().toISOString() });
                            setInvoice(prev => prev ? { ...prev, status: 'PAID', paidDate: new Date().toISOString() } : null);
                        } catch (error) {
                            console.log('[InvoiceDetail] Mark as paid error:', error);
                            Alert.alert('خطأ', 'فشل تحديث الفاتورة');
                        }
                    },
                },
            ]
        );
    };

    const statusInfo = invoice ? (statusLabels[invoice.status] || { label: invoice.status, variant: 'neutral' as const }) : null;
    const tenantName = invoice?.tenant?.name || 'غير محدد';
    const unitNumber = invoice?.contract?.unit?.number || '-';
    const propertyName = invoice?.contract?.unit?.property?.name || '';

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
                    title: invoice?.invoiceNumber ? `فاتورة #${invoice.invoiceNumber}` : 'تفاصيل الفاتورة',
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
            ) : !invoice ? (
                <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
                    <Text style={{ ...Typography.body, color: colors.textSecondary, marginTop: Spacing.md }}>
                        لم يتم العثور على الفاتورة
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
                                    {(invoice.amount || 0).toLocaleString('en-US')} ر.س
                                </Text>
                                {invoice.invoiceNumber && (
                                    <Text style={{ ...Typography.subhead, color: colors.textSecondary, marginTop: Spacing.xs }}>
                                        فاتورة #{invoice.invoiceNumber}
                                    </Text>
                                )}
                            </View>
                        </Card>

                        {/* Tenant & Unit */}
                        <Card style={{ marginBottom: Spacing.md }}>
                            <TouchableOpacity
                                onPress={() => invoice.tenant?.id && router.push(`/tenant/${invoice.tenant.id}`)}
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
                                    <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>المستأجر</Text>
                                    <Text style={{ ...Typography.body, color: colors.primary }}>
                                        {tenantName}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => invoice.contract?.unit?.id && router.push(`/unit/${invoice.contract.unit.id}`)}
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingVertical: Spacing.sm,
                                }}
                            >
                                <Ionicons name="chevron-back" size={20} color={colors.textTertiary} />
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>الوحدة</Text>
                                    <Text style={{ ...Typography.body, color: colors.primary }}>
                                        {unitNumber} {propertyName ? `• ${propertyName}` : ''}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </Card>

                        {/* Invoice Details */}
                        <Card style={{ marginBottom: Spacing.md }}>
                            <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.md }}>
                                تفاصيل الفاتورة
                            </Text>

                            <View style={{ gap: Spacing.sm }}>
                                <DetailRow label="تاريخ الاستحقاق" value={formatDate(invoice.dueDate)} />
                                {invoice.paidDate && (
                                    <DetailRow label="تاريخ الدفع" value={formatDate(invoice.paidDate)} />
                                )}
                                {invoice.description && (
                                    <DetailRow label="الوصف" value={invoice.description} />
                                )}
                            </View>
                        </Card>

                        {/* Notes */}
                        {invoice.notes && (
                            <Card style={{ marginBottom: Spacing.md }}>
                                <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.sm }}>
                                    ملاحظات
                                </Text>
                                <Text style={{ ...Typography.body, color: colors.textSecondary, textAlign: 'right' }}>
                                    {invoice.notes}
                                </Text>
                            </Card>
                        )}

                        {/* Action Button */}
                        {(invoice.status === 'PENDING' || invoice.status === 'OVERDUE') && (
                            <Button
                                title="تسجيل كمدفوعة"
                                onPress={handleMarkAsPaid}
                                variant="primary"
                            />
                        )}
                    </ScrollView>
                </SafeAreaView>
            )}
        </>
    );
}
