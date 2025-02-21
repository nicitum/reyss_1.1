import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { ipAddress } from "../../urls";
import { jwtDecode } from "jwt-decode";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from 'react-native-vector-icons/MaterialIcons'; // Import icons if you want to use them

const DeliveryStatusUpdate = () => {
    const [selectedStatus, setSelectedStatus] = useState("pending");
    const [customerId, setCustomerId] = useState(null);
    const [orders, setOrders] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updatedOrders, setUpdatedOrders] = useState(new Set());

    useEffect(() => {
        const fetchAuthToken = async () => {
            try {
                setLoading(true);
                const storedToken = await AsyncStorage.getItem("userAuthToken");
                if (storedToken) {
                    const decodedToken = jwtDecode(storedToken);
                    if (decodedToken?.id) {
                        setCustomerId(decodedToken.id);
                        fetchOrders(decodedToken.id);
                        loadUpdatedOrders();
                    }
                }
            } catch (error) {
                console.error("Error decoding auth token:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAuthToken();
    }, []);

    const fetchOrders = async (customerId) => {
        try {
            const response = await axios.get(`http://${ipAddress}:8090/get-orders/${customerId}`);
            if (response.data.status) {
                setOrders(response.data.orders);
                if (response.data.orders.length > 0) {
                    setSelectedOrderId(response.data.orders[0].id);
                }
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
        }
    };

    const loadUpdatedOrders = async () => {
        try {
            const storedUpdatedOrders = await AsyncStorage.getItem("updatedOrders");
            if (storedUpdatedOrders) {
                setUpdatedOrders(new Set(JSON.parse(storedUpdatedOrders)));
            }
        } catch (error) {
            console.error("Error loading updated orders:", error);
        }
    };

    const saveUpdatedOrders = async (updatedSet) => {
        try {
            await AsyncStorage.setItem("updatedOrders", JSON.stringify(Array.from(updatedSet)));
        } catch (error) {
            console.error("Error saving updated orders:", error);
        }
    };

    const updateDeliveryStatus = async () => {
        if (!customerId || !selectedOrderId) {
            alert("Please select an order.");
            return;
        }
        try {
            setLoading(true); // Disable button while updating
            const payload = {
                customer_id: customerId,
                order_id: selectedOrderId, // Send order ID as well
                delivery_status: selectedStatus,
            };
            const response = await axios.post(
                `http://${ipAddress}:8090/update-delivery-status`,
                payload,
                { headers: { "Content-Type": "application/json" } }
            );
            if (response.data.status) {
                alert("Delivery status updated successfully!");
                fetchOrders(customerId);

                setUpdatedOrders((prev) => {
                    const newUpdatedSet = new Set(prev).add(selectedOrderId);
                    saveUpdatedOrders(newUpdatedSet);
                    return newUpdatedSet;
                });
            } else {
                alert("Failed to update delivery status.");
            }
        } catch (error) {
            console.error("Error updating delivery status:", error);
            alert("Failed to update delivery status.");
        } finally {
            setLoading(false); // Re-enable button
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'delivered': return '#2ecc71'; // Green for Delivered
            case 'pending': return '#f39c12';   // Orange for Pending
            default: return '#777';             // Grey for default/unknown
        }
    };


    return (
        <View style={styles.container}>
            <Text style={styles.headerText}>Update Delivery Status</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#567189" style={styles.loader} />
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.orderContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.orderItem,
                                    selectedOrderId === item.id && styles.selectedOrder,
                                ]}
                                onPress={() => setSelectedOrderId(item.id)}
                            >
                                <View style={styles.orderInfo}>
                                    <Text style={styles.orderIdText}>Order ID: {item.id}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.delivery_status) }]}>
                                        <Text style={styles.statusText}>Status: {item.delivery_status}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {!updatedOrders.has(item.id) && (
                                <View style={styles.statusUpdateSection}>
                                    <Picker
                                        selectedValue={selectedStatus}
                                        onValueChange={(itemValue) => setSelectedStatus(itemValue)}
                                        style={styles.picker}
                                        dropdownIconColor="#567189"
                                    >
                                        <Picker.Item label="Pending" value="pending" />
                                        <Picker.Item label="Delivered" value="delivered" />
                                    </Picker>

                                    <TouchableOpacity
                                        style={styles.updateButton}
                                        onPress={updateDeliveryStatus}
                                        disabled={loading} // Disable button while loading
                                    >
                                        <Text style={styles.updateButtonText}>
                                            {loading ? "Updating..." : "Update Status"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f0f4f7", // Light grey background
        padding: 20,
    },
    headerText: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 20,
        color: "#333", // Dark text color
    },
    loader: {
        marginTop: 20,
    },
    orderContainer: {
        marginBottom: 20,
        backgroundColor: '#fff', // White container for each order
        borderRadius: 10,
        overflow: 'hidden', // For rounded corners to work with background color
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3, // For Android shadow
    },
    orderItem: {
        padding: 15,
        backgroundColor: "#fff", // White background for list item
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    selectedOrder: {
        backgroundColor: '#e0f7fa', // Very light blue for selected order
    },
    orderInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderIdText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        backgroundColor: '#f39c12', // Default status badge color (orange-ish)
    },
    statusText: {
        color: '#fff', // White text for status badge
        fontWeight: 'bold',
        fontSize: 12,
    },
    statusUpdateSection: {
        padding: 15,
        backgroundColor: '#f9f9f9', // Light grey background for update section
    },
    picker: {
        width: "100%",
        marginVertical: 10,
        backgroundColor: '#fff',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 10,
        color: '#555',
    },
    updateButton: {
        backgroundColor: "#567189", // Dark blue button
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 10,
    },
    updateButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default DeliveryStatusUpdate;