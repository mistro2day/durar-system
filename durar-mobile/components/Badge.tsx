import { View, Text } from 'react-native';
import { Typography, BorderRadius, Spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
    const { colors } = useTheme();

    const getColors = () => {
        switch (variant) {
            case 'success':
                return { bg: colors.success + '20', text: colors.success };
            case 'warning':
                return { bg: colors.warning + '20', text: colors.warning };
            case 'danger':
                return { bg: colors.danger + '20', text: colors.danger };
            case 'info':
                return { bg: colors.primary + '20', text: colors.primary };
            case 'neutral':
            default:
                return { bg: colors.separator, text: colors.textSecondary };
        }
    };

    const badgeColors = getColors();

    return (
        <View
            style={{
                backgroundColor: badgeColors.bg,
                paddingHorizontal: Spacing.sm,
                paddingVertical: Spacing.xs,
                borderRadius: BorderRadius.sm,
                alignSelf: 'flex-start',
            }}
        >
            <Text
                style={{
                    color: badgeColors.text,
                    ...Typography.caption1,
                    fontWeight: '600',
                }}
            >
                {label}
            </Text>
        </View>
    );
}
