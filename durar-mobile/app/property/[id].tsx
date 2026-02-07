import { View, Text, ScrollView, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Badge } from '../../components';
import { Typography, Spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

interface Unit {
    id: number;
    number: string;
    type: string;
    status: string;
}

interface Property {
    id: number;
    name: string;
    type: string;
    address?: string;
    units?: Unit[];
}

const typeLabels: Record<string, string> = {
    HOTEL: 'فندق',
    BUILDING: 'مبنى سكني',
    COMMERCIAL: 'تجاري',
};

const unitTypeLabels: Record<string, string> = {
    DAILY: 'يومي',
    MONTHLY: 'شهري',
    YEARLY: 'سنوي',
};

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
    AVAILABLE: { label: 'متاحة', variant: 'success' },
    OCCUPIED: { label: 'مؤجرة', variant: 'warning' },
    MAINTENANCE: { label: 'صيانة', variant: 'danger' },
};

export default function PropertyDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const [property, setProperty] = useState<Property | null>(null);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const propResponse = await api.get(`/api/properties/${id}`);
                setProperty(propResponse.data);

                const unitsResponse = await api.get(`/api/units?propertyId=${id}`);
                const unitsData = Array.isArray(unitsResponse.data)
                    ? unitsResponse.data
                    : unitsResponse.data.items || [];
                setUnits(unitsData);
            } catch (error) {
                console.log('[PropertyDetail] Error:', error);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchData();
    }, [id]);

    const available = units.filter(u => u.status === 'AVAILABLE').length;
    const occupied = units.filter(u => u.status === 'OCCUPIED').length;

    const renderUnit = ({ item }: { item: Unit }) => {
        const statusInfo = statusLabels[item.status] || { label: item.status, variant: 'neutral' as const };
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push(`/unit/${item.id}`)}
                style={{ marginBottom: Spacing.sm }}
            >
                <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Ionicons name="chevron-back" size={20} color={colors.textTertiary} />
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                <Badge label={statusInfo.label} variant={statusInfo.variant} />
                                <Text style={{ ...Typography.headline, color: colors.text }}>
                                    وحدة {item.number}
                                </Text>
                            </View>
                            <Text style={{ ...Typography.caption1, color: colors.textSecondary, marginTop: Spacing.xs }}>
                                {unitTypeLabels[item.type] || item.type}
                            </Text>
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    // Always render Stack.Screen first to ensure header styling is applied
    return (
        <>
            <Stack.Screen
                options={{
                    title: property?.name || 'تفاصيل العقار',
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
            ) : !property ? (
                <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
                    <Text style={{ ...Typography.body, color: colors.textSecondary, marginTop: Spacing.md }}>
                        لم يتم العثور على العقار
                    </Text>
                </SafeAreaView>
            ) : (
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
                    <FlatList
                        data={units}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderUnit}
                        contentContainerStyle={{ padding: Spacing.md }}
                        ListHeaderComponent={
                            <>
                                {/* Property Info */}
                                <Card style={{ marginBottom: Spacing.md }}>
                                    <View style={{ alignItems: 'center' }}>
                                        <Badge label={typeLabels[property.type] || property.type} variant="info" />
                                        <Text style={{ ...Typography.title2, color: colors.text, marginTop: Spacing.sm }}>
                                            {property.name}
                                        </Text>
                                        {property.address && (
                                            <Text style={{ ...Typography.subhead, color: colors.textSecondary, marginTop: Spacing.xs }}>
                                                {property.address}
                                            </Text>
                                        )}
                                    </View>
                                </Card>

                                {/* Units Summary */}
                                <Card style={{ marginBottom: Spacing.md }}>
                                    <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.md }}>
                                        ملخص الوحدات
                                    </Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ ...Typography.title1, color: colors.success }}>{available}</Text>
                                            <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>متاحة</Text>
                                        </View>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ ...Typography.title1, color: colors.warning }}>{occupied}</Text>
                                            <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>مؤجرة</Text>
                                        </View>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ ...Typography.title1, color: colors.text }}>{units.length}</Text>
                                            <Text style={{ ...Typography.caption1, color: colors.textSecondary }}>الإجمالي</Text>
                                        </View>
                                    </View>
                                </Card>

                                <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.sm }}>
                                    الوحدات ({units.length})
                                </Text>
                            </>
                        }
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', paddingTop: Spacing.lg }}>
                                <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
                                <Text style={{ ...Typography.body, color: colors.textSecondary, marginTop: Spacing.md }}>
                                    لا توجد وحدات
                                </Text>
                            </View>
                        }
                    />
                </SafeAreaView>
            )}
        </>
    );
}
