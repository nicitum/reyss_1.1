import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native'; // Import Linking
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import Toast from 'react-native-toast-message';

export default function Payments() {
    const [paymentResponse, setPaymentResponse] = useState(null); // More descriptive name
    const [isInitiatingPayment, setIsInitiatingPayment] = useState(false); // More descriptive name
    const [refreshData, setRefreshData] = useState(false);


    // More descriptive function name - Initiates the online payment flow  - **DECLARE IT FIRST**
    const initiatePaymentFlow = useCallback(async (amount) => { // Function name updated
        let currentCustomerId = null;

        console.log("initiatePaymentFlow called with amount:", amount); // Updated function name in log

        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            if (!token) {
                console.warn("Authentication token not found in initiatePaymentFlow."); // Updated function name in log
                Alert.alert("Error", "Authentication token is missing. Cannot process payment.");
                return;
            }
            const decoded = jwtDecode(token);
            currentCustomerId = decoded.id;
            console.log("Customer ID fetched inside initiatePaymentFlow:", currentCustomerId); // Updated function name in log

        } catch (tokenError) {
            console.error("Error fetching or decoding token in initiatePaymentFlow:", tokenError); // Updated function name in log
            Alert.alert("Error", "Failed to retrieve user information. Cannot process payment.");
            setIsInitiatingPayment(false); // Updated state name
            return;
        }

        if (isNaN(amount) || amount < 0) {
            console.log("Validation failed: Invalid amount");
            Alert.alert("Invalid Amount", "Payment amount is invalid.");
            return;
        }

        if (!currentCustomerId) {
            console.log("Validation failed: Customer ID missing (even after fetching)");
            Alert.alert("Error", "Customer information is missing. Cannot process payment.");
            return;
        }

        setIsInitiatingPayment(true); // Updated state name
        try {
            // ** 1. Fetch Payment Token from your Node.js Server API **
            const tokenResponse = await fetch('http://192.168.1.13:8090/generate-payment-token', { // **IMPORTANT: Replace with your backend URL if different**
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount: amount }), // Send payment amount to server
            });

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json();
                const errorMessage = errorData?.error || `Failed to fetch token: HTTP ${tokenResponse.status}`;
                throw new Error(errorMessage);
            }

            const tokenData = await tokenResponse.json();
            const paymentToken = tokenData.token;
            const merchantId = tokenData.merchantId;
            const txnId = tokenData.txnId; // Get txnId from server response

            console.log("Payment Token Received:", paymentToken);

            // ** 2. Prepare reqJson (similar to before) **
            const reqJson = {
                "features": {
                    "enableAbortResponse": true,
                    "enableExpressPay": true,
                    "enableInstrumentDeRegistration" : true,
                    "enableMerTxnDetails": true,
                    "enableNewWindowFlow": true // **IMPORTANT: Keep as true for Linking.openURL**
                },
                "consumerData": {
                    "deviceId": "WEBSH2",
                    "token": paymentToken, // **Use the token fetched from server!**
                    "returnUrl": "http://192.168.1.13:8090/payment-response", // **IMPORTANT: Configure your deep link URL**
                    "responseHandler": "handleResponse", // **Will not be directly used with Linking.openURL**
                    "paymentMode": "all",
                    "merchantLogoUrl": "https://www.paynimo.com/CompanyDocs/company-logo-vertical.png",
                    "merchantId": merchantId, // Use merchantId from server response
                    "currency": "INR",
                    "consumerId": currentCustomerId, // Use fetched customerId
                    "txnId": txnId, // Use txnId from server response
                    "items": [{
                        "itemId": "first",
                        "amount": amount.toString(), // Use amount from initiatePaymentFlow, convert to string
                        "comAmt": "0"
                    }],
                    "customStyle": {
                        "PRIMARY_COLOR_CODE": "#45beaa",
                        "SECONDARY_COLOR_CODE": "#FFFFFF",
                        "BUTTON_COLOR_CODE_1": "#2d8c8c",
                        "BUTTON_COLOR_CODE_2": "#FFFFFF"
                    }
                }
            };

            const reqJsonString = JSON.stringify(reqJson);
            const params = new URLSearchParams();
            params.append('reqJson', reqJsonString);
            console.log("Payments.jsx - consumerData BEFORE URL:", reqJson.consumerData);
            // Replace with your actual production server URL or proper local IP
            const paymentUrl = `http://192.168.1.13:3000/payments?${params.toString()}`;
            console.log("Opening Payment URL in Browser:", paymentUrl);
            await Linking.openURL(paymentUrl).catch(err => {
                console.error('Error opening URL:', err);
                Alert.alert('Error', 'Could not open payment page. Please check your connection.');
            });

        } catch (error) {
            console.error("Error in initiatePaymentFlow:", error); // Updated function name in log
            Alert.alert("Payment Error", `Failed to initiate payment: ${error.message}`);
        } finally {
            setIsInitiatingPayment(false); // Updated state name
        }
    }, [setRefreshData]); // Keep setRefreshData if it is intended for future use, otherwise can be []


    // More descriptive function name - Get latest payment status from server - **DECLARE IT SECOND**
    const getLatestPaymentResponse = useCallback(async () => {
        try {
            console.log("Fetching latest payment response data...");
            const response = await fetch('http://192.168.1.13:8090/get-payment-response-data');
            if (!response.ok) {
                if (response.status === 404) {
                    setPaymentResponse({ message: 'No payment response data found yet.' }); // Updated state name
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return;
            }
            const textData = await response.text();

            try {
                const jsonData = JSON.parse(textData.substring(textData.indexOf('{')));
                setPaymentResponse(jsonData); // Updated state name
                console.log("Payment data loaded and parsed:", jsonData);

                if (jsonData && jsonData.txn_status_code === '0300') {
                    console.log("Transaction successful (0300), calling initiatePaymentFlow"); // Updated function name in log
                    await initiatePaymentFlow(jsonData.txn_amt); // Calling with amount from response -  can keep this for now, or change to harcoded if needed later
                }

            } catch (jsonError) {
                console.error("Error parsing JSON from text:", jsonError);
                setPaymentResponse({ message: 'Error displaying payment data: Could not parse JSON.' }); // Updated state name
            }

        } catch (error) {
            console.error("Fetching payment data failed:", error);
            setPaymentResponse({ message: 'Failed to load payment response data.' }); // Updated state name
        }
    }, []);

    // useEffect to initiate payment flow on component mount with hardcoded amount - **DECLARE IT THIRD - AFTER initiatePaymentFlow**
    useEffect(() => {
        const hardcodedAmount = 10; // Hardcoded amount as requested
        initiatePaymentFlow(hardcodedAmount); // Directly call payment initiation on mount
        // **Do NOT call getLatestPaymentResponse here on mount as per request**
    }, [initiatePaymentFlow]); // Dependency on initiatePaymentFlow


    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Payment Response Data:</Text>
            {paymentResponse ? ( // Updated state name
                paymentResponse.message ? ( // Updated state name
                    <Text style={styles.errorText}>{paymentResponse.message}</Text> // Updated state name
                ) : (
                    <View style={styles.dataContainer}>
                        {Object.entries(paymentResponse).map(([key, value]) => ( // Updated state name
                            <View style={styles.dataRow} key={key}>
                                <Text style={styles.dataKey}>{key}: </Text>
                                <Text style={styles.dataValue}>{value}</Text>
                            </View>
                        ))}
                        {isInitiatingPayment && ( // Updated state name
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
    // ** WebView Styles Removed **
});