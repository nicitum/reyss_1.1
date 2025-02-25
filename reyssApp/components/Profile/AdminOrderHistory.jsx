import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { jwtDecode } from 'jwt-decode';
import moment from 'moment'; // Import moment if not already imported

import { ipAddress } from '../../urls';

const AdminOrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAdminOrderHistory();
    }, []);

    const fetchAdminOrderHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const decodedToken = jwtDecode(token);
            const adminId = decodedToken.id1;

            const url = `http://${ipAddress}:8090/get-admin-orders/${adminId}`;
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            const response = await fetch(url, { headers });
            if (!response.ok) {
                throw new Error(`Failed to fetch orders. Status: ${response.status}`);
            }

            const data = await response.json();
            setOrders(data.orders);
        } catch (error) {
            setError(error.message || "Failed to fetch orders.");
            Toast.show({ type: 'error', text1: 'Fetch Error', text2: error.message || "Failed to fetch orders." });
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (epochTimestamp) => {
        if (!epochTimestamp) return 'N/A';

        // **Parse epoch timestamp in seconds using moment.unix()**
        const orderDateMoment = moment.unix(epochTimestamp);
        console.log("DEBUG: Moment Object from Epoch (Seconds using .unix()):", orderDateMoment); // Debug log

        // **Format to "Feb 22 2025" (MMM DD YYYY) format**
        return orderDateMoment.format('MMM DD YYYY');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Admin Order History</Text>

            {loading && <ActivityIndicator size="large" color="#007bff" style={styles.loader} />}
            {error && <Text style={styles.errorText}>{error}</Text>}

            {!loading && !error && (
                <ScrollView>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerCell, styles.boldText]}>Order ID</Text>
                        <Text style={[styles.headerCell, styles.boldText]}>Placed On</Text>
                        <Text style={[styles.headerCell, styles.boldText, { flex: 1.2 }]}>Total Amount</Text>
                        <Text style={[styles.headerCell, styles.boldText]}>Closed</Text>
                    </View>

                    {orders.length === 0 ? (
                        <Text style={styles.noOrdersText}>No orders found.</Text>
                    ) : (
                        orders.map((item) => (
                            <View key={item.id} style={styles.tableRow}>
                                <Text style={styles.cell}>{item.id}</Text>
                                <Text style={styles.cell}>{formatDate(item.placed_on)}</Text>
                                <Text style={[styles.cell, { flex: 1.2 }]}>₹{item.total_amount ? parseFloat(item.total_amount).toFixed(2) : 'N/A'}</Text>
                                <Text style={styles.cell}>{item.closed === 'yes' ? 'Yes' : 'Pending'}</Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            <Toast ref={(ref) => Toast.setRef(ref)} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 15,
        backgroundColor: '#f4f6f8', // Light grey background for the page
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333', // Dark grey title text
        marginBottom: 20,
        textAlign: 'center',
    },
    loader: {
        marginTop: 20,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginTop: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#e0e0e0', // Light grey header background
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: '#ccc',
    },
    headerCell: {
        flex: 1,
        fontSize: 16,
        color: '#555', // Medium grey header text
        textAlign: 'left',
        paddingHorizontal: 10,
    },
    boldText: {
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: '#eee', // Very light grey row separator
        backgroundColor: '#fff', // White background for rows
        marginBottom: 2, // Slight margin between rows
        borderRadius: 5, // Slightly rounded rows
        elevation: 1, // Subtle shadow for row elevation
    },
    cell: {
        flex: 1,
        fontSize: 14,
        color: '#333', // Dark grey cell text
        textAlign: 'left',
        paddingHorizontal: 10,
    },
    noOrdersText: {
        textAlign: 'center',
        color: '#777', // Light grey for "No orders" text
        marginTop: 20,
        fontSize: 16,
    },
});

export default AdminOrderHistory;