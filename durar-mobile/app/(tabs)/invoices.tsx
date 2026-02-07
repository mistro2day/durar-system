import { View, Text, FlatList, RefreshControl, TouchableOpacity, TextInput, Platform, Keyboard, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, Badge } from '../../components';
import { Typography, Spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

interface Invoice {
    id: number;
    amount: number;
    dueDate: string;
    status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED';
    invoiceNumber?: string;
    tenant?: { id: number; name: string };
    contract?: { id: number; unit?: { number: string } };
    payments?: Array<{ amount: number }>;
}

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'danger' | 'neutral' }> = {
    PENDING: { label: 'مستحقة', variant: 'warning' },
    PAID: { label: 'مدفوعة', variant: 'success' },
    PARTIAL: { label: 'سداد جزئي', variant: 'info' },
    OVERDUE: { label: 'متأخرة', variant: 'danger' },
    CANCELLED: { label: 'ملغية', variant: 'neutral' },
};

export default function Invoices() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'PENDING' | 'PAID' | 'OVERDUE'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Keyboard animation
    const keyboardHeight = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                Animated.spring(keyboardHeight, {
                    toValue: e.endCoordinates.height - (Platform.OS === 'ios' ? 80 : 50),
                    useNativeDriver: false,
                    tension: 100,
                    friction: 12,
                }).start();
            }
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                Animated.spring(keyboardHeight, {
                    toValue: 0,
                    useNativeDriver: false,
                    tension: 100,
                    friction: 12,
                }).start();
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    const fetchInvoices = async () => {
        try {
            const response = await api.get('/api/invoices');
            const data = Array.isArray(response.data) ? response.data : response.data.items || [];
            setInvoices(data);
        } catch (error) {
            console.log('[Invoices] Error:', error);
            setInvoices([]);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchInvoices();
        setRefreshing(false);
    }, []);

    useEffect(() => {
        fetchInvoices();
    }, []);

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

    const filteredInvoices = invoices
        .filter(inv => filter === 'all' || inv.status === filter)
        .filter(inv => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase();
            return (
                inv.tenant?.name?.toLowerCase().includes(query) ||
                inv.invoiceNumber?.toLowerCase().includes(query) ||
                inv.contract?.unit?.number?.toLowerCase().includes(query)
            );
        });

    const pendingCount = invoices.filter(i => i.status === 'PENDING').length;
    const overdueCount = invoices.filter(i => i.status === 'OVERDUE').length;
    const pendingTotal = invoices
        .filter(i => i.status === 'PENDING' || i.status === 'OVERDUE')
        .reduce((sum, i) => sum + (i.amount || 0), 0);

    const renderInvoice = ({ item }: { item: Invoice }) => {
        const statusInfo = statusLabels[item.status] || { label: item.status, variant: 'neutral' as const };
        const tenantName = item.tenant?.name || 'غير محدد';
        const unitNumber = item.contract?.unit?.number || '-';

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push(`/invoice/${item.id}`)}
            >
                <Card style={{ marginBottom: Spacing.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Ionicons name="chevron-back" size={20} color={colors.textTertiary} style={{ marginTop: 4 }} />
                        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.sm }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                <Badge label={statusInfo.label} variant={statusInfo.variant} />
                                <Text style={{ ...Typography.headline, color: colors.primary }}>
                                    {(item.amount || 0).toLocaleString('en-US')} ر.س
                                </Text>
                            </View>
                            {item.status === 'PARTIAL' && (
                                <Text style={{ ...Typography.caption2, color: colors.success, marginBottom: 2 }}>
                                    تم دفع: {(item.payments || []).reduce((s, p) => s + p.amount, 0).toLocaleString('en-US')} ر.س
                                </Text>
                            )}
                            <Text style={{ ...Typography.subhead, color: colors.text, marginTop: Spacing.xs }}>
                                {tenantName}
                            </Text>
                            <Text style={{ ...Typography.caption1, color: colors.textSecondary, marginTop: Spacing.xs }}>
                                وحدة {unitNumber} • استحقاق: {formatDate(item.dueDate)}
                            </Text>
                            {item.invoiceNumber && (
                                <Text style={{ ...Typography.caption1, color: colors.textTertiary, marginTop: Spacing.xs }}>
                                    #{item.invoiceNumber}
                                </Text>
                            )}
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    const FilterButton = ({ value, label }: { value: typeof filter; label: string }) => (
        <TouchableOpacity
            onPress={() => setFilter(value)}
            style={{
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.sm,
                borderRadius: 20,
                backgroundColor: filter === value ? colors.primary : colors.surface,
                marginRight: Spacing.sm,
            }}
        >
            <Text style={{
                ...Typography.subhead,
                color: filter === value ? '#FFFFFF' : colors.textSecondary,
            }}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
            {/* Floating Search Bar - Liquid Glass Style (Top) */}
            <Animated.View style={{
                position: 'absolute',
                top: Platform.OS === 'ios' ? 0 : 10,
                left: Spacing.md,
                right: Spacing.md,
                zIndex: 10,
                borderRadius: 25,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(0, 0, 0, 0.1)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.4 : 0.15,
                shadowRadius: 12,
                elevation: 8,
            }}>
                <BlurView
                    intensity={isDark ? 50 : 90}
                    tint={isDark ? 'dark' : 'light'}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: Spacing.md,
                        paddingVertical: Platform.OS === 'ios' ? 14 : 10,
                        backgroundColor: isDark
                            ? 'rgba(60, 60, 67, 0.8)'
                            : 'rgba(255, 255, 255, 0.85)',
                    }}
                >
                    {/* Top highlight for glass effect */}
                    <View style={{
                        position: 'absolute',
                        top: 0,
                        left: 20,
                        right: 20,
                        height: 1,
                        backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.15)'
                            : 'rgba(255, 255, 255, 0.9)',
                        borderRadius: 1,
                    }} />

                    <Ionicons name="search" size={20} color={colors.primary} />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="بحث عن فاتورة أو مستأجر..."
                        placeholderTextColor={colors.textTertiary}
                        style={{
                            flex: 1,
                            marginHorizontal: Spacing.sm,
                            fontSize: 16,
                            color: colors.text,
                            textAlign: 'right',
                        }}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </BlurView>
            </Animated.View>

            <FlatList
                data={filteredInvoices}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderInvoice}
                contentContainerStyle={{
                    paddingHorizontal: Spacing.md,
                    paddingTop: Platform.OS === 'ios' ? 50 : 60,
                    paddingBottom: 100
                }}
                ListHeaderComponent={
                    <View style={{ paddingTop: Spacing.md }}>
                        {/* Summary Card */}
                        <Card style={{ marginBottom: Spacing.md }}>
                            {/* Total Amount - Hero Section */}
                            <View style={{ alignItems: 'center', marginBottom: Spacing.md }}>
                                <Text style={{ ...Typography.caption1, color: colors.textSecondary, marginBottom: 4 }}>
                                    إجمالي المستحقات
                                </Text>
                                <Text style={{ ...Typography.largeTitle, color: colors.primary, fontWeight: '700' }}>
                                    {pendingTotal.toLocaleString()}
                                </Text>
                                <Text style={{ ...Typography.subhead, color: colors.textSecondary }}>ريال سعودي</Text>
                            </View>

                            {/* Separator */}
                            <View style={{ height: 1, backgroundColor: colors.separator, marginVertical: Spacing.sm }} />

                            {/* Stats Row */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: Spacing.sm }}>
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: colors.warning + '20',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 6,
                                    }}>
                                        <Ionicons name="time-outline" size={20} color={colors.warning} />
                                    </View>
                                    <Text style={{ ...Typography.title2, color: colors.warning, fontWeight: '600' }}>{pendingCount}</Text>
                                    <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>مستحقة</Text>
                                </View>

                                <View style={{ width: 1, backgroundColor: colors.separator, marginHorizontal: Spacing.sm }} />

                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: colors.danger + '20',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 6,
                                    }}>
                                        <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
                                    </View>
                                    <Text style={{ ...Typography.title2, color: colors.danger, fontWeight: '600' }}>{overdueCount}</Text>
                                    <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>متأخرة</Text>
                                </View>

                                <View style={{ width: 1, backgroundColor: colors.separator, marginHorizontal: Spacing.sm }} />

                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: colors.success + '20',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 6,
                                    }}>
                                        <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                                    </View>
                                    <Text style={{ ...Typography.title2, color: colors.success, fontWeight: '600' }}>
                                        {invoices.filter(i => i.status === 'PAID').length}
                                    </Text>
                                    <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>مدفوعة</Text>
                                </View>
                            </View>
                        </Card>

                        {/* Filter Buttons */}
                        <View style={{ flexDirection: 'row', marginBottom: Spacing.sm }}>
                            <FilterButton value="all" label="الكل" />
                            <FilterButton value="PENDING" label="مستحقة" />
                            <FilterButton value="OVERDUE" label="متأخرة" />
                            <FilterButton value="PAID" label="مدفوعة" />
                        </View>
                    </View>
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', paddingTop: Spacing.xxl }}>
                        <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
                        <Text style={{ ...Typography.body, color: colors.textSecondary, marginTop: Spacing.md }}>
                            لا توجد فواتير
                        </Text>
                    </View>
                }
            />


        </SafeAreaView>
    );
}
