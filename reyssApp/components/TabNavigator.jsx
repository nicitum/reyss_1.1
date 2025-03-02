import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import HomeStack from "./HomePage/HomeStack";
import ProfileStack from "./Profile/ProfileStack";
import Transactions from "./Transactions/transactions";
import IndentStack from "./IndentPage/IndentStack";
import { View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import AdminAssignedUsersPage from "./route_mgr/AdminAssignedUsers";
import AdminHomePage from "./HomePage/AdminHomePage"; // Import AdminHomePage

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    useEffect(() => {
        const checkUserRole = async () => {
            setIsLoading(true);
            const userAuthToken = await AsyncStorage.getItem("userAuthToken");

            if (userAuthToken) {
                try {
                    const decodedToken = jwtDecode(userAuthToken);
                    if (decodedToken.role === "admin") {
                        setIsAdmin(true);
                        setIsSuperAdmin(false);
                    } else if (decodedToken.role === "superadmin") {
                        setIsAdmin(true);
                        setIsSuperAdmin(true);
                    } else {
                        setIsAdmin(false);
                        setIsSuperAdmin(false);
                    }
                } catch (error) {
                    console.error("Token verification error:", error);
                    setIsAdmin(false);
                    setIsSuperAdmin(false);
                }
            } else {
                setIsAdmin(false);
                setIsSuperAdmin(false);
            }
            setIsLoading(false);
        };
        checkUserRole();
    }, []);


    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading Tabs...</Text>
            </View>
        );
    }

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#ffcc00",
                tabBarInactiveTintColor: "gray",
            }}
        >
            <Tab.Screen
                name="Home"
                component={isSuperAdmin ? AdminHomePage : HomeStack} // Conditional component here!
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="home" size={size} color={color} />
                    ),
                }}
            />
            {!isSuperAdmin && (
                <Tab.Screen
                    name="Indent"
                    component={isAdmin ? AdminAssignedUsersPage : IndentStack}
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <MaterialCommunityIcons name="rss" size={size} color={color} />
                        ),
                    }}
                />
            )}
            {!isSuperAdmin && (
                <Tab.Screen
                    name="Transactions"
                    component={Transactions}
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <MaterialCommunityIcons name="sync" size={size} color={color} />
                        ),
                    }}
                />
            )}
            <Tab.Screen
                name="Profile"
                component={ProfileStack}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account" size={size} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default TabNavigator;