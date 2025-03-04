import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const Payments = () => {
    const localHtmlFile = require("../../assets/web/payments.html"); // Adjust path if needed
    const webviewRef = useRef(null);

    useEffect(() => {
        console.log("Payments Component Mounted. webviewRef.current on mount:", webviewRef.current);
        return () => {
            console.log("Payments Component Unmounted.");
        };
    }, []);

    const handleWebViewMessage = (event) => {
        try {
            const responseData = JSON.parse(event.nativeEvent.data);
            console.log("Received Payment Response (All URL Params):", responseData); // Updated log message
    
            if (Object.keys(responseData).length > 0) { // Check if we received *any* URL parameters
                console.log("--- Extracted URL Parameters ---");
                for (const key in responseData) {
                    if (responseData.hasOwnProperty(key)) {
                        const value = responseData[key];
                        console.log(`Parameter: ${key} = Value: ${value}`); // Log each parameter and its value
                    }
                }
                console.log("--- End of URL Parameters ---");
    
                // **Example: Accessing 'msg' and status (adjust based on actual parameter names)**
                if (responseData.msg) {
                    const msgValue = responseData.msg;
                    const msgParts = msgValue.split('|');
                    const txnStatus = msgParts[0]; // txn_status is the first part (adjust index if needed)
                    console.log("Transaction Status (from msg param 'msg'):", txnStatus);
    
                    if (txnStatus === "0300") {
                        alert("Payment Successful (from URL params)!");
                    } else if (txnStatus === "0399") {
                        alert("Payment Failed (from URL params)!");
                    } else {
                        alert(`Payment Status (from URL params): ${txnStatus}`);
                    }
                } else {
                    console.log("Warning: 'msg' parameter NOT found in URL response."); // Warn if 'msg' is missing
                }
    
            } else {
                console.log("No URL parameters received in WebView message."); // Log if no parameters at all
            }
    
    
        } catch (error) {
            console.error("Error parsing WebView message:", error);
            console.log("Raw message data:", event.nativeEvent.data);
        }
    };

    const handleWebViewLoad = (syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        const currentUrl = nativeEvent.url;
    
        console.log("WebView onLoad event fired. currentUrl:", currentUrl);
        console.log("webviewRef.current in onLoad handler:", webviewRef.current);
    
        const injectJavaScriptCode = `
            (function() {
                function getUrlParams() {
                    const params = {};
                    const queryString = window.location.search;
                    const urlParams = new URLSearchParams(queryString);
                    for (const [key, value] of urlParams.entries()) {
                        params[key] = value;
                    }
                    return params;
                }
    
                const urlParams = getUrlParams();
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify(urlParams));
                }
            })();
        `;
    
        // **TEMPORARILY REMOVED URL/HTML CHECK for testing redirect URL parameter extraction**
        console.log("Injecting JS to get URL params on ANY page load (TESTING)."); // Updated log message
        if (webviewRef.current) {
            webviewRef.current.injectJavaScript(injectJavaScriptCode); // ✅ Correct usage
        } else {
            console.error("webviewRef.current is undefined, cannot inject JavaScript!");
        }
        
    
    };
    

    const webviewError = (syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.warn("WebView Error - URL:", nativeEvent.url, "Description:", nativeEvent.description, "Code:", nativeEvent.code);
    };


    return (
        <View style={styles.container}>
            <WebView
                ref={webviewRef}
                originWhitelist={['*']}
                source={localHtmlFile}
                style={styles.webView}
                javaScriptEnabled={true}
                onMessage={handleWebViewMessage}
                onLoad={handleWebViewLoad}
                onError={webviewError} // Add onError handler for WebView errors
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webView: {
        flex: 1,
    },
});

export default Payments;