import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, Badge } from '../../components';
import { Typography, Spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

interface Property {
    id: number;
    name: string;
    type: 'HOTEL' | 'BUILDING' | 'COMMERCIAL';
    address?: string;
    units?: Array<{ id: number; status: string }>;
    _count?: { units: number };
}

const typeLabels: Record<string, string> = {
    HOTEL: 'فندق',
    BUILDING: 'مبنى سكني',
    COMMERCIAL: 'تجاري',
};

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    HOTEL: 'bed',
    BUILDING: 'business',
    COMMERCIAL: 'storefront',
};

export default function Properties() {
    const router = useRouter();
    const { colors } = useTheme();
    const [properties, setProperties] = useState<Property[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchProperties = async () => {
        try {
            const response = await api.get('/api/properties');
            const data = Array.isArray(response.data) ? response.data : response.data.items || [];
            setProperties(data);
        } catch (error) {
            console.log('[Properties] Error:', error);
            setProperties([]);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchProperties();
        setRefreshing(false);
    }, []);

    useEffect(() => {
        fetchProperties();
    }, []);

    const getUnitsCount = (property: Property) => {
        const count = property._count?.units ?? property.units?.length ?? 0;
        return count.toLocaleString('en-US');
    };

    const renderProperty = ({ item }: { item: Property }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/property/${item.id}`)}
        >
            <Card style={{ marginBottom: Spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Ionicons name="chevron-back" size={20} color={colors.textTertiary} />
                    <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.sm }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                            <Badge label={typeLabels[item.type] || item.type} variant="info" />
                            <Text style={{ ...Typography.headline, color: colors.text }}>
                                {item.name}
                            </Text>
                        </View>
                        <Text style={{ ...Typography.subhead, color: colors.textSecondary, marginTop: Spacing.xs }}>
                            {getUnitsCount(item)} وحدة
                        </Text>
                        {item.address && (
                            <Text style={{ ...Typography.caption1, color: colors.textTertiary, marginTop: Spacing.xs }}>
                                {item.address}
                            </Text>
                        )}
                    </View>
                    <View style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        backgroundColor: colors.primary + '15',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Ionicons
                            name={typeIcons[item.type] || 'business'}
                            size={22}
                            color={colors.primary}
                        />
                    </View>
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
            <FlatList
                data={properties}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderProperty}
                contentContainerStyle={{ padding: Spacing.md }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', paddingTop: Spacing.xxl }}>
                        <Ionicons name="home-outline" size={48} color={colors.textTertiary} />
                        <Text style={{ ...Typography.body, color: colors.textSecondary, marginTop: Spacing.md }}>
                            لا توجد عقارات
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
