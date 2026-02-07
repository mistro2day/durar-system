import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Badge } from '../../components';
import { Typography, Spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

interface Contract {
    id: number;
    status: string;
    unit?: {
        number: string;
        property?: { name: string };
    };
}

interface Tenant {
    id: number;
    name: string;
    phone: string;
    email?: string;
    nationalId?: string;
    city?: string;
    country?: string;
    address?: string;
    employer?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    notes?: string;
    contracts?: Contract[];
}

interface Invoice {
    id: number;
    amount: number;
    dueDate: string;
    status: string;
    invoiceNumber?: string;
}

const invoiceStatusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
    PENDING: { label: 'مستحقة', variant: 'warning' },
    PAID: { label: 'مدفوعة', variant: 'success' },
    OVERDUE: { label: 'متأخرة', variant: 'danger' },
    CANCELLED: { label: 'ملغية', variant: 'neutral' },
};

export default function TenantDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch tenant
                const tenantResponse = await api.get(`/api/tenants/${id}`);
                setTenant(tenantResponse.data);

                // Fetch contracts for this tenant
                const contractsResponse = await api.get('/api/contracts');
                const allContracts = Array.isArray(contractsResponse.data)
                    ? contractsResponse.data
                    : contractsResponse.data.items || [];
                // Filter contracts for this tenant
                const tenantContracts = allContracts.filter(
                    (c: any) => c.tenantId === Number(id) || c.tenant?.id === Number(id)
                );
                setContracts(tenantContracts);

                // Fetch invoices for this tenant
                const invoicesResponse = await api.get('/api/invoices');
                const allInvoices = Array.isArray(invoicesResponse.data)
                    ? invoicesResponse.data
                    : invoicesResponse.data.items || [];
                // Filter invoices for this tenant
                const tenantInvoices = allInvoices.filter(
                    (inv: any) => inv.tenantId === Number(id) || inv.tenant?.id === Number(id)
                );
                setInvoices(tenantInvoices);
            } catch (error) {
                console.log('[TenantDetail] Error:', error);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchData();
    }, [id]);

    const handleCall = () => {
        if (tenant?.phone) {
            Linking.openURL(`tel:${tenant.phone}`);
        }
    };

    const handleWhatsApp = () => {
        if (tenant?.phone) {
            const phone = tenant.phone.replace(/^0/, '966');
            Linking.openURL(`whatsapp://send?phone=${phone}`);
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

    const DetailRow = ({ label, value }: { label: string; value: string }) => (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs }}>
            <Text style={{ ...Typography.body, color: colors.text }}>{value}</Text>
            <Text style={{ ...Typography.body, color: colors.textSecondary }}>{label}</Text>
        </View>
    );

    // Calculate invoice summary
    const pendingInvoices = invoices.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE');
    const pendingTotal = pendingInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);

    return (
        <>
            <Stack.Screen
                options={{
                    title: tenant?.name || 'تفاصيل المستأجر',
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
            ) : !tenant ? (
                <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
                    <Text style={{ ...Typography.body, color: colors.textSecondary, marginTop: Spacing.md }}>
                        لم يتم العثور على المستأجر
                    </Text>
                </SafeAreaView>
            ) : (
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
                    <ScrollView contentContainerStyle={{ padding: Spacing.md }}>
                        {/* Header Card with Avatar, Contact & Summary */}
                        <Card style={{ marginBottom: Spacing.md }}>
                            {/* Avatar & Contact Info */}
                            <View style={{ alignItems: 'center', marginBottom: Spacing.md }}>
                                <View style={{
                                    width: 70,
                                    height: 70,
                                    borderRadius: 35,
                                    backgroundColor: colors.primary,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: Spacing.sm,
                                }}>
                                    <Text style={{ ...Typography.title1, color: '#FFFFFF' }}>
                                        {tenant.name?.charAt(0) || '؟'}
                                    </Text>
                                </View>
                                <Text style={{ ...Typography.headline, color: colors.text }}>
                                    {tenant.name}
                                </Text>
                                <Text style={{ ...Typography.subhead, color: colors.textSecondary, marginTop: 2 }}>
                                    {tenant.phone}
                                </Text>

                                {/* Quick Actions */}
                                <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
                                    <TouchableOpacity
                                        onPress={handleCall}
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 22,
                                            backgroundColor: colors.success + '20',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Ionicons name="call" size={22} color={colors.success} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleWhatsApp}
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 22,
                                            backgroundColor: '#25D36620',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Separator */}
                            <View style={{ height: 1, backgroundColor: colors.separator, marginVertical: Spacing.sm }} />

                            {/* Invoice Summary */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: Spacing.sm }}>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ ...Typography.title2, color: colors.primary }}>
                                        {pendingTotal.toLocaleString()}
                                    </Text>
                                    <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>ر.س مستحق</Text>
                                </View>
                                <View style={{ width: 1, backgroundColor: colors.separator }} />
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ ...Typography.title2, color: pendingInvoices.length > 0 ? colors.warning : colors.success }}>
                                        {pendingInvoices.length}
                                    </Text>
                                    <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>فواتير مستحقة</Text>
                                </View>
                            </View>
                        </Card>

                        {/* Details Card */}
                        <Card style={{ marginBottom: Spacing.md }}>
                            <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.md }}>
                                معلومات المستأجر
                            </Text>

                            <View style={{ gap: Spacing.sm }}>
                                <DetailRow label="رقم الهوية" value={tenant.nationalId || '-'} />
                                <DetailRow label="البريد الإلكتروني" value={tenant.email || '-'} />
                                <DetailRow label="المدينة" value={tenant.city || '-'} />
                                <DetailRow label="الدولة" value={tenant.country || '-'} />
                                <DetailRow label="العنوان" value={tenant.address || '-'} />
                                <DetailRow label="جهة العمل" value={tenant.employer || '-'} />
                            </View>
                        </Card>

                        {/* Emergency Contact */}
                        {(tenant.emergencyContactName || tenant.emergencyContactPhone) && (
                            <Card style={{ marginBottom: Spacing.md }}>
                                <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.md }}>
                                    جهة اتصال الطوارئ
                                </Text>
                                <DetailRow label="الاسم" value={tenant.emergencyContactName || '-'} />
                                <DetailRow label="الهاتف" value={tenant.emergencyContactPhone || '-'} />
                            </Card>
                        )}

                        {/* Notes */}
                        {tenant.notes && (
                            <Card style={{ marginBottom: Spacing.md }}>
                                <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.sm }}>
                                    ملاحظات
                                </Text>
                                <Text style={{ ...Typography.body, color: colors.textSecondary, textAlign: 'right' }}>
                                    {tenant.notes}
                                </Text>
                            </Card>
                        )}

                        {/* Contracts */}
                        {contracts.length > 0 && (
                            <Card style={{ marginBottom: Spacing.md }}>
                                <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.md }}>
                                    العقود ({contracts.length})
                                </Text>
                                {contracts.map((contract, index) => (
                                    <TouchableOpacity
                                        key={contract.id}
                                        onPress={() => router.push(`/contract/${contract.id}`)}
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            paddingVertical: Spacing.sm,
                                            borderBottomWidth: index < contracts.length - 1 ? 1 : 0,
                                            borderBottomColor: colors.separator,
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                            <Ionicons name="chevron-back" size={20} color={colors.textTertiary} />
                                            <Badge
                                                label={contract.status === 'ACTIVE' ? 'نشط' : 'منتهي'}
                                                variant={contract.status === 'ACTIVE' ? 'success' : 'neutral'}
                                            />
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ ...Typography.body, color: colors.text }}>
                                                وحدة {contract.unit?.number || '-'}
                                            </Text>
                                            {contract.unit?.property?.name && (
                                                <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>
                                                    {contract.unit.property.name}
                                                </Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </Card>
                        )}

                        {/* Invoices */}
                        {invoices.length > 0 && (
                            <Card>
                                <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.md }}>
                                    الفواتير ({invoices.length})
                                </Text>
                                {invoices.map((invoice, index) => {
                                    const statusInfo = invoiceStatusLabels[invoice.status] || { label: invoice.status, variant: 'neutral' as const };
                                    return (
                                        <TouchableOpacity
                                            key={invoice.id}
                                            onPress={() => router.push(`/invoice/${invoice.id}`)}
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                paddingVertical: Spacing.sm,
                                                borderBottomWidth: index < invoices.length - 1 ? 1 : 0,
                                                borderBottomColor: colors.separator,
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                                <Ionicons name="chevron-back" size={20} color={colors.textTertiary} />
                                                <Badge label={statusInfo.label} variant={statusInfo.variant} />
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ ...Typography.body, color: colors.primary }}>
                                                    {(invoice.amount || 0).toLocaleString()} ر.س
                                                </Text>
                                                <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>
                                                    استحقاق: {formatDate(invoice.dueDate)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </Card>
                        )}
                    </ScrollView>
                </SafeAreaView>
            )}
        </>
    );
}
