import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Linking, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import Toast from 'react-native-toast-message';

export default function Payments() {
    const [paymentData, setPaymentData] = useState(null);
    // const [customerId, setCustomerId] = useState(null); // REMOVED component-level customerId state
    const [isCollectingOnlinePayment, setIsCollectingOnlinePayment] = useState(false);
    const [refreshData, setRefreshData] = useState(false);

    const fetchPaymentResponseData = useCallback(async () => {
        try {
            console.log("Fetching payment response data...");
            const response = await fetch('http://192.168.1.13:8090/get-payment-response-data');
            if (!response.ok) {
                if (response.status === 404) {
                    setPaymentData({ message: 'No payment response data found yet.' });
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return;
            }
            const textData = await response.text();

            try {
                const jsonData = JSON.parse(textData.substring(textData.indexOf('{')));
                setPaymentData(jsonData);
                console.log("Payment data loaded and parsed:", jsonData);

                if (jsonData && jsonData.txn_status_code === '0300') {
                    console.log("Transaction successful (0300), calling handleCollectOnline");
                    await handleCollectOnline(jsonData.txn_amt); // Call handleCollectOnline (without customerId argument)
                }

            } catch (jsonError) {
                console.error("Error parsing JSON from text:", jsonError);
                setPaymentData({ message: 'Error displaying payment data: Could not parse JSON.' });
            }

        } catch (error) {
            console.error("Fetching payment data failed:", error);
            setPaymentData({ message: 'Failed to load payment response data.' });
        }
    }, []);

    useEffect(() => {
        const paymentHtmlUrl = 'http://192.168.1.13:3000/payments.html';
        Linking.openURL(paymentHtmlUrl).catch(err => console.error("Failed to open payment URL:", err));

        fetchPaymentResponseData(); // Initial data fetch on component mount

    }, [fetchPaymentResponseData]); // Dependency array with fetchPaymentResponseData

    // REMOVED useEffect for fetching customerId from token at component level

    const handleCollectOnline = useCallback(async (amount) => { //  customerId argument REMOVED
        let currentCustomerId = null; // Declare customerId within the function

        console.log("handleCollectOnline called with amount:", amount);

        // **FETCH CUSTOMER ID INSIDE handleCollectOnline**
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            if (!token) {
                console.warn("Authentication token not found in handleCollectOnline.");
                Alert.alert("Error", "Authentication token is missing. Cannot process payment.");
                return; // Exit if no token
            }
            const decoded = jwtDecode(token);
            currentCustomerId = decoded.id; // Get customer ID
            console.log("Customer ID fetched inside handleCollectOnline:", currentCustomerId); // Log fetched customerId
            // setCustomerId(fetchedCustomerId); // NO NEED to set component-level state anymore

        } catch (tokenError) {
            console.error("Error fetching or decoding token in handleCollectOnline:", tokenError);
            Alert.alert("Error", "Failed to retrieve user information. Cannot process payment.");
            setIsCollectingOnlinePayment(false); // Stop loading indicator in case of error
            return; // Exit on token error
        }


        if (isNaN(amount) || amount < 0) {
            console.log("Validation failed: Invalid amount");
            Alert.alert("Invalid Amount", "Payment amount is invalid.");
            return;
        }

        if (!currentCustomerId) { // Use the locally fetched currentCustomerId
            console.log("Validation failed: Customer ID missing (even after fetching)");
            Alert.alert("Error", "Customer information is missing. Cannot process payment.");
            return;
        }

        setIsCollectingOnlinePayment(true);
        try {
            const backendURL = 'http://192.168.1.13:8090';
            const apiUrl = `${backendURL}/collect_online?customerId=${currentCustomerId}`; // Use locally fetched customerId
            console.log("Calling API URL:", apiUrl);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ online: parseFloat(amount) }),
            });

            console.log("API Response Status:", response.status, "OK:", response.ok);

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData?.message || `HTTP error! status: ${response.status}`;
                console.error("API Error:", errorMessage, errorData);
                throw new Error(errorMessage);
            }

            const successData = await response.json();
            console.log("API Success:", successData);
            Toast.show({
                type: 'success',
                text1: 'Payment Success',
                text2: successData.message || "Online payment recorded successfully!",
                position: 'bottom',
            });
            setRefreshData(prevState => !prevState); // Trigger refresh on success

        } catch (error) {
            console.error("Error in handleCollectOnline:", error);
            Alert.alert("Payment Error", `Failed to record online payment: ${error.message}`);
        } finally {
            setIsCollectingOnlinePayment(false);
        }
    }, [setRefreshData]); // useCallback dependency array - only setRefreshData is needed


    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Payment Response Data:</Text>
            {paymentData ? (
                paymentData.message ? (
                    <Text style={styles.errorText}>{paymentData.message}</Text>
                ) : (
                    <View style={styles.dataContainer}>
                        {Object.entries(paymentData).map(([key, value]) => (
                            <View style={styles.dataRow} key={key}>
                                <Text style={styles.dataKey}>{key}: </Text>
                                <Text style={styles.dataValue}>{value}</Text>
                            </View>
                        ))}
                        {isCollectingOnlinePayment && (
                            <ActivityIndicator size="large" color="#007bff" style={styles.collectingIndicator} />
                        )}
                    </View>
                )
            ) : (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007bff" />
                    <Text style={styles.loadingText}>Loading payment data...</Text>
                </View>
            )}
            <Toast ref={(ref) => Toast.setRef(ref)} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20 },
    header: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    errorText: { color: 'red', marginTop: 10, textAlign: 'center' },
    dataContainer: { marginTop: 10, borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5 },
    dataRow: { flexDirection: 'row', marginBottom: 5 },
    dataKey: { fontWeight: 'bold', marginRight: 5 },
    dataValue: { flex: 1, flexWrap: 'wrap' },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#6c757d',
    },
    collectingIndicator: {
        marginTop: 20,
    },
});