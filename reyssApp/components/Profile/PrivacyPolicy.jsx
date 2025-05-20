import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const PrivacyPolicyScreen = () => {
    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>REYSS Privacy Policy</Text>
            <Text style={styles.updated}>Last Updated: April 21, 2025</Text>
            <Text style={styles.paragraph}>
                At REYSS, we value your trust and are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our milk order management app.
            </Text>
            <Text style={styles.subtitle}>1. Information We Collect</Text>
            <Text style={styles.listItem}>- <Text style={styles.bold}>Personal Information</Text>: Name, phone number, address, and email provided during registration or order placement.</Text>
            <Text style={styles.listItem}>- <Text style={styles.bold}>Order Data</Text>: Details of your milk orders, delivery preferences, and payment information.</Text>
            <Text style={styles.listItem}>- <Text style={styles.bold}>Usage Data</Text>: App interactions, such as order history and preferences, to improve your experience.</Text>
            <Text style={styles.listItem}>- <Text style={styles.bold}>Device Information</Text>: Device type, IP address, and app version for technical support and analytics.</Text>
            <Text style={styles.subtitle}>2. How We Use Your Information</Text>
            <Text style={styles.listItem}>- To process and deliver your milk orders efficiently.</Text>
            <Text style={styles.listItem}>- To communicate order updates, promotions, or app-related information.</Text>
            <Text style={styles.listItem}>- To improve app functionality and personalize your experience.</Text>
            <Text style={styles.listItem}>- To comply with legal obligations and ensure secure transactions.</Text>
            <Text style={styles.subtitle}>3. Data Sharing</Text>
            <Text style={styles.paragraph}>
                We do not sell your information. We may share data with:
            </Text>
            <Text style={styles.listItem}>- Delivery partners to fulfill orders.</Text>
            <Text style={styles.listItem}>- Payment processors to handle transactions securely.</Text>
            <Text style={styles.listItem}>- Legal authorities, if required by law.</Text>
            <Text style={styles.subtitle}>4. Data Security</Text>
            <Text style={styles.paragraph}>
                We use encryption and secure servers to protect your data. However, no system is completely immune to risks, and we strive to minimize threats.
            </Text>
            <Text style={styles.subtitle}>5. Your Choices</Text>
            <Text style={styles.listItem}>- Update your account details in the app.</Text>
            <Text style={styles.listItem}>- Opt out of promotional messages via app settings.</Text>
            <Text style={styles.listItem}>- Contact us to request data deletion, subject to legal requirements.</Text>
            <Text style={styles.subtitle}>6. Cookies</Text>
            <Text style={styles.paragraph}>
                REYSS uses minimal cookies for app functionality and analytics. You can manage cookie preferences in your device settings.
            </Text>
            <Text style={styles.subtitle}>7. Changes to This Policy</Text>
            <Text style={styles.paragraph}>
                We may update this policy to reflect app changes or legal requirements. We’ll notify you of significant updates via the app or email.
            </Text>
            <Text style={styles.subtitle}>8. Contact Us</Text>
            <Text style={styles.paragraph}>
                For questions or concerns, reach out to us at:
            </Text>
            <Text style={styles.listItem}>- <Text style={styles.bold}>Email</Text>: slenterprisess905@gmail.com</Text>
            <Text style={styles.listItem}>- <Text style={styles.bold}>Phone</Text>: +91-9611556661</Text>
            <Text style={styles.paragraph}>
                Thank you for choosing REYSS for your milk ordering needs!
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
        color: "#ffcc00",
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
        color: "#ffcc00",
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

export default PrivacyPolicyScreen;