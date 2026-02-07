import { Redirect } from "expo-router";

export default function Index() {
    // Redirect to the tabs group by default
    return <Redirect href="/(tabs)" />;
}
