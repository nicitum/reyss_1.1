import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
} from "react-native";

import axios from "axios";
import { ipAddress } from "../../urls";
import LoadingIndicator from "../general/Loader";
import { checkTokenAndRedirect } from "../../services/auth";
import { useNavigation } from "@react-navigation/native";
import { Card } from 'react-native-paper'; // Using react-native-paper Card for a polished look

const ProfileContent = () => {
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [defaultOrder, setDefaultOrder] = useState(null);
    const [error, setError] = useState(null);

    const navigation = useNavigation();

    useEffect(() => {
        const fetchUserDetails = async () => {
            try {
                const token = await checkTokenAndRedirect(navigation);
                if (!token) throw new Error("No authorization token found.");

                const response = await axios.get(
                    `http://${ipAddress}:8090/userDetails`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const { user, defaultOrder } = response.data;
                setUserData(user);
                setDefaultOrder(defaultOrder);
            } catch (err) {
                setError(err.message || "Failed to fetch data.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserDetails();
    }, []);

    if (loading) {
        return <LoadingIndicator />;
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: {error}</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>

            {/* User Profile Section */}
            <Card style={styles.sectionCard}>
                <Card.Title title="User Profile" titleStyle={styles.sectionHeader} />
                <Card.Content>
                    <View style={styles.userInfoGrid}>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Name:</Text>
                            <Text style={styles.value}>{userData?.name}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Phone:</Text>
                            <Text style={styles.value}>{userData?.phone}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Username:</Text>
                            <Text style={styles.value}>{userData?.username}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Delivery Address:</Text>
                            <Text style={styles.value}>{userData?.delivery_address}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Route:</Text>
                            <Text style={styles.value}>{userData?.route}</Text>
                        </View>
                    </View>
                </Card.Content>
            </Card>

            {/* Default Order Section */}
            {defaultOrder ? (
                <Card style={styles.sectionCard}>
                    <Card.Title title="Default Order Details" titleStyle={styles.sectionHeader} />
                    <Card.Content>
                        <View style={styles.orderSummary}>
                            <Text style={styles.totalAmount}>
                                Total: ₹{defaultOrder.order.total_amount}
                            </Text>
                        </View>
                        <View style={styles.orderItemsContainer}>
                            {defaultOrder.products.map((product, index) => (
                                <Card key={index} style={styles.productCard}>
                                    <Card.Content style={styles.productCardContent}>
                                        <Text style={styles.productName}>{product.name}</Text>
                                        <View style={styles.productDetails}>
                                            <Text style={styles.quantity}>Qty: {product.quantity}</Text>
                                            <Text style={styles.price}>₹{product.price}</Text>
                                        </View>
                                    </Card.Content>
                                </Card>
                            ))}
                        </View>
                    </Card.Content>
                </Card>
            ) : (
                <Card style={[styles.sectionCard, styles.emptySectionCard]}>
                    <Card.Content>
                        <Text style={styles.emptyText}>No Default Order Available</Text>
                    </Card.Content>
                </Card>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#f8f8f8', // Light grey background for a clean look
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    sectionCard: {
        marginBottom: 20,
        elevation: 2, // Subtle shadow for card effect
        borderRadius: 8,
        overflow: 'hidden', // To ensure rounded corners for Card.Content
    },
    sectionHeader: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333', // Darker header text
        padding: 16,
        paddingBottom: 0, // Reduce bottom padding of header for better spacing
    },
    userInfoGrid: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 8,
    },
    label: {
        fontSize: 16,
        color: '#555', // Slightly darker label color
        fontWeight: '500',
    },
    value: {
        fontSize: 16,
        color: '#333', // Darker value color
        fontWeight: 'normal',
    },
    orderCard: {
        // No longer using this style directly - styles are applied to react-native-paper Card
    },
    orderSummary: {
        paddingHorizontal: 16,
        marginBottom: 20,
        alignItems: 'flex-end', // Align total amount to the right
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2ecc71', // Green color for total amount
    },
    orderItemsContainer: {
        paddingHorizontal: 8,
        paddingBottom: 8,
    },
    productCard: {
        marginBottom: 8,
        elevation: 1, // Less shadow for product cards
        borderRadius: 6,
        marginHorizontal: 8,
    },
    productCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    productName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#34495e',
        flex: 1,
    },
    productDetails: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quantity: {
        fontSize: 15,
        color: '#777', // Muted quantity color
        marginRight: 15,
    },
    price: {
        fontSize: 17,
        fontWeight: 'semibold',
        color: '#2980b9', // Blue price color
    },
    emptySectionCard: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        color: '#777', // Muted empty text color
        fontWeight: 'normal',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 17,
        fontWeight: 'bold',
    },
});

export default ProfileContent;