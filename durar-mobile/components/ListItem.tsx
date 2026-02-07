import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, TouchTarget } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface ListItemProps {
    title: string;
    subtitle?: string;
    value?: string;
    valueColor?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    onPress?: () => void;
    showChevron?: boolean;
}

export function ListItem({
    title,
    subtitle,
    value,
    valueColor,
    icon,
    iconColor,
    onPress,
    showChevron = true,
}: ListItemProps) {
    const { colors } = useTheme();

    const finalValueColor = valueColor || colors.text;
    const finalIconColor = iconColor || colors.primary;

    const content = (
        <View style={[styles.container, { borderBottomColor: colors.separator }]}>
            {showChevron && (
                <Ionicons name="chevron-back" size={20} color={colors.textTertiary} />
            )}

            <View style={styles.content}>
                {value && (
                    <Text style={[styles.value, { color: finalValueColor }]}>{value}</Text>
                )}
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
                    {subtitle && (
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
                    )}
                </View>
            </View>

            {icon && (
                <View style={[styles.iconContainer, { backgroundColor: finalIconColor + '20' }]}>
                    <Ionicons name={icon} size={20} color={finalIconColor} />
                </View>
            )}
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={onPress}
                style={styles.touchable}
            >
                {content}
            </TouchableOpacity>
        );
    }

    return <View style={styles.touchable}>{content}</View>;
}

const styles = StyleSheet.create({
    touchable: {
        minHeight: TouchTarget.minHeight,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginRight: Spacing.sm,
        gap: Spacing.md,
    },
    textContainer: {
        alignItems: 'flex-end',
        flex: 1,
    },
    title: {
        ...Typography.body,
    },
    subtitle: {
        ...Typography.caption1,
        marginTop: 2,
    },
    value: {
        ...Typography.headline,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: Spacing.sm,
    },
});
