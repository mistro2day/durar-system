import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View, TouchableOpacity, Animated, Dimensions, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import { useRef, useEffect } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CustomTabBarProps {
    state: any;
    descriptors: any;
    navigation: any;
}

function LiquidGlassTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
    const { colors, isDark } = useTheme();
    const tabCount = state.routes.length;
    const tabWidth = SCREEN_WIDTH / tabCount;

    // Liquid Glass Animation Values
    const translateX = useRef(new Animated.Value(state.index * tabWidth)).current;
    const scaleX = useRef(new Animated.Value(1)).current;
    const scaleY = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    // Per-tab scale animations for interactive press effect
    const tabScales = useRef(state.routes.map(() => new Animated.Value(1))).current;

    useEffect(() => {
        // Liquid Glass Morphing Animation - Simulates gel-like fluidity
        Animated.sequence([
            // Phase 1: Stretch and fade slightly (Materialization)
            Animated.parallel([
                Animated.timing(scaleX, {
                    toValue: 1.3,
                    duration: 80,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleY, {
                    toValue: 0.85,
                    duration: 80,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 80,
                    useNativeDriver: true,
                }),
            ]),
            // Phase 2: Move with spring physics (Fluidity)
            Animated.parallel([
                Animated.spring(translateX, {
                    toValue: state.index * tabWidth,
                    useNativeDriver: true,
                    tension: 120,
                    friction: 14,
                }),
                Animated.spring(scaleX, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 180,
                    friction: 12,
                }),
                Animated.spring(scaleY, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 180,
                    friction: 12,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, [state.index]);

    // Interactive press animation
    const handlePressIn = (index: number) => {
        Animated.spring(tabScales[index], {
            toValue: 0.92,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
        }).start();
    };

    const handlePressOut = (index: number) => {
        Animated.spring(tabScales[index], {
            toValue: 1,
            useNativeDriver: true,
            tension: 200,
            friction: 8,
        }).start();
    };

    // Glass colors based on theme
    const glassColors = isDark
        ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']
        : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.6)'];

    const glassHighlight = isDark
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(255, 255, 255, 0.95)';

    const glassShadow = isDark
        ? 'rgba(0, 0, 0, 0.3)'
        : 'rgba(0, 0, 0, 0.08)';

    return (
        <View style={[styles.tabBarContainer, { height: Platform.OS === 'ios' ? 88 : 65 }]}>
            {/* Background Blur - Lensing Effect */}
            <BlurView
                intensity={isDark ? 60 : 80}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
            />

            {/* Subtle top border - Lensing highlight */}
            <View style={[styles.topBorder, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]} />

            {/* Liquid Glass Pill Indicator */}
            <Animated.View
                style={[
                    styles.liquidGlassPill,
                    {
                        width: tabWidth - 12,
                        opacity,
                        transform: [
                            { translateX: Animated.add(translateX, new Animated.Value(6)) },
                            { scaleX },
                            { scaleY },
                        ],
                        shadowColor: glassShadow,
                    },
                ]}
            >
                {/* Glass Inner Gradient */}
                <View style={[styles.glassInner, { backgroundColor: glassHighlight }]}>
                    {/* Top highlight - Lensing effect */}
                    <View style={[styles.glassHighlight, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.9)'
                    }]} />

                    {/* Subtle inner shadow */}
                    <View style={[styles.glassInnerShadow, {
                        backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.03)'
                    }]} />
                </View>
            </Animated.View>

            {/* Tab Buttons */}
            <View style={styles.tabsRow}>
                {state.routes.map((route: any, index: number) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;
                    const iconName = getIconName(route.name);

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            onPressIn={() => handlePressIn(index)}
                            onPressOut={() => handlePressOut(index)}
                            style={styles.tabButton}
                        >
                            <Animated.View
                                style={[
                                    styles.iconContainer,
                                    { transform: [{ scale: tabScales[index] }] },
                                ]}
                            >
                                <Ionicons
                                    name={iconName as any}
                                    size={24}
                                    color={isFocused ? colors.primary : colors.textTertiary}
                                />
                            </Animated.View>
                            <Animated.Text
                                style={[
                                    styles.tabLabel,
                                    {
                                        color: isFocused ? colors.primary : colors.textTertiary,
                                        fontWeight: isFocused ? '600' : '400',
                                        transform: [{ scale: tabScales[index] }],
                                    },
                                ]}
                            >
                                {options.title}
                            </Animated.Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

function getIconName(routeName: string): string {
    switch (routeName) {
        case 'index': return 'stats-chart';
        case 'units': return 'home';
        case 'tenants': return 'people';
        case 'contracts': return 'document-text';
        case 'invoices': return 'receipt';
        case 'more': return 'ellipsis-horizontal';
        default: return 'ellipse';
    }
}

const styles = StyleSheet.create({
    tabBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        overflow: 'hidden',
    },
    topBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 0.5,
    },
    liquidGlassPill: {
        position: 'absolute',
        top: 4,
        height: 48,
        borderRadius: 24,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
    },
    glassInner: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
    },
    glassHighlight: {
        position: 'absolute',
        top: 0,
        left: '10%',
        right: '10%',
        height: 1,
        borderRadius: 1,
    },
    glassInnerShadow: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
    },
    tabsRow: {
        flexDirection: 'row',
        paddingTop: 4,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
    },
    iconContainer: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabLabel: {
        fontSize: 10,
        marginTop: 2,
    },
});

export default function TabLayout() {
    const { colors } = useTheme();
    const router = useRouter();

    return (
        <Tabs
            tabBar={(props) => <LiquidGlassTabBar {...props} />}
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.background,
                },
                headerTintColor: colors.text,
                headerTitleStyle: {
                    fontWeight: '600',
                    fontSize: 17,
                    color: colors.text,
                },
                headerShadowVisible: false,
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => router.push('/activities')}
                        style={{ marginLeft: 16 }}
                    >
                        <Ionicons name="notifications-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                ),
            }}
        >
            <Tabs.Screen name="more" options={{ title: 'المزيد' }} />
            <Tabs.Screen name="invoices" options={{ title: 'الفواتير' }} />
            <Tabs.Screen name="contracts" options={{ title: 'العقود' }} />
            <Tabs.Screen name="tenants" options={{ title: 'المستأجرين' }} />
            <Tabs.Screen name="units" options={{ title: 'العقارات' }} />
            <Tabs.Screen name="index" options={{ title: 'الرئيسية', headerTitle: 'درر' }} />
        </Tabs>
    );
}
