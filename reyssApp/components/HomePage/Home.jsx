import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useCallback } from "react";
import {
    BackHandler,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ScrollView,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { ipAddress } from "../../urls";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { checkTokenAndRedirect } from "../../services/auth";

// Helper function to format epoch time
const formatDate = (epochTime) => {
    if (!epochTime) return "N/A";
    const date = new Date(epochTime * 1000);
    return date.toLocaleDateString();
};

const HomePage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [userDetails, setUserDetails] = useState(null);
    const [lastOrderDetails, setLastOrderDetails] = useState(null);
    const navigation = useNavigation();

    // Back button handler
    const handleBackButton = useCallback(() => {
        Alert.alert(
            "Exit App",
            "Do you want to exit?",
            [
                { text: "Cancel", onPress: () => null, style: "cancel" },
                { text: "Exit", onPress: () => BackHandler.exitApp() },
            ],
            { cancelable: false }
        );
        return true;
    }, []);

    // Fetch user details from API
    const userDetailsData1 = useCallback(async () => {
        try {
            const token = await checkTokenAndRedirect(navigation);
            const response = await fetch(`http://${ipAddress}:8090/userDetails`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const userGetResponse = await response.json();
            if (!response.ok || !userGetResponse.status) {
                Alert.alert("Failed", userGetResponse.message || "Something went wrong");
                setIsLoading(false);
                return;
            }

            const userDetails = {
                customerName: userGetResponse.user.name,
                customerID: userGetResponse.user.customer_id,
                route: userGetResponse.user.route,
                pendingAmount: userGetResponse.pendingAmount,
            };
            await AsyncStorage.setItem("default", JSON.stringify(userGetResponse.defaultOrder));

            const latestOrder = userGetResponse.latestOrder;
            const lastIndentDate = latestOrder?.placed_on || "";
            const totalAmount = latestOrder?.total_amount || 0;
            const orderType = latestOrder?.order_type || "";
            const quantity = latestOrder?.quantity || 0;
            const pendingAmount = userGetResponse.pendingAmount;

            return {
                userDetails,
                latestOrder: { lastIndentDate, totalAmount, orderType, quantity },
                pendingAmount,
            };
        } catch (err) {
            console.error("User details fetch error:", err);
            setIsLoading(false);
            Alert.alert("Error", "An error occurred. Please try again.");
        }
    }, [navigation]);

    // Fetch data and update state
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const userDetailsData = await userDetailsData1();
        if (userDetailsData) {
            setUserDetails(userDetailsData.userDetails);
            setLastOrderDetails(userDetailsData.latestOrder);
        }
        setIsLoading(false);
    }, [userDetailsData1]);

    useFocusEffect(
        useCallback(() => {
            const fetchDataAsync = async () => await fetchData();
            fetchDataAsync();

            BackHandler.addEventListener("hardwareBackPress", handleBackButton);

            return () => {
                BackHandler.removeEventListener("hardwareBackPress", handleBackButton);
            };
        }, [fetchData, handleBackButton])
    );

    const { customerName, customerID, route, pendingAmount } = userDetails || {};
    const { lastIndentDate, totalAmount, orderType, quantity } = lastOrderDetails || {};

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerText}> </Text>
            </View>

            {/* Logo Section */}
            <View style={styles.section}>
                <Image source={require("../../assets/SL.png")} style={styles.logo} />
                <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>SL Enterprises</Text>
                    <Text style={styles.proprietorName}>Proprietor Lokesh Naidu</Text>
                </View>
            </View>

            {/* Customer Details Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Customer Details</Text>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{customerName || "N/A"}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>ID:</Text>
                    <Text style={styles.detailValue}>{customerID || "N/A"}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Route:</Text>
                    <Text style={styles.detailValue}>{route || "N/A"}</Text>
                </View>
                <TouchableOpacity style={styles.callButton}>
                    <MaterialIcons name="call" size={22} color="#333" />
                    <Text style={styles.callText}>Call Us</Text>
                </TouchableOpacity>
            </View>

            {/* Amount Pending Card */}
            <View style={[styles.card, styles.amountPendingCard, parseInt(pendingAmount) > 5000 && styles.highPendingAmount]}>
                <Text style={styles.cardTitle}>Amount Pending</Text>
                <View style={styles.amountRow}>
                    <Text style={styles.amountText}>₹ {pendingAmount || "0"}</Text>
                    <TouchableOpacity style={styles.payButton}>
                        <Text style={styles.payButtonText}>Pay Now</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Last Order Details Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Last Order</Text>
                {lastOrderDetails && lastOrderDetails.lastIndentDate ? (
                    <View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Order Type:</Text>
                            <Text style={styles.detailValue}>{orderType || "N/A"}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Quantity:</Text>
                            <Text style={styles.detailValue}>{quantity || "N/A"}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Date:</Text>
                            <Text style={styles.detailValue}>{formatDate(lastIndentDate)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Amount:</Text>
                            <Text style={styles.detailValue}>₹ {totalAmount || "0"}</Text>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.noOrdersText}>No Orders Placed Yet</Text>
                )}
            </View>

            {/* View Products Button */}
            <TouchableOpacity
                style={styles.productsButton}
                onPress={() => navigation.navigate("ProductsList")}
            >
                <Text style={styles.productsButtonText}>View All Products</Text>
                <MaterialIcons
                    name="keyboard-arrow-right"
                    size={24}
                    color="#333"
                />
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: "#ffffff", // White background as requested
        paddingBottom: 20,
    },
    header: {
        backgroundColor: "#ffff", // Yellow header background
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        marginBottom: 20,
    },
    headerText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#333", // Dark text for contrast on yellow
        textAlign: 'center',
    },
    section: {
        flexDirection: "row",
        backgroundColor: "#ffffff",
        padding: 20,
        borderRadius: 15,
        marginHorizontal: 20,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    logo: {
        width: 70,
        height: 70,
        resizeMode: 'contain',
        marginRight: 15,
    },
    companyInfo: {
        flex: 1,
    },
    companyName: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    proprietorName: {
        fontSize: 16,
        color: "#555",
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 15,
        marginHorizontal: 20,
        marginBottom: 15,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 15,
    },
    detailRow: {
        flexDirection: "row",
        marginBottom: 8,
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 16,
        fontWeight: "500",
        color: "#555",
        marginRight: 8,
        flex: 1,
    },
    detailValue: {
        fontSize: 16,
        color: "#333",
        flex: 2,
        textAlign: 'right',
    },
    callButton: {
        backgroundColor: "#ffffff", // White button with yellow border for 'Call Us'
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginTop: 15,
        alignSelf: 'flex-start',
        borderColor: "#FDDA0D",
        borderWidth: 1,
    },
    callText: {
        marginLeft: 8,
        fontSize: 16,
        color: "#333", // Dark text for 'Call Us' button
        fontWeight: "bold",
    },
    amountPendingCard: {
        backgroundColor: '#ffffff', // White for amount pending card
    },
    highPendingAmount: {
        backgroundColor: '#ffe0b2', // Light orange for high pending amount - softer than red
    },
    amountRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    amountText: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#e65100", // Dark orange for pending amount - to stand out but not harsh red
    },
    payButton: {
        backgroundColor: "#FDDA0D", // Yellow Pay Now button
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    payButtonText: {
        color: "#333", // Dark text for 'Pay Now' button
        fontSize: 16,
        fontWeight: "bold",
    },
    lastIndentCard: {},
    noOrdersText: {
        fontSize: 16,
        color: "#777",
        textAlign: "center",
        paddingVertical: 15,
    },
    productsButton: {
        backgroundColor: "#FDDA0D", // Yellow View Products button
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 15,
        marginHorizontal: 20,
        borderRadius: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    productsButtonText: {
        color: "#333", // Dark text for 'View Products'
        fontSize: 18,
        fontWeight: "bold",
        marginRight: 10,
    },
});

export default HomePage;