import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: 'light' | 'dark';
    themeMode: ThemeMode;
    colors: typeof Colors.light;
    setThemeMode: (mode: ThemeMode) => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeMode] = useState<ThemeMode>('system');

    // Determine actual theme based on mode
    const theme: 'light' | 'dark' =
        themeMode === 'system'
            ? (systemColorScheme || 'light')
            : themeMode;

    const colors = theme === 'dark' ? Colors.dark : Colors.light;
    const isDark = theme === 'dark';

    return (
        <ThemeContext.Provider value={{ theme, themeMode, colors, setThemeMode, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
