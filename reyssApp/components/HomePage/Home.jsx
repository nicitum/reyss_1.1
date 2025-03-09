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
    ActivityIndicator,
    Modal,
    TextInput,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { ipAddress } from "../../urls";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { checkTokenAndRedirect } from "../../services/auth";
import { jwtDecode } from 'jwt-decode';

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
    const [creditLimit, setCreditLimit] = useState(null);
    const [pendingAmount, setPendingAmount] = useState('0');
    const [isPendingAmountLoading, setIsPendingAmountLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false); // Modal visibility
    const [partialAmount, setPartialAmount] = useState(''); // Partial payment input
    const navigation = useNavigation();

    // Function to check credit limit
    const checkCreditLimit = useCallback(async () => {
        try {
            const userAuthToken = await checkTokenAndRedirect(navigation);
            if (!userAuthToken) {
                console.error("Authentication Error: Authorization token missing.");
                return null;
            }
            const decodedToken = jwtDecode(userAuthToken);
            const customerId = decodedToken.id;

            const creditLimitResponse = await fetch(`http://${ipAddress}:8090/credit-limit?customerId=${customerId}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${userAuthToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (creditLimitResponse.ok) {
                const creditData = await creditLimitResponse.json();
                return parseFloat(creditData.creditLimit);
            } else if (creditLimitResponse.status === 404) {
                console.log("Credit limit not found for customer, proceeding without limit check.");
                return Infinity;
            } else {
                console.error("Error fetching credit limit:", creditLimitResponse.status, creditLimitResponse.statusText);
                return null;
            }
        } catch (error) {
            console.error("Error checking credit limit:", error);
            return null;
        }
    }, [navigation]);

    // Function to fetch pending amount
    const fetchPendingAmount = useCallback(async () => {
        setIsPendingAmountLoading(true);
        try {
            const userAuthToken = await checkTokenAndRedirect(navigation);
            if (!userAuthToken) {
                console.error("Authentication Error: Authorization token missing for pending amount.");
                setIsPendingAmountLoading(false);
                return;
            }
            const decodedToken = jwtDecode(userAuthToken);
            const customerId = decodedToken.id;

            const amountDueResponse = await fetch(`http://${ipAddress}:8090/collect_cash?customerId=${customerId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (amountDueResponse.ok) {
                const amountDueData = await amountDueResponse.json();
                setPendingAmount(amountDueData.amountDue !== undefined ? amountDueData.amountDue.toString() : '0');
            } else {
                console.error("Failed to fetch pending amount using /collect_cash:", amountDueResponse.status, amountDueResponse.statusText);
                setPendingAmount('Error');
            }
        } catch (error) {
            console.error("Error fetching pending amount using /collect_cash:", error);
            setPendingAmount('Error');
        } finally {
            setIsPendingAmountLoading(false);
        }
    }, [navigation]);

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
            };
            await AsyncStorage.setItem("default", JSON.stringify(userGetResponse.defaultOrder));

            const latestOrder = userGetResponse.latestOrder;
            const lastIndentDate = latestOrder?.placed_on || "";
            const totalAmount = latestOrder?.total_amount || 0;
            const orderType = latestOrder?.order_type || "";
            const quantity = latestOrder?.quantity || 0;

            return {
                userDetails,
                latestOrder: { lastIndentDate, totalAmount, orderType, quantity },
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
        const creditLimitValue = await checkCreditLimit();
        setCreditLimit(creditLimitValue);
        await fetchPendingAmount();
        setIsLoading(false);
    }, [userDetailsData1, checkCreditLimit, fetchPendingAmount]);

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

    // Handle Full Payment
    const handleFullPayment = () => {
        const parsedPending = parseFloat(pendingAmount);
        if (isNaN(parsedPending) || parsedPending <= 0) {
            Alert.alert("Error", "No valid pending amount to pay.");
            return;
        }
        setModalVisible(false);
        navigation.navigate("Payments", { amount: parsedPending });
    };

    // Handle Partial Payment
    const handlePartialPayment = () => {
        const parsedAmount = parseFloat(partialAmount);
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            Alert.alert("Invalid Amount", "Please enter a positive number.");
            return;
        }
        setModalVisible(false);
        setPartialAmount(''); // Reset input
        navigation.navigate("Payments", { amount: parsedAmount });
    };

    const { customerName, customerID, route } = userDetails || {};
    const { lastIndentDate, totalAmount, orderType, quantity } = lastOrderDetails || {};

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerText}> </Text>
            </View>

            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FDDA0D" />
                </View>
            )}

            {!isLoading && (
                <>
                    {/* Logo Section */}
                    <View style={styles.section}>
                        <Image source={require("../../assets/SL.png")} style={styles.logo} />
                        <View style={styles.companyInfo}>
                            <Text style={styles.companyName}>SL ENTERPRISESS</Text>
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
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Credit Limit:</Text>
                            <Text style={styles.detailValue}>{creditLimit !== null ? (creditLimit === Infinity ? "N/A (No Limit)" : `₹ ${creditLimit}`) : "Fetching..."}</Text>
                        </View>
                        <TouchableOpacity style={styles.callButton}>
                            <MaterialIcons name="call" size={22} color="#333" />
                            <Text style={styles.callText}>Call Us</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Amount Pending Card */}
                    <View style={[styles.card, styles.amountPendingCard, parseFloat(pendingAmount) > 5000 && styles.highPendingAmount]}>
                        <Text style={styles.cardTitle}>Amount Pending</Text>
                        <View style={styles.amountRow}>
                            {isPendingAmountLoading ? (
                                <ActivityIndicator size="small" color="#e65100" />
                            ) : (
                                <Text style={styles.amountText}>₹ {pendingAmount === 'Error' ? 'Error' : pendingAmount}</Text>
                            )}
                            <TouchableOpacity
                                style={styles.payButton}
                                onPress={() => setModalVisible(true)} // Show modal on click
                            >
                                <Text style={styles.payButtonText}>Pay Now</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Payment Modal */}
                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Choose Payment Option</Text>
                                
                                {/* Full Payment Option */}
                                <TouchableOpacity
                                    style={styles.modalOptionButton}
                                    onPress={handleFullPayment}
                                >
                                    <Text style={styles.modalOptionText}>Full Payment (₹ {pendingAmount})</Text>
                                </TouchableOpacity>

                                {/* Partial Payment Option */}
                                <Text style={styles.modalSubtitle}>Partial Payment</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter amount"
                                    keyboardType="numeric"
                                    value={partialAmount}
                                    onChangeText={(text) => {
                                        const filteredText = text.replace(/[^0-9.]/g, ''); // Allow numbers and decimals
                                        setPartialAmount(filteredText);
                                    }}
                                />
                                <TouchableOpacity
                                    style={styles.modalPayButton}
                                    onPress={handlePartialPayment}
                                >
                                    <Text style={styles.modalButtonText}>Pay</Text>
                                </TouchableOpacity>

                                {/* Cancel Button */}
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={() => {
                                        setModalVisible(false);
                                        setPartialAmount(''); // Reset input on cancel
                                    }}
                                >
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

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
                </>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: "#ffffff",
        paddingBottom: 20,
    },
    header: {
        backgroundColor: "#ffff",
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        marginBottom: 20,
    },
    headerText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#333",
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
        backgroundColor: "#ffffff",
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
        color: "#333",
        fontWeight: "bold",
    },
    amountPendingCard: {
        backgroundColor: '#ffffff',
    },
    highPendingAmount: {
        backgroundColor: '#ffe0b2',
    },
    amountRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    amountText: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#e65100",
    },
    payButton: {
        backgroundColor: "#FDDA0D",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    payButtonText: {
        color: "#333",
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
        backgroundColor: "#FDDA0D",
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
        color: "#333",
        fontSize: 18,
        fontWeight: "bold",
        marginRight: 10,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: 300,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    modalSubtitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#555',
        marginTop: 15,
        marginBottom: 10,
    },
    modalOptionButton: {
        backgroundColor: '#28a745',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalOptionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginBottom: 15,
        fontSize: 16,
    },
    modalPayButton: {
        backgroundColor: '#FDDA0D',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalCancelButton: {
        backgroundColor: '#dc3545',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#333',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default HomePage;