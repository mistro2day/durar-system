import { View, Text, FlatList, RefreshControl, TouchableOpacity, TextInput, Platform, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
    status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
    tenantName?: string;
    tenant?: { id: number; name: string };
    unit?: { id: number; number: string; property?: { name: string } };
}

const statusLabels: Record<string, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
    ACTIVE: { label: 'نشط', variant: 'success' },
    ENDED: { label: 'منتهي', variant: 'danger' },
    CANCELLED: { label: 'ملغي', variant: 'neutral' },
};

export default function Contracts() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchContracts = async () => {
        try {
            const response = await api.get('/api/contracts');
            const data = Array.isArray(response.data) ? response.data : response.data.items || [];
            setContracts(data);
        } catch (error) {
            console.log('[Contracts] Error:', error);
            setContracts([]);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchContracts();
        setRefreshing(false);
    }, []);

    useEffect(() => {
        fetchContracts();
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

    const filteredContracts = contracts.filter(contract => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const tenantName = (contract.tenant?.name || contract.tenantName || '').toLowerCase();
        const unitNumber = (contract.unit?.number || '').toLowerCase();
        const propertyName = (contract.unit?.property?.name || '').toLowerCase();

        return tenantName.includes(query) || unitNumber.includes(query) || propertyName.includes(query);
    });

    const renderContract = ({ item }: { item: Contract }) => {
        const statusInfo = statusLabels[item.status] || { label: item.status, variant: 'neutral' as const };
        const tenantName = item.tenant?.name || item.tenantName || 'غير محدد';
        const unitNumber = item.unit?.number || '-';
        const propertyName = item.unit?.property?.name || '';

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push(`/contract/${item.id}`)}
            >
                <Card style={{ marginBottom: Spacing.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Ionicons name="chevron-back" size={20} color={colors.textTertiary} style={{ marginTop: 4 }} />
                        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.sm }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                <Badge label={statusInfo.label} variant={statusInfo.variant} />
                                <Text style={{ ...Typography.headline, color: colors.text }}>
                                    وحدة {unitNumber}
                                </Text>
                            </View>
                            <Text style={{ ...Typography.subhead, color: colors.textSecondary, marginTop: Spacing.xs }}>
                                {tenantName} {propertyName ? `• ${propertyName}` : ''}
                            </Text>
                            <Text style={{ ...Typography.caption1, color: colors.textTertiary, marginTop: Spacing.xs }}>
                                {formatDate(item.startDate)} - {formatDate(item.endDate)}
                            </Text>
                            <Text style={{ ...Typography.headline, color: colors.primary, marginTop: Spacing.xs }}>
                                {(item.rentAmount ?? item.amount ?? 0).toLocaleString('en-US')} ر.س
                            </Text>
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
            {/* Floating Search Bar - Liquid Glass Style (Top) */}
            <View style={{
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
                        placeholder="بحث عن عقد، مستأجر أو وحدة..."
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
            </View>

            <FlatList
                data={filteredContracts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderContract}
                contentContainerStyle={{
                    padding: Spacing.md,
                    paddingTop: Platform.OS === 'ios' ? 70 : 80,
                    paddingBottom: 100
                }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', paddingTop: Spacing.xxl }}>
                        <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
                        <Text style={{ ...Typography.body, color: colors.textSecondary, marginTop: Spacing.md }}>
                            لا توجد عقود
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
