import { TouchableOpacity, Text, ActivityIndicator, type TouchableOpacityProps } from 'react-native';
import { Colors, Typography, TouchTarget, BorderRadius, Spacing } from '../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    fullWidth?: boolean;
}

export function Button({
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    disabled,
    style,
    ...props
}: ButtonProps) {
    const getBackgroundColor = () => {
        if (disabled) return Colors.light.border;
        switch (variant) {
            case 'primary': return Colors.light.primary;
            case 'secondary': return Colors.light.secondary;
            case 'outline': return 'transparent';
            case 'ghost': return 'transparent';
            default: return Colors.light.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return Colors.light.textTertiary;
        switch (variant) {
            case 'primary':
            case 'secondary':
                return '#FFFFFF';
            case 'outline':
            case 'ghost':
                return Colors.light.primary;
            default:
                return '#FFFFFF';
        }
    };

    const getHeight = () => {
        switch (size) {
            case 'sm': return 36;
            case 'md': return TouchTarget.minHeight;
            case 'lg': return 52;
            default: return TouchTarget.minHeight;
        }
    };

    return (
        <TouchableOpacity
            style={[
                {
                    backgroundColor: getBackgroundColor(),
                    minHeight: getHeight(),
                    minWidth: TouchTarget.minWidth,
                    paddingHorizontal: Spacing.lg,
                    borderRadius: BorderRadius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    ...(variant === 'outline' && {
                        borderWidth: 1,
                        borderColor: Colors.light.primary,
                    }),
                    ...(fullWidth && { width: '100%' }),
                },
                style,
            ]}
            disabled={disabled || loading}
            activeOpacity={0.7}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text
                    style={{
                        color: getTextColor(),
                        ...Typography.headline,
                    }}
                >
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}
