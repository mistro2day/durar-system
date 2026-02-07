import { View, Text, FlatList, TextInput, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '../../components';
import { Typography, Spacing, TouchTarget } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

interface Tenant {
    id: number;
    name: string;
    phone: string;
    email?: string;
    nationalId?: string;
    city?: string;
}

export default function Tenants() {
    const router = useRouter();
    const { colors } = useTheme();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const fetchTenants = async () => {
        try {
            const response = await api.get('/api/tenants');
            const data = Array.isArray(response.data) ? response.data : response.data.items || [];
            setTenants(data);
        } catch (error) {
            console.log('[Tenants] Error:', error);
            setTenants([]);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchTenants();
        setRefreshing(false);
    }, []);

    useEffect(() => {
        fetchTenants();
    }, []);

    const filteredTenants = tenants.filter(tenant =>
        (tenant.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (tenant.phone?.includes(search) ?? false) ||
        (tenant.nationalId?.includes(search) ?? false)
    );

    const renderTenant = ({ item }: { item: Tenant }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/tenant/${item.id}`)}
        >
            <Card style={{ marginBottom: Spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Ionicons name="chevron-back" size={20} color={colors.textTertiary} />
                    <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.sm }}>
                        <Text style={{ ...Typography.headline, color: colors.text }}>
                            {item.name || 'مستأجر'}
                        </Text>
                        <Text style={{ ...Typography.subhead, color: colors.textSecondary, marginTop: Spacing.xs }}>
                            {item.phone || '-'}
                        </Text>
                        {item.city && (
                            <Text style={{ ...Typography.caption1, color: colors.textTertiary, marginTop: Spacing.xs }}>
                                {item.city}
                            </Text>
                        )}
                    </View>
                    <View style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: colors.primary + '20',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: Spacing.sm,
                    }}>
                        <Text style={{ ...Typography.headline, color: colors.primary }}>
                            {item.name?.charAt(0) || '؟'}
                        </Text>
                    </View>
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
            {/* Search Bar */}
            <View style={{ padding: Spacing.md }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.surface,
                    borderRadius: 10,
                    paddingHorizontal: Spacing.sm,
                    minHeight: TouchTarget.minHeight,
                }}>
                    <Ionicons name="search" size={20} color={colors.textTertiary} />
                    <TextInput
                        style={{
                            flex: 1,
                            ...Typography.body,
                            color: colors.text,
                            textAlign: 'right',
                            paddingHorizontal: Spacing.sm,
                        }}
                        placeholder="بحث بالاسم أو الهاتف أو الهوية..."
                        placeholderTextColor={colors.textTertiary}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            <FlatList
                data={filteredTenants}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderTenant}
                contentContainerStyle={{ paddingHorizontal: Spacing.md }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', paddingTop: Spacing.xxl }}>
                        <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
                        <Text style={{ ...Typography.body, color: colors.textSecondary, marginTop: Spacing.md }}>
                            لا يوجد مستأجرين
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
