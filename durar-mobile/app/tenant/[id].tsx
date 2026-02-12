import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Modal, TextInput, Alert, Image as RNImage } from 'react-native';
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
    endDate?: string;
    rentAmount?: number;
    renewalStatus?: string;
    paymentFrequency?: string;
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
    payments?: { amount: number }[];
}

interface Attachment {
    id: number;
    fileName: string;
    fileType: string;
    filePath: string;
    description?: string;
    createdAt: string;
}

const invoiceStatusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
    PENDING: { label: 'مستحقة', variant: 'warning' },
    PAID: { label: 'مدفوعة', variant: 'success' },
    PARTIAL: { label: 'سداد جزئي', variant: 'info' },
    OVERDUE: { label: 'متأخرة', variant: 'danger' },
    CANCELLED: { label: 'ملغية', variant: 'neutral' },
};

const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
    CONTRACT: "عقد إيجار",
    ID: "هوية وطنية - اقامة - جواز سفر",
    RECEIPT: "إيصال سداد",
    OTHER: "أخرى",
};

export default function TenantDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [renewingContract, setRenewingContract] = useState<Contract | null>(null);
    const [renewalLoading, setRenewalLoading] = useState(false);

    // UI State
    const [showMoreInfo, setShowMoreInfo] = useState(false);
    const [invoicePage, setInvoicePage] = useState(1);
    const INVOICE_PAGE_SIZE = 5;
    const [viewingAttachment, setViewingAttachment] = useState<Attachment | null>(null);

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

                // Fetch Attachments
                const attachmentsResponse = await api.get(`/api/attachments/${id}`);
                setAttachments(attachmentsResponse.data);

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

    const getDownloadUrl = (filePath: string) => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const parts = normalizedPath.split('uploads/');
        const relativePath = parts.length > 1 ? parts[1] : normalizedPath;
        // Use the base URL from api instance logic (needs manual construction here or use api.defaults.baseURL if accessible, assuming fixed known or dynamic)
        // Since we are inside component, we can assume relative path works if backend is proxy, BUT in React Native we need absolute URL.
        // We will fallback to a default dev IP if not set, same as in api.ts
        const baseUrl = "http://192.168.1.21:8080"; // Ideally import from constants
        return `${baseUrl}/uploads/${relativePath}`;
    };

    const DetailRow = ({ label, value }: { label: string; value: string }) => (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs }}>
            <Text style={{ ...Typography.body, color: colors.text }}>{value}</Text>
            <Text style={{ ...Typography.body, color: colors.textSecondary }}>{label}</Text>
        </View>
    );

    // Check if contract is available for renewal (60-day grace period)
    const getRenewalStatus = (contract: Contract) => {
        if (contract.renewalStatus === 'RENEWED') {
            return { canRenew: false, label: 'تم التجديد', color: colors.success };
        }

        if (contract.status === 'ENDED' && contract.endDate) {
            const end = new Date(contract.endDate);
            const now = new Date();
            const diff = now.getTime() - end.getTime();
            const daysSinceEnd = Math.ceil(diff / (1000 * 60 * 60 * 24));

            // Allow renewal within 60 days after contract end
            if (daysSinceEnd >= 0 && daysSinceEnd <= 60) {
                return { canRenew: true, label: 'متاح للتجديد', color: colors.primary };
            }
        }

        return null;
    };

    // Handle contract renewal
    const handleRenewContract = async (startDate: string, endDate: string, amount: number) => {
        if (!renewingContract) return;

        setRenewalLoading(true);
        try {
            await api.post(`/api/contracts/${renewingContract.id}/renew`, {
                startDate,
                endDate,
                amount,
            });
            Alert.alert('نجاح', 'تم تجديد العقد بنجاح');
            setRenewingContract(null);
            // Reload data
            if (id) {
                // Refresh logic... simplified for now
                const contractsResponse = await api.get('/api/contracts');
                const allContracts = Array.isArray(contractsResponse.data)
                    ? contractsResponse.data
                    : contractsResponse.data.items || [];
                const tenantContracts = allContracts.filter(
                    (c: any) => c.tenantId === Number(id) || c.tenant?.id === Number(id)
                );
                setContracts(tenantContracts);
            }
        } catch (error: any) {
            Alert.alert('خطأ', error?.response?.data?.message || 'فشل تجديد العقد');
        } finally {
            setRenewalLoading(false);
        }
    };


    // Calculate invoice summary
    const pendingInvoices = invoices.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE');
    const pendingTotal = pendingInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);

    // Calculate latest active contract remaining days
    const activeContract = contracts.find(c => c.status === 'ACTIVE');
    const remainingInfo = (() => {
        if (!activeContract?.endDate) return null;
        const end = new Date(activeContract.endDate);
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        let color = colors.success;
        let label = `${days} يوم`;

        if (days <= 0) {
            color = colors.danger;
            label = 'منتهي';
        } else if (days <= 30) {
            color = colors.danger;
        } else if (days <= 60) {
            color = colors.warning;
        }

        return { label, color };
    })();

    // Pagination logic
    const totalInvoicePages = Math.ceil(invoices.length / INVOICE_PAGE_SIZE);
    const paginatedInvoices = invoices.slice((invoicePage - 1) * INVOICE_PAGE_SIZE, invoicePage * INVOICE_PAGE_SIZE);

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

                            {/* Invoice Summary - High Contrast */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: Spacing.sm }}>
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <Text style={{ ...Typography.title3, color: '#10B981' }}>{/* Emerald-500 */}
                                        {pendingTotal.toLocaleString()}
                                    </Text>
                                    <Text style={{ ...Typography.caption2, color: '#065F46' }}>{/* Emerald-900 */}
                                        ر.س مستحق
                                    </Text>
                                </View>
                                <View style={{ width: 1, backgroundColor: colors.separator }} />
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <Text style={{ ...Typography.title3, color: pendingInvoices.length > 0 ? '#F59E0B' : '#10B981' }}>
                                        {pendingInvoices.length}
                                    </Text>
                                    <Text style={{ ...Typography.caption2, color: '#78350F' }}>{/* Amber-900 like */}
                                        فواتير معلقة
                                    </Text>
                                </View>
                                {remainingInfo && (
                                    <>
                                        <View style={{ width: 1, backgroundColor: colors.separator }} />
                                        <View style={{ alignItems: 'center', flex: 1 }}>
                                            <Text style={{ ...Typography.title3, color: remainingInfo.color }}>
                                                {remainingInfo.label}
                                            </Text>
                                            <Text style={{ ...Typography.caption2, color: colors.textSecondary }}>باقي للعقد</Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        </Card>

                        {/* Details Card - Collapsible */}
                        <Card style={{ marginBottom: Spacing.md }}>
                            <TouchableOpacity onPress={() => setShowMoreInfo(!showMoreInfo)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
                                <Ionicons name={showMoreInfo ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textTertiary} />
                                <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right' }}>
                                    معلومات المستأجر
                                </Text>
                            </TouchableOpacity>

                            <View style={{ gap: Spacing.sm }}>
                                <DetailRow label="رقم الهوية" value={tenant.nationalId || '-'} />
                                {showMoreInfo && (
                                    <>
                                        <DetailRow label="البريد الإلكتروني" value={tenant.email || '-'} />
                                        <DetailRow label="المدينة" value={tenant.city || '-'} />
                                        <DetailRow label="الدولة" value={tenant.country || '-'} />
                                        <DetailRow label="العنوان" value={tenant.address || '-'} />
                                        <DetailRow label="جهة العمل" value={tenant.employer || '-'} />
                                    </>
                                )}
                            </View>
                        </Card>

                        {/* Emergency Contact - Collapsible inside Show More or separate? Keeping it conditional for now */}
                        {(tenant.emergencyContactName || tenant.emergencyContactPhone) && showMoreInfo && (
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

                        {/* Attachments Section */}
                        <Card style={{ marginBottom: Spacing.md }}>
                            <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.md }}>
                                المرفقات ({attachments.length})
                            </Text>
                            {attachments.length > 0 ? (
                                attachments.map((att, index) => {
                                    const isPdf = att.fileName.toLowerCase().endsWith('.pdf');
                                    return (
                                        <View key={att.id} style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            paddingVertical: Spacing.sm,
                                            borderBottomWidth: index < attachments.length - 1 ? 1 : 0,
                                            borderBottomColor: colors.separator,
                                        }}>
                                            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                                                {/* View/Download Actions */}
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        if (isPdf) {
                                                            Linking.openURL(getDownloadUrl(att.filePath));
                                                        } else {
                                                            setViewingAttachment(att);
                                                        }
                                                    }}
                                                    style={{ padding: 4 }}
                                                >
                                                    <Ionicons name="eye-outline" size={20} color={colors.primary} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => Linking.openURL(getDownloadUrl(att.filePath))}
                                                    style={{ padding: 4 }}
                                                >
                                                    <Ionicons name="download-outline" size={20} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                            </View>

                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1, justifyContent: 'flex-end' }}>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={{ ...Typography.body, color: colors.text, textAlign: 'right' }} numberOfLines={1}>
                                                        {att.description || att.fileName}
                                                    </Text>
                                                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                                                        <Text style={{ ...Typography.caption2, color: colors.textTertiary, marginRight: 4 }}>
                                                            {ATTACHMENT_TYPE_LABELS[att.fileType] || att.fileType}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={{
                                                    width: 40, height: 40, borderRadius: 8,
                                                    backgroundColor: isPdf ? '#FEE2E2' : '#F3E8FF', // Red-100 or Purple-100
                                                    alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <Ionicons
                                                        name={isPdf ? 'document-text' : 'image'}
                                                        size={20}
                                                        color={isPdf ? '#EF4444' : '#A855F7'}
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })
                            ) : (
                                <Text style={{ ...Typography.body, color: colors.textSecondary, textAlign: 'center', padding: Spacing.sm }}>
                                    لا توجد مرفقات
                                </Text>
                            )}
                        </Card>

                        {/* View Attachment Modal */}
                        <Modal
                            visible={!!viewingAttachment}
                            transparent={true}
                            onRequestClose={() => setViewingAttachment(null)}
                            animationType="fade"
                        >
                            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
                                <TouchableOpacity
                                    style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 }}
                                    onPress={() => setViewingAttachment(null)}
                                >
                                    <Ionicons name="close-circle" size={30} color="#FFFFFF" />
                                </TouchableOpacity>
                                {viewingAttachment && (
                                    <RNImage
                                        source={{ uri: getDownloadUrl(viewingAttachment.filePath) }}
                                        style={{ width: '100%', height: '80%', resizeMode: 'contain' }}
                                    />
                                )}
                            </View>
                        </Modal>

                        {/* Contracts */}
                        {contracts.length > 0 && (
                            <Card style={{ marginBottom: Spacing.md }}>
                                <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.md }}>
                                    العقود ({contracts.length})
                                </Text>
                                {contracts.map((contract, index) => {
                                    const renewalInfo = getRenewalStatus(contract);
                                    return (
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
                                                {renewalInfo?.canRenew ? (
                                                    <TouchableOpacity
                                                        onPress={(e) => {
                                                            e.stopPropagation?.();
                                                            setRenewingContract(contract);
                                                        }}
                                                        style={{
                                                            backgroundColor: colors.primary,
                                                            paddingHorizontal: Spacing.sm,
                                                            paddingVertical: Spacing.xs,
                                                            borderRadius: 12,
                                                        }}
                                                    >
                                                        <Text style={{ ...Typography.caption2, color: '#FFFFFF', fontWeight: '600' }}>
                                                            {renewalInfo.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ) : renewalInfo ? (
                                                    <Badge label={renewalInfo.label} variant="success" />
                                                ) : (
                                                    <Badge
                                                        label={contract.status === 'ACTIVE' ? 'نشط' : 'منتهي'}
                                                        variant={contract.status === 'ACTIVE' ? 'success' : 'neutral'}
                                                    />
                                                )}
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
                                    );
                                })}
                            </Card>
                        )}

                        {/* Invoices */}
                        {invoices.length > 0 && (
                            <Card>
                                <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.md }}>
                                    الفواتير ({invoices.length})
                                </Text>
                                {paginatedInvoices.map((invoice, index) => {
                                    const statusKey = (invoice.status || '').toUpperCase();
                                    const statusInfo = invoiceStatusLabels[statusKey] || { label: invoice.status, variant: 'neutral' as const };
                                    return (
                                        <TouchableOpacity
                                            key={invoice.id}
                                            onPress={() => router.push(`/invoice/${invoice.id}`)}
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                paddingVertical: Spacing.sm,
                                                borderBottomWidth: index < paginatedInvoices.length - 1 ? 1 : 0,
                                                borderBottomColor: colors.separator,
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                                <Ionicons name="chevron-back" size={20} color={colors.textTertiary} />
                                                <Badge label={statusInfo.label} variant={statusInfo.variant} />
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                {statusKey === 'PARTIAL' ? (
                                                    <View style={{ alignItems: 'flex-end' }}>
                                                        <Text style={{ ...Typography.body, color: colors.danger, fontWeight: 'bold' }}>
                                                            {((invoice.amount || 0) - (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0)).toLocaleString()} ر.س
                                                        </Text>
                                                        <Text style={{ ...Typography.caption2, color: colors.textSecondary }}>
                                                            متبقي من {invoice.amount.toLocaleString()}
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <Text style={{ ...Typography.body, color: colors.primary }}>
                                                        {(invoice.amount || 0).toLocaleString()} ر.س
                                                    </Text>
                                                )}
                                                <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>
                                                    استحقاق: {formatDate(invoice.dueDate)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                                {/* Pagination Controls */}
                                {totalInvoicePages > 1 && (
                                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: colors.separator }}>
                                        <TouchableOpacity
                                            disabled={invoicePage === 1}
                                            onPress={() => setInvoicePage(p => Math.max(1, p - 1))}
                                            style={{ padding: Spacing.xs, opacity: invoicePage === 1 ? 0.3 : 1 }}
                                        >
                                            <Ionicons name="chevron-back" size={20} color={colors.primary} />
                                        </TouchableOpacity>
                                        <Text style={{ ...Typography.caption1, color: colors.text }}>
                                            {invoicePage} / {totalInvoicePages}
                                        </Text>
                                        <TouchableOpacity
                                            disabled={invoicePage === totalInvoicePages}
                                            onPress={() => setInvoicePage(p => Math.min(totalInvoicePages, p + 1))}
                                            style={{ padding: Spacing.xs, opacity: invoicePage === totalInvoicePages ? 0.3 : 1 }}
                                        >
                                            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </Card>
                        )}
                    </ScrollView>
                </SafeAreaView>
            )}

            {/* Renewal Modal */}
            <Modal
                visible={!!renewingContract}
                transparent
                animationType="fade"
                onRequestClose={() => setRenewingContract(null)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: Spacing.lg,
                }}>
                    <View style={{
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        padding: Spacing.lg,
                        width: '100%',
                        maxWidth: 400,
                    }}>
                        <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'center', marginBottom: Spacing.lg }}>
                            تجديد العقد
                        </Text>

                        {renewingContract && (
                            <RenewalForm
                                contract={renewingContract}
                                onSubmit={handleRenewContract}
                                onCancel={() => setRenewingContract(null)}
                                loading={renewalLoading}
                                colors={colors}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </>

    );
}

// Renewal Form Component
function RenewalForm({
    contract,
    onSubmit,
    onCancel,
    loading,
    colors,
}: {
    contract: Contract;
    onSubmit: (startDate: string, endDate: string, amount: number) => void;
    onCancel: () => void;
    loading: boolean;
    colors: any;
}) {
    // Calculate default dates based on old contract
    const getDefaultDates = () => {
        if (!contract.endDate) {
            const start = new Date();
            const end = new Date();
            end.setFullYear(end.getFullYear() + 1);
            return {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
            };
        }

        const oldEnd = new Date(contract.endDate);
        const oldStart = new Date(contract.endDate);
        oldStart.setFullYear(oldStart.getFullYear() - 1); // Estimate old duration

        const duration = oldEnd.getTime() - oldStart.getTime();
        const newStart = new Date(oldEnd);
        newStart.setDate(newStart.getDate() + 1);
        const newEnd = new Date(newStart.getTime() + duration);

        return {
            start: newStart.toISOString().split('T')[0],
            end: newEnd.toISOString().split('T')[0],
        };
    };

    const defaults = getDefaultDates();
    const [startDate, setStartDate] = useState(defaults.start);
    const [endDate, setEndDate] = useState(defaults.end);
    const [amount, setAmount] = useState((contract.rentAmount || 0).toString());

    const formatDateDisplay = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('ar-SA');
        } catch {
            return dateStr;
        }
    };

    return (
        <View style={{ gap: Spacing.md }}>
            {/* Start Date */}
            <View style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: Spacing.md,
            }}>
                <Text style={{ ...Typography.caption1, color: colors.textSecondary, textAlign: 'right', marginBottom: 4 }}>
                    بداية العقد الجديد
                </Text>
                <Text style={{ ...Typography.body, color: colors.text, textAlign: 'right' }}>
                    {formatDateDisplay(startDate)}
                </Text>
            </View>

            {/* End Date */}
            <View style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: Spacing.md,
            }}>
                <Text style={{ ...Typography.caption1, color: colors.textSecondary, textAlign: 'right', marginBottom: 4 }}>
                    نهاية العقد الجديد
                </Text>
                <Text style={{ ...Typography.body, color: colors.text, textAlign: 'right' }}>
                    {formatDateDisplay(endDate)}
                </Text>
            </View>

            {/* Amount */}
            <View>
                <Text style={{ ...Typography.caption1, color: colors.textSecondary, textAlign: 'right', marginBottom: 4 }}>
                    مبلغ الإيجار (ريال)
                </Text>
                <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    style={{
                        backgroundColor: colors.background,
                        borderRadius: 12,
                        padding: Spacing.md,
                        color: colors.text,
                        textAlign: 'center',
                        fontSize: 18,
                        fontWeight: '600',
                    }}
                />
                <Text style={{ ...Typography.caption2, color: colors.textTertiary, textAlign: 'center', marginTop: 4 }}>
                    نفس المبلغ السابق افتراضياً، يمكنك تعديله.
                </Text>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
                <TouchableOpacity
                    onPress={onCancel}
                    style={{
                        flex: 1,
                        padding: Spacing.md,
                        borderRadius: 12,
                        backgroundColor: colors.separator,
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ ...Typography.body, color: colors.text }}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => onSubmit(startDate, endDate, parseFloat(amount) || 0)}
                    disabled={loading}
                    style={{
                        flex: 1,
                        padding: Spacing.md,
                        borderRadius: 12,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                        opacity: loading ? 0.6 : 1,
                    }}
                >
                    <Text style={{ ...Typography.body, color: '#FFFFFF', fontWeight: '600' }}>
                        {loading ? 'جارٍ التجديد...' : 'تأكيد التجديد'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
