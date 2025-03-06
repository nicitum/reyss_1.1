import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native'; // Import Linking
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import Toast from 'react-native-toast-message';

export default function Payments() {
    const [paymentData, setPaymentData] = useState(null);
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
                    await handleCollectOnline(jsonData.txn_amt);
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
        fetchPaymentResponseData();
        // **No WebView URI loading needed now**
    }, [fetchPaymentResponseData]);


    const handleCollectOnline = useCallback(async (amount) => {
        let currentCustomerId = null;

        console.log("handleCollectOnline called with amount:", amount);

        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            if (!token) {
                console.warn("Authentication token not found in handleCollectOnline.");
                Alert.alert("Error", "Authentication token is missing. Cannot process payment.");
                return;
            }
            const decoded = jwtDecode(token);
            currentCustomerId = decoded.id;
            console.log("Customer ID fetched inside handleCollectOnline:", currentCustomerId);

        } catch (tokenError) {
            console.error("Error fetching or decoding token in handleCollectOnline:", tokenError);
            Alert.alert("Error", "Failed to retrieve user information. Cannot process payment.");
            setIsCollectingOnlinePayment(false);
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

        setIsCollectingOnlinePayment(true);
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
                        "amount": amount.toString(), // Use amount from handleCollectOnline, convert to string
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
            console.error("Error in handleCollectOnline:", error);
            Alert.alert("Payment Error", `Failed to initiate payment: ${error.message}`);
        } finally {
            setIsCollectingOnlinePayment(false);
        }
    }, [setRefreshData]);


    // ** No handleWebViewMessage function needed anymore **


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

            {/* ** WebView Container Removed ** */}

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