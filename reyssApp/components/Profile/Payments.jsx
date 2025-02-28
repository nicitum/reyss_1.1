import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, Platform, Alert } from 'react-native';
import WeiplCheckout from 'react-native-weipl-checkout';

const PaymentScreen = () => {
    const [scheme, setScheme] = useState('');
    const [deviceId, setDeviceId] = useState('');

    useEffect(() => {
        switch (Platform.OS) {
            case 'android':
                setDeviceId("androidsh2");
                break;
            case 'ios':
                setDeviceId("iossh2");
                break;
            default:
                setDeviceId('');
                console.warn("Unsupported platform for deviceId");
        }
    }, []);

    const initiateRequest = () => {
        if (!deviceId) {
            Alert.alert("Device ID Error", "Device ID is not set for this platform.");
            return;
        }

        const options = {
            "features": {
                "enableAbortResponse": true,
                "enableExpressPay": true,
                "enableInstrumentDeRegistration": true,
                "enableMerTxnDetails": true
            },
            "consumerData": {
                "deviceId": deviceId,
                "token": "e210b297516dada3795a0064d436a4a2a9a9f5dd2af35977bca1a595e7b39c54b9cf0c048b78196fbcae1d7d32b758066d1492a61ae59ead772ea6088481c475",
                "paymentMode": "all",
                "merchantLogoUrl": "https://www.paynimo.com/CompanyDocs/company-logo-vertical.png",
                "merchantId": "L3348",
                "currency": "INR",
                "consumerId": "cust_01",
                "txnId": String(Date.now()),
                "items": [{
                    "itemId": "first",
                    "amount": "1",
                    "comAmt": "0"
                }],
                "totalAmount": "1",
                "customStyle": {
                    "PRIMARY_COLOR_CODE": "#45beaa",
                    "SECONDARY_COLOR_CODE": "#ffffff",
                    "BUTTON_COLOR_CODE_1": "#2d8c8c",
                    "BUTTON_COLOR_CODE_2": "#ffffff",
                }
            }
        };

        console.log("Initiating Weipl Checkout with options:", options);

        if (WeiplCheckout && WeiplCheckout.open) {
            WeiplCheckout.open(options, responseCallback, errorCallback);
        } else {
            Alert.alert(
                "Payment Error",
                "WeiplCheckout module is not properly initialized. Please ensure the library is correctly installed and linked."
            );
            console.error("WeiplCheckout or WeiplCheckout.open is undefined. Check library installation and linking.");
        }
    };

    const upiIntentAppsList = async () => {
        try {
            const res = await WeiplCheckout.upiIntentAppsList();
            Alert.alert("UPI Apps List", JSON.stringify(res, null, 2));
            console.log("UPI Apps List:", res);
        } catch (error) {
            console.error("Error fetching UPI apps:", error);
            Alert.alert("Error", "Failed to retrieve UPI apps list.");
        }
    };

    const checkInstalledUpiApp = async () => {
        if (!scheme) {
            Alert.alert("UPI Scheme Required", "Please enter a UPI scheme to check.");
            return;
        }
        try {
            const res = await WeiplCheckout.checkInstalledUpiApp(scheme);
            Alert.alert("UPI Scheme Check", res ? "Installed" : "Not Installed");
            console.log("UPI Scheme Check:", res);
        } catch (error) {
            console.error("Error checking UPI scheme:", error);
            Alert.alert("Error", "Failed to check UPI scheme.");
        }
    };

    const responseCallback = (res) => {
        Alert.alert("Payment Response", JSON.stringify(res, null, 2));
        console.log("Payment Response:", res);
    };

    const errorCallback = (error) => {
        Alert.alert("Payment Error", JSON.stringify(error, null, 2));
        console.error("Payment Error Callback:", error);
    };

    return (
        <View style={styles.container}>
            <Text style={{ marginBottom: 20, fontSize: 18, fontWeight: 'bold' }}>Payment Screen</Text>

            <Pressable style={styles.button} onPress={initiateRequest}>
                <Text style={styles.text}>Initiate Request</Text>
            </Pressable>

            {Platform.OS === 'android' && (
                <View style={styles.fullView}>
                    <Pressable style={styles.button} onPress={upiIntentAppsList}>
                        <Text style={styles.text}>Get UPI Installed Apps</Text>
                    </Pressable>
                </View>
            )}

            {Platform.OS === 'ios' && (
                <View style={styles.fullView}>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter UPI Scheme"
                        value={scheme}
                        onChangeText={setScheme}
                    />
                    <Pressable style={styles.button} onPress={checkInstalledUpiApp}>
                        <Text style={styles.text}>Check UPI Scheme</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    fullView: {
        width: '100%'
    },
    input: {
        width: '100%',
        borderColor: '#CCCCCC',
        borderWidth: 1,
        marginTop: 6,
        marginBottom: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        fontSize: 14,
        color: '#555555'
    },
    button: {
        width: '100%',
        backgroundColor: '#45BEAA',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        alignItems: 'center',
        marginTop: 12
    },
    text: {
        color: '#fff',
        fontWeight: 'bold'
    }
});

export default PaymentScreen;