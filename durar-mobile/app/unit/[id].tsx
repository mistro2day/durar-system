import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
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
    floor?: number;
    rooms?: number;
    baths?: number;
    area?: number;
    property?: { id: number; name: string; type: string };
    contracts?: Array<{ id: number; status: string; tenant?: { name: string } }>;
}

const typeLabels: Record<string, string> = {
    DAILY: 'يومي',
    MONTHLY: 'شهري',
    YEARLY: 'سنوي',
};

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
    AVAILABLE: { label: 'متاحة', variant: 'success' },
    OCCUPIED: { label: 'مؤجرة', variant: 'warning' },
    MAINTENANCE: { label: 'صيانة', variant: 'danger' },
};

export default function UnitDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const [unit, setUnit] = useState<Unit | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUnit = async () => {
            try {
                const response = await api.get(`/api/units/${id}`);
                setUnit(response.data);
            } catch (error) {
                console.log('[UnitDetail] Error:', error);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchUnit();
    }, [id]);

    const statusInfo = unit ? (statusLabels[unit.status] || { label: unit.status, variant: 'neutral' as const }) : null;

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
                    title: unit ? `وحدة ${unit.number}` : 'تفاصيل الوحدة',
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
            ) : !unit ? (
                <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
                    <Text style={{ ...Typography.body, color: colors.textSecondary, marginTop: Spacing.md }}>
                        لم يتم العثور على الوحدة
                    </Text>
                </SafeAreaView>
            ) : (
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
                    <ScrollView contentContainerStyle={{ padding: Spacing.md }}>
                        {/* Header Card */}
                        <Card style={{ marginBottom: Spacing.md }}>
                            <View style={{ alignItems: 'flex-end' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                    {statusInfo && <Badge label={statusInfo.label} variant={statusInfo.variant} />}
                                    <Text style={{ ...Typography.title2, color: colors.text }}>
                                        وحدة {unit.number}
                                    </Text>
                                </View>
                                <Text style={{ ...Typography.subhead, color: colors.textSecondary, marginTop: Spacing.xs }}>
                                    {unit.property?.name || 'عقار غير محدد'}
                                </Text>
                            </View>
                        </Card>

                        {/* Details Card */}
                        <Card style={{ marginBottom: Spacing.md }}>
                            <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.md }}>
                                تفاصيل الوحدة
                            </Text>

                            <View style={{ gap: Spacing.sm }}>
                                <DetailRow label="نوع الإيجار" value={typeLabels[unit.type] || unit.type} />
                                <DetailRow label="الطابق" value={unit.floor?.toString() || '-'} />
                                <DetailRow label="عدد الغرف" value={unit.rooms?.toString() || '-'} />
                                <DetailRow label="عدد الحمامات" value={unit.baths?.toString() || '-'} />
                                <DetailRow label="المساحة" value={unit.area ? `${unit.area} م²` : '-'} />
                            </View>
                        </Card>

                        {/* Active Contract */}
                        {unit.contracts && unit.contracts.length > 0 && (
                            <Card>
                                <Text style={{ ...Typography.headline, color: colors.text, textAlign: 'right', marginBottom: Spacing.md }}>
                                    العقد الحالي
                                </Text>
                                {unit.contracts
                                    .filter(c => c.status === 'ACTIVE')
                                    .slice(0, 1)
                                    .map(contract => (
                                        <TouchableOpacity
                                            key={contract.id}
                                            onPress={() => router.push(`/contract/${contract.id}`)}
                                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <Ionicons name="chevron-back" size={20} color={colors.textTertiary} />
                                            <Text style={{ ...Typography.body, color: colors.primary }}>
                                                {contract.tenant?.name || 'مستأجر'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                            </Card>
                        )}
                    </ScrollView>
                </SafeAreaView>
            )}
        </>
    );
}
