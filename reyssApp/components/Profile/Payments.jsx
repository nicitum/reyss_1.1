import React, { useState, useEffect, useRef } from "react"; // Import useRef
import { View, Text, StyleSheet, Platform, Linking } from "react-native";
import { WebView } from "react-native-webview";
import { Asset } from "expo-asset";

const PaymentScreen = () => {
    const [htmlUri, setHtmlUri] = useState(null);
    const [deviceId, setDeviceId] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('loading');
    const webViewRef = useRef(null); // Initialize webViewRef using useRef(null)

    useEffect(() => {
        switch (Platform.OS) {
            case 'android':
                setDeviceId("WEBSH2");
                break;
            case 'ios':
                setDeviceId("WEBSH2");
                break;
            default:
                setDeviceId('WEBSH2');
                console.warn("Platform not explicitly handled, defaulting to WEBSH2 for deviceId");
        }

        const loadHtmlFile = async () => {
            try {
                const asset = Asset.fromModule(require("../../assets/web/payments.html"));
                await asset.downloadAsync();
                setHtmlUri(asset.uri);
                console.log("HTML URI (asset.uri):", asset.uri);
            } catch (error) {
                console.error("Error loading HTML:", error);
                setPaymentStatus('failed');
            }
        };

        loadHtmlFile();
    }, []);

    const handleWebViewMessage = (event) => {
        try {
            const responseData = JSON.parse(event.nativeEvent.data);
            console.log("Payment Response from WebView:", responseData);
            if (responseData && responseData.status === 'success') {
                setPaymentStatus('success');
            } else {
                setPaymentStatus('failed');
            }
        } catch (error) {
            console.error("Error parsing WebView message:", error);
            setPaymentStatus('failed');
        }
    };


    return (
        <View style={styles.container}>
            <Text style={styles.headerText}>Worldline Checkout</Text>
            <View style={styles.webViewContainer}>
                {htmlUri ? (
                    <WebView
                        ref={webViewRef} // Attach the ref to the WebView
                        originWhitelist={["*"]}
                        source={{ uri: htmlUri }}
                        javaScriptEnabled={true}
                        onMessage={handleWebViewMessage}
                        onNavigationStateChange={(navState) => {
                            console.log("WebView URL changed to:", navState.url);

                            if (navState.url && navState.url.startsWith("upi://")) {
                                console.warn("Intercepted UPI URL:", navState.url);
                                Linking.openURL(navState.url).catch(err => console.error('Error opening UPI URL:', err));
                                return false;
                            }
                             if (navState.url && navState.url.startsWith("intent://")) {
                                console.warn("Intercepted Intent URL:", navState.url);
                                Linking.openURL(navState.url).catch(err => console.error('Error opening Intent URL:', err));
                                return false;
                            }


                            if (navState.url && navState.url.startsWith("https://pgproxyuat.in.worldline-solutions.com/linuxsimulator/MerchantResponsePage.jsp")) {
                                console.log("Payment Response Page URL Detected:", navState.url);
                                const urlParams = new URLSearchParams(navState.url.split('?')[1]);
                                const paymentResponse = {};
                                for (const [key, value] of urlParams.entries()) {
                                    paymentResponse[key] = value;
                                }
                                console.log("Parsed Payment Response Data:", paymentResponse);

                                const script = `
                                    window.paymentResponseFromApp = ${JSON.stringify(paymentResponse)};
                                    window.ReactNativeWebView.postMessage(JSON.stringify(window.paymentResponseFromApp));
                                    true;
                                `;
                                setTimeout(() => {
                                    webViewRef.current.injectJavaScript(script).catch(error => {
                                        console.error("Error injecting JavaScript:", error);
                                    });
                                }, 500);


                            }
                            if (navState.errors && navState.errors.length > 0) {
                                console.error("WebView Navigation Error:", navState.errors);
                            }
                        }}

                    />
                ) : (
                    <View style={styles.loadingContainer}>
                        {paymentStatus === 'loading' ? (
                            <Text>Loading Payment Gateway...</Text>
                        ) : (
                            <Text style={styles.errorText}>Error Loading Payment Gateway.</Text>
                        )}
                    </View>

                )}
            </View>
            {paymentStatus === 'success' && (
                <View style={styles.overlay}>
                    <View style={styles.successContainer}>
                        <Text style={styles.successText}>Payment Successful!</Text>
                    </View>
                </View>
            )}

            {paymentStatus === 'failed' && htmlUri && (
                <View style={styles.overlay}>
                    <View style={styles.failureContainer}>
                        <Text style={styles.failureText}>Payment Failed.</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 20,
        backgroundColor: "#f0f0f0",
    },
    headerText: {
        fontSize: 22,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 10,
    },
    webViewContainer: {
        flex: 1,
        marginTop: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    successContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    successText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'green',
        marginBottom: 10,
    },
    failureContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    failureText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'red',
        marginBottom: 10,
    },

});

export default PaymentScreen;