import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing } from '../constants/theme';
import api from '../services/api';

interface Activity {
    id: number;
    action: string;
    description: string;
    createdAt: string;
    user?: { name: string };
}

const ACTION_ICONS: Record<string, { icon: string; color: string }> = {
    INVOICE_CREATE: { icon: 'receipt-outline', color: '#3b82f6' },
    INVOICE_STATUS_UPDATE: { icon: 'sync-outline', color: '#10b981' },
    PAYMENT_RECORD: { icon: 'cash-outline', color: '#10b981' },
    PAYMENT_UPDATE: { icon: 'create-outline', color: '#f59e0b' },
    PAYMENT_DELETE: { icon: 'trash-outline', color: '#ef4444' },
    CONTRACT_CREATE: { icon: 'document-text-outline', color: '#8b5cf6' },
    CONTRACT_UPDATE: { icon: 'refresh-outline', color: '#f59e0b' },
    TENANT_CREATE: { icon: 'person-add-outline', color: '#ec4899' },
    UNIT_UPDATE: { icon: 'home-outline', color: '#f59e0b' },
};

const ACTION_LABELS: Record<string, string> = {
    INVOICE_CREATE: 'إنشاء فاتورة',
    INVOICE_STATUS_UPDATE: 'تحديث حالة فاتورة',
    PAYMENT_RECORD: 'تسجيل دفعة',
    PAYMENT_UPDATE: 'تعديل دفعة',
    PAYMENT_DELETE: 'حذف دفعة',
    CONTRACT_CREATE: 'إنشاء عقد',
    CONTRACT_UPDATE: 'تعديل عقد',
    TENANT_CREATE: 'إضافة مستأجر',
    UNIT_UPDATE: 'تحديث وحدة',
};

export default function Activities() {
    const { colors, isDark } = useTheme();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchActivities = async () => {
        try {
            const response = await api.get('/api/activity');
            const data = Array.isArray(response.data) ? response.data : response.data.items || [];
            setActivities(data);
        } catch (error) {
            console.log('[Activities] Error:', error);
            setActivities([]);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchActivities();
        setRefreshing(false);
    }, []);

    useEffect(() => {
        fetchActivities();
    }, []);

    const translateDescription = (description: string) => {
        if (!description) return '';

        // Convert Arabic/Indic numerals to Western numerals
        let result = description.replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => {
            return '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString();
        });

        // Translate English statuses if they appear in text
        const translations: Record<string, string> = {
            'PAID': 'مدفوعة',
            'PARTIAL': 'سداد جزئي',
            'PENDING': 'مستحقة',
            'OVERDUE': 'متأخرة',
            'CANCELLED': 'ملغية',
            'NEW': 'جديد',
            'IN_PROGRESS': 'قيد التنفيذ',
            'COMPLETED': 'مكتمل',
            'ACTIVE': 'نشط',
            'ENDED': 'منتهي',
        };

        Object.entries(translations).forEach(([en, ar]) => {
            const regex = new RegExp(`\\b${en}\\b`, 'g');
            result = result.replace(regex, ar);
        });

        return result;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('ar-EG-u-nu-latn', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const renderActivity = ({ item }: { item: Activity }) => {
        const actionInfo = ACTION_ICONS[item.action] || { icon: 'notifications-outline', color: colors.primary };

        return (
            <View style={[styles.itemContainer, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
                <View style={[styles.iconBox, { backgroundColor: actionInfo.color + '15' }]}>
                    <Ionicons name={actionInfo.icon as any} size={20} color={actionInfo.color} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.actionLabel, { color: actionInfo.color }]}>
                        {ACTION_LABELS[item.action] || item.action}
                    </Text>
                    <Text style={[styles.description, { color: colors.text }]}>
                        {translateDescription(item.description)}
                    </Text>
                    <View style={styles.footer}>
                        <Text style={[styles.date, { color: colors.textTertiary }]}>
                            {formatDate(item.createdAt)}
                        </Text>
                        {item.user && (
                            <Text style={[styles.userName, { color: colors.primary }]}>
                                بواسطة: {item.user.name}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <FlatList
                data={activities}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderActivity}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={48} color={colors.textTertiary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>لا توجد أنشطة حديثة</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    listContent: {
        paddingBottom: Spacing.xl,
    },
    itemContainer: {
        flexDirection: 'row-reverse',
        padding: Spacing.md,
        borderBottomWidth: 0.5,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: Spacing.md,
    },
    textContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    actionLabel: {
        ...Typography.caption1,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    description: {
        ...Typography.body,
        textAlign: 'right',
        lineHeight: 22,
    },
    footer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: Spacing.xs,
    },
    date: {
        ...Typography.caption2,
    },
    userName: {
        ...Typography.caption2,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        ...Typography.body,
        marginTop: Spacing.md,
    },
});
