import { View, Text, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components';
import { Typography, Spacing, TouchTarget } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface MenuItem {
    id: string;
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress?: () => void;
    danger?: boolean;
    toggle?: boolean;
    value?: boolean;
    onToggle?: (value: boolean) => void;
}

export default function More() {
    const { user, signOut } = useAuth();
    const { colors, isDark, setThemeMode } = useTheme();

    const handleLogout = () => {
        Alert.alert(
            'تسجيل الخروج',
            'هل أنت متأكد من تسجيل الخروج؟',
            [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'خروج', style: 'destructive', onPress: signOut },
            ]
        );
    };

    const handleDarkModeToggle = (value: boolean) => {
        setThemeMode(value ? 'dark' : 'light');
    };

    const menuItems: MenuItem[] = [
        { id: 'profile', title: 'الملف الشخصي', icon: 'person-outline', onPress: () => { } },
        { id: 'notifications', title: 'الإشعارات', icon: 'notifications-outline', onPress: () => { } },
        {
            id: 'darkmode',
            title: 'الوضع الداكن',
            icon: 'moon-outline',
            toggle: true,
            value: isDark,
            onToggle: handleDarkModeToggle,
        },
        { id: 'settings', title: 'الإعدادات', icon: 'settings-outline', onPress: () => { } },
        { id: 'help', title: 'المساعدة', icon: 'help-circle-outline', onPress: () => { } },
        { id: 'logout', title: 'تسجيل الخروج', icon: 'log-out-outline', onPress: handleLogout, danger: true },
    ];

    const renderMenuItem = (item: MenuItem, index: number) => {
        const isLast = index === menuItems.length - 1;

        const content = (
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: TouchTarget.minHeight,
                    paddingVertical: Spacing.sm,
                    borderBottomWidth: !isLast ? 1 : 0,
                    borderBottomColor: colors.separator,
                }}
            >
                {item.toggle ? (
                    <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: colors.separator, true: colors.primary }}
                        thumbColor="#FFFFFF"
                    />
                ) : (
                    <Ionicons name="chevron-back" size={20} color={colors.textTertiary} />
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                    <Text style={{
                        ...Typography.body,
                        color: item.danger ? colors.danger : colors.text,
                        marginRight: Spacing.md,
                    }}>
                        {item.title}
                    </Text>
                    <Ionicons
                        name={item.icon}
                        size={24}
                        color={item.danger ? colors.danger : colors.primary}
                    />
                </View>
            </View>
        );

        if (item.toggle) {
            return <View key={item.id}>{content}</View>;
        }

        return (
            <TouchableOpacity
                key={item.id}
                onPress={item.onPress}
                activeOpacity={0.7}
            >
                {content}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
            <View style={{ padding: Spacing.md }}>
                {/* User Profile Card */}
                <Card style={{ marginBottom: Spacing.lg, backgroundColor: colors.surface }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <View style={{ alignItems: 'flex-end', marginRight: Spacing.md }}>
                            <Text style={{ ...Typography.headline, color: colors.text }}>
                                {user?.name || 'مستخدم'}
                            </Text>
                            <Text style={{ ...Typography.subhead, color: colors.textSecondary, marginTop: Spacing.xs }}>
                                {user?.email || 'email@example.com'}
                            </Text>
                        </View>
                        <View style={{
                            width: 56,
                            height: 56,
                            borderRadius: 28,
                            backgroundColor: colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Text style={{ ...Typography.title2, color: '#FFFFFF' }}>
                                {user?.name?.charAt(0) || 'م'}
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* Menu Items */}
                <Card style={{ backgroundColor: colors.surface }}>
                    {menuItems.map((item, index) => renderMenuItem(item, index))}
                </Card>

                {/* App Version */}
                <Text style={{
                    ...Typography.caption1,
                    color: colors.textTertiary,
                    textAlign: 'center',
                    marginTop: Spacing.lg,
                }}>
                    Durar Mobile v1.0.0
                </Text>
            </View>
        </SafeAreaView>
    );
}
