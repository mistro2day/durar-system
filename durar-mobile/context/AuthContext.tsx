import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";
import api from "../services/api";

type User = {
    id: number;
    email: string;
    name: string;
    role: string;
};

type AuthType = {
    user: User | null;
    isLoading: boolean;
    signIn: (token: string, user: User) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthType>({
    user: null,
    isLoading: true,
    signIn: async () => { },
    signOut: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

function useProtectedRoute(user: User | null, isLoading: boolean) {
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === "(auth)";
        const inTabsGroup = segments[0] === "(tabs)";

        if (!user && !inAuthGroup) {
            // Not logged in, redirect to login
            router.replace("/(auth)/login");
        } else if (user && inAuthGroup) {
            // Logged in but on auth screen, redirect to main app
            router.replace("/(tabs)");
        }
    }, [user, segments, isLoading]);
}

export function AuthProvider({ children }: PropsWithChildren) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useProtectedRoute(user, isLoading);

    useEffect(() => {
        // Check for stored token on app launch
        SecureStore.getItemAsync("user").then((userJson) => {
            if (userJson) {
                try {
                    setUser(JSON.parse(userJson));
                } catch (e) {
                    console.error("Failed to parse user", e);
                }
            }
            setIsLoading(false);
        });
    }, []);

    const signIn = async (token: string, userData: User) => {
        await SecureStore.setItemAsync("token", token);
        await SecureStore.setItemAsync("user", JSON.stringify(userData));
        setUser(userData);
    };

    const signOut = async () => {
        await SecureStore.deleteItemAsync("token");
        await SecureStore.deleteItemAsync("user");
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                signIn,
                signOut,
                user,
                isLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
