import { View, type ViewProps } from 'react-native';
import { BorderRadius, Spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface CardProps extends ViewProps {
    variant?: 'elevated' | 'flat';
    padding?: keyof typeof Spacing;
}

export function Card({
    children,
    style,
    variant = 'elevated',
    padding = 'md',
    ...props
}: CardProps) {
    const { colors, isDark } = useTheme();

    return (
        <View
            style={[
                {
                    backgroundColor: colors.surface,
                    borderRadius: BorderRadius.lg,
                    padding: Spacing[padding],
                    ...(variant === 'elevated' && {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.3 : 0.1,
                        shadowRadius: 8,
                        elevation: 3,
                    }),
                },
                style,
            ]}
            {...props}
        >
            {children}
        </View>
    );
}
