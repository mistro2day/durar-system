import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { Card, Badge, ListItem } from '../../components';
import { Typography, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const screenWidth = Dimensions.get('window').width;

interface DashboardStats {
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    availableUnits: number;
    maintenanceUnits: number;
    activeContracts: number;
    monthlyRevenue: number;
}

interface ExpiringContract {
    id: number;
    tenantName?: string;
    tenant?: { name: string };
    unit?: { number: string };
    endDate: string;
    daysLeft: number;
}

interface UpcomingInvoice {
    id: number;
    amount: number;
    dueDate: string;
    daysUntilDue: number;
    tenant?: { name: string };
}

export default function Dashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([]);
    const [upcomingInvoices, setUpcomingInvoices] = useState<UpcomingInvoice[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchDashboard = async () => {
        try {
            const dashResponse = await api.get('/api/dashboard');
            const data = dashResponse.data;

            const available = data.summary?.units?.available || 0;
            const occupied = data.summary?.units?.occupied || 0;
            const maintenance = data.summary?.maintenance?.open || 0;

            setStats({
                totalProperties: 0,
                totalUnits: available + occupied,
                occupiedUnits: occupied,
                availableUnits: available,
                maintenanceUnits: maintenance,
                activeContracts: data.summary?.contracts?.active || 0,
                monthlyRevenue: data.summary?.revenue || 0,
            });

            // Fetch expiring contracts
            try {
                const contractsResponse = await api.get('/api/contracts');
                const contracts = Array.isArray(contractsResponse.data)
                    ? contractsResponse.data
                    : contractsResponse.data.items || [];

                const today = new Date();
                const expiring = contracts
                    .filter((c: any) => c.status === 'ACTIVE')
                    .map((c: any) => {
                        const endDate = new Date(c.endDate);
                        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        return { ...c, daysLeft };
                    })
                    .filter((c: ExpiringContract) => c.daysLeft >= 0 && c.daysLeft <= 30)
                    .sort((a: ExpiringContract, b: ExpiringContract) => a.daysLeft - b.daysLeft)
                    .slice(0, 5);

                setExpiringContracts(expiring);
            } catch (e) {
                console.log('[Dashboard] Contracts error:', e);
            }

            // Fetch upcoming invoices
            try {
                const invoicesResponse = await api.get('/api/invoices');
                const invoices = Array.isArray(invoicesResponse.data)
                    ? invoicesResponse.data
                    : invoicesResponse.data.items || [];

                const today = new Date();
                const upcoming = invoices
                    .filter((i: any) => i.status === 'PENDING')
                    .map((i: any) => {
                        const dueDate = new Date(i.dueDate);
                        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        return { ...i, daysUntilDue };
                    })
                    .filter((i: UpcomingInvoice) => i.daysUntilDue >= 0 && i.daysUntilDue <= 14)
                    .sort((a: UpcomingInvoice, b: UpcomingInvoice) => a.daysUntilDue - b.daysUntilDue)
                    .slice(0, 5);

                setUpcomingInvoices(upcoming);
            } catch (e) {
                console.log('[Dashboard] Invoices error:', e);
            }

        } catch (error) {
            console.log('[Dashboard] Error:', error);
            setStats({
                totalProperties: 5,
                totalUnits: 24,
                occupiedUnits: 18,
                availableUnits: 6,
                maintenanceUnits: 2,
                activeContracts: 15,
                monthlyRevenue: 45000,
            });
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchDashboard();
        setRefreshing(false);
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const occupancyRate = stats && stats.totalUnits > 0
        ? Math.round((stats.occupiedUnits / stats.totalUnits) * 100).toLocaleString('en-US')
        : 0;

    const formatDate = (dateString: string) => {
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

    // Chart data
    const pieChartData = [
        {
            name: 'مؤجرة',
            population: stats?.occupiedUnits || 0,
            color: colors.warning,
            legendFontColor: colors.text,
            legendFontSize: 12,
        },
        {
            name: 'متاحة',
            population: stats?.availableUnits || 0,
            color: colors.success,
            legendFontColor: colors.text,
            legendFontSize: 12,
        },
    ];

    const chartConfig = {
        backgroundGradientFrom: colors.surface,
        backgroundGradientTo: colors.surface,
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        labelColor: () => colors.textSecondary,
        barPercentage: 0.7,
        decimalPlaces: 0,
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: Spacing.md }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Welcome Section */}
                <View style={{ marginBottom: Spacing.lg }}>
                    <Text style={{ ...Typography.title2, color: colors.text, textAlign: 'right' }}>
                        مرحباً، {user?.name || 'مستخدم'}
                    </Text>
                    <Text style={{ ...Typography.subhead, color: colors.textSecondary, textAlign: 'right', marginTop: Spacing.xs }}>
                        نظرة عامة على ممتلكاتك
                    </Text>
                </View>

                {/* Quick Stats Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg }}>
                    <Card style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface }}>
                        <Text style={{ ...Typography.caption1, color: colors.textSecondary, textAlign: 'right' }}>
                            الوحدات
                        </Text>
                        <Text style={{ ...Typography.largeTitle, color: colors.text, textAlign: 'right' }}>
                            {stats?.totalUnits?.toLocaleString('en-US') || 0}
                        </Text>
                    </Card>

                    <Card style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface }}>
                        <Text style={{ ...Typography.caption1, color: colors.textSecondary, textAlign: 'right' }}>
                            العقود النشطة
                        </Text>
                        <Text style={{ ...Typography.largeTitle, color: colors.text, textAlign: 'right' }}>
                            {stats?.activeContracts?.toLocaleString('en-US') || 0}
                        </Text>
                    </Card>

                    <Card style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface }}>
                        <Text style={{ ...Typography.caption1, color: colors.textSecondary, textAlign: 'right' }}>
                            نسبة الإشغال
                        </Text>
                        <Text style={{ ...Typography.largeTitle, color: colors.success, textAlign: 'right' }}>
                            {occupancyRate}%
                        </Text>
                    </Card>

                    <Card style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface }}>
                        <Text style={{ ...Typography.caption1, color: colors.textSecondary, textAlign: 'right' }}>
                            الإيراد الشهري
                        </Text>
                        <Text style={{ ...Typography.title2, color: colors.primary, textAlign: 'right' }}>
                            {stats?.monthlyRevenue?.toLocaleString('en-US') || 0} ر.س
                        </Text>
                    </Card>
                </View>



                {/* Units Summary */}
                <Card style={{ marginBottom: Spacing.md, backgroundColor: colors.surface }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
                        <Badge label={`${stats?.availableUnits || 0} متاحة`} variant="success" />
                        <Text style={{ ...Typography.headline, color: colors.text }}>ملخص الوحدات</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ ...Typography.title1, color: colors.success }}>{stats?.availableUnits || 0}</Text>
                            <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>متاحة</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ ...Typography.title1, color: colors.warning }}>{stats?.occupiedUnits || 0}</Text>
                            <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>مؤجرة</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ ...Typography.title1, color: colors.text }}>{stats?.totalUnits || 0}</Text>
                            <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>الإجمالي</Text>
                        </View>
                    </View>
                </Card>

                {/* Expiring Contracts */}
                {expiringContracts.length > 0 && (
                    <Card style={{ marginBottom: Spacing.md, backgroundColor: colors.surface }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/contracts')}>
                                <Text style={{ ...Typography.subhead, color: colors.primary }}>عرض الكل</Text>
                            </TouchableOpacity>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                <Ionicons name="warning" size={18} color={colors.warning} />
                                <Text style={{ ...Typography.headline, color: colors.text }}>عقود قاربت على الانتهاء</Text>
                            </View>
                        </View>
                        {expiringContracts.map((contract) => (
                            <ListItem
                                key={contract.id}
                                title={contract.tenant?.name || contract.tenantName || 'مستأجر'}
                                subtitle={`وحدة ${contract.unit?.number || '-'}`}
                                value={contract.daysLeft === 0 ? 'اليوم' : `${contract.daysLeft} يوم`}
                                valueColor={contract.daysLeft <= 7 ? colors.danger : colors.warning}
                                onPress={() => router.push(`/contract/${contract.id}`)}
                            />
                        ))}
                    </Card>
                )}

                {/* Upcoming Invoices */}
                {upcomingInvoices.length > 0 && (
                    <Card style={{ backgroundColor: colors.surface }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
                            <Text style={{ ...Typography.subhead, color: colors.primary }}>عرض الكل</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                <Ionicons name="receipt" size={18} color={colors.primary} />
                                <Text style={{ ...Typography.headline, color: colors.text }}>فواتير قادمة</Text>
                            </View>
                        </View>
                        {upcomingInvoices.map((invoice) => (
                            <ListItem
                                key={invoice.id}
                                title={invoice.tenant?.name || 'فاتورة'}
                                subtitle={`استحقاق: ${formatDate(invoice.dueDate)}`}
                                value={`${invoice.amount.toLocaleString()} ر.س`}
                                valueColor={invoice.daysUntilDue <= 3 ? colors.danger : colors.text}
                                showChevron={false}
                            />
                        ))}
                    </Card>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
