// Apple HIG-inspired theme constants
// Typography follows iOS Dynamic Type sizes
// Colors follow iOS system colors

export const Colors = {
    light: {
        // System Colors
        primary: '#007AFF',      // iOS Blue
        secondary: '#5856D6',    // iOS Purple
        success: '#34C759',      // iOS Green
        warning: '#FF9500',      // iOS Orange
        danger: '#FF3B30',       // iOS Red

        // Backgrounds
        background: '#F2F2F7',   // iOS System Background
        surface: '#FFFFFF',      // Card/Surface

        // Text
        text: '#000000',
        textSecondary: '#3C3C43', // 60% opacity
        textTertiary: '#3C3C4399', // Label tertiary

        // Borders
        separator: '#3C3C4333',   // iOS separator color
        border: '#C6C6C8',
    },
    dark: {
        primary: '#0A84FF',
        secondary: '#5E5CE6',
        success: '#30D158',
        warning: '#FF9F0A',
        danger: '#FF453A',

        background: '#000000',
        surface: '#1C1C1E',

        text: '#FFFFFF',
        textSecondary: '#EBEBF5', // 60% opacity
        textTertiary: '#EBEBF599',

        separator: '#38383A',
        border: '#38383A',
    },
};

export const Typography = {
    // iOS Dynamic Type sizes
    largeTitle: {
        fontSize: 34,
        fontWeight: '700' as const,
        lineHeight: 41,
    },
    title1: {
        fontSize: 28,
        fontWeight: '700' as const,
        lineHeight: 34,
    },
    title2: {
        fontSize: 22,
        fontWeight: '700' as const,
        lineHeight: 28,
    },
    title3: {
        fontSize: 20,
        fontWeight: '600' as const,
        lineHeight: 25,
    },
    headline: {
        fontSize: 17,
        fontWeight: '600' as const,
        lineHeight: 22,
    },
    body: {
        fontSize: 17,
        fontWeight: '400' as const,
        lineHeight: 22,
    },
    callout: {
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 21,
    },
    subhead: {
        fontSize: 15,
        fontWeight: '400' as const,
        lineHeight: 20,
    },
    footnote: {
        fontSize: 13,
        fontWeight: '400' as const,
        lineHeight: 18,
    },
    caption1: {
        fontSize: 12,
        fontWeight: '400' as const,
        lineHeight: 16,
    },
    caption2: {
        fontSize: 11,
        fontWeight: '400' as const,
        lineHeight: 13,
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

// Minimum touch target size per HIG
export const TouchTarget = {
    minHeight: 44,
    minWidth: 44,
};

export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
};
