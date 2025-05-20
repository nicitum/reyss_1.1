import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const TermsConditionsScreen = () => {
    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>REYSS Terms & Conditions</Text>
            <Text style={styles.updated}>Last Updated: April 21, 2025</Text>
            <Text style={styles.paragraph}>
                Welcome to REYSS, your milk order management app. By using our app, you agree to these Terms & Conditions. Please read them carefully.
            </Text>
            <Text style={styles.subtitle}>1. Use of the App</Text>
            <Text style={styles.listItem}>- REYSS allows you to place, manage, and track milk orders.</Text>
            <Text style={styles.listItem}>- You must be 18 or older to create an account.</Text>
            <Text style={styles.listItem}>- Provide accurate information during registration and order placement.</Text>
            <Text style={styles.listItem}>- Do not misuse the app, including unauthorized access or harmful activities.</Text>
            <Text style={styles.subtitle}>2. Orders and Payments</Text>
            <Text style={styles.listItem}>- Orders are subject to availability and confirmation by REYSS or delivery partners.</Text>
            <Text style={styles.listItem}>- Prices are as displayed in the app, inclusive of applicable taxes.</Text>
            <Text style={styles.listItem}>- Payments must be made via the app’s secure payment methods.</Text>
            <Text style={styles.listItem}>- Refunds, if applicable, follow our refund policy in the app.</Text>
            <Text style={styles.subtitle}>3. Delivery</Text>
            <Text style={styles.listItem}>- Delivery times are estimates and may vary due to unforeseen circumstances.</Text>
            <Text style={styles.listItem}>- Ensure someone is available to receive deliveries at the specified address.</Text>
            <Text style={styles.listItem}>- REYSS is not liable for delays caused by incorrect address details.</Text>
            <Text style={styles.subtitle}>4. Account Responsibility</Text>
            <Text style={styles.listItem}>- Keep your account credentials secure and do not share them.</Text>
            <Text style={styles.listItem}>- Notify us immediately of any unauthorized account activity.</Text>
            <Text style={styles.listItem}>- REYSS may suspend accounts for misuse or violation of these terms.</Text>
            <Text style={styles.subtitle}>5. Intellectual Property</Text>
            <Text style={styles.listItem}>- All app content, logos, and designs are owned by REYSS.</Text>
            <Text style={styles.listItem}>- You may not copy, modify, or distribute app content without permission.</Text>
            <Text style={styles.subtitle}>6. Limitation of Liability</Text>
            <Text style={styles.listItem}>- REYSS strives to provide reliable service but is not liable for:</Text>
            <Text style={styles.listItem}>    - App interruptions due to technical issues.</Text>
            <Text style={styles.listItem}>  - Losses from inaccurate user-provided information.</Text>
            <Text style={styles.listItem}>  - Third-party actions, such as payment or delivery issues.</Text>
            <Text style={styles.listItem}>- Use the app at your own risk, subject to applicable laws.</Text>
            <Text style={styles.subtitle}>7. Termination</Text>
            <Text style={styles.listItem}>- We may terminate or suspend your account for violating these terms.</Text>
            <Text style={styles.subtitle}>8. Changes to Terms</Text>
            <Text style={styles.paragraph}>
                We may update these terms to reflect app or legal changes. Continued use after updates implies acceptance.
            </Text>
            <Text style={styles.subtitle}>9. Contact Us</Text>
            <Text style={styles.paragraph}>
                For support or queries, contact:
            </Text>
            <Text style={styles.listItem}>- <Text style={styles.bold}>Email</Text>: slenterprisess905@gmail.com</Text>
            <Text style={styles.listItem}>- <Text style={styles.bold}>Phone</Text>: +91-9611556661</Text>
            <Text style={styles.paragraph}>
                Thank you for using REYSS to simplify your milk orders!
            </Text>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color:"#ffcc00",
        marginBottom: 10,
        textAlign: 'center',
    },
    updated: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color:"#ffcc00",
        marginTop: 15,
        marginBottom: 10,
    },
    paragraph: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
        marginBottom: 10,
    },
    listItem: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
        marginBottom: 5,
    },
    bold: {
        fontWeight: '600',
        color:"#ffcc00",
    },
});

export default TermsConditionsScreen;