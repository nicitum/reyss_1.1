import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CollectCashPage = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.welcomeText}>Welcome to Collect Cash Page!</Text>
            {/* You can add more UI elements and functionality below */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    // You can add more styles here as needed for other elements
});

export default CollectCashPage;