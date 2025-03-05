import React, { useEffect } from 'react';
import { StyleSheet, View, Linking } from 'react-native';

export default function Payments() {
    useEffect(() => {
        const url = 'http://192.168.1.13:3000/payments.html'; // Replace with your actual payment URL - must be hosted 
        Linking.openURL(url).catch(err => console.error("Failed to open URL:", err));
    }, []);

    return <View style={styles.container} />;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
});
