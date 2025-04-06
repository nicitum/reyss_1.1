import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { ipAddress } from '../../urls';
import { useFocusEffect } from '@react-navigation/native'; // Import for better component focus handling

const AutoOrderUpdate = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);

    // Fetch all users from /allUsers/ API
    const fetchAllUsers = useCallback(async () => {
        setLoading(true);
        setError(null); // Clear previous errors
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            if (!token) {
                throw new Error("Authentication token not found. Please log in.");
            }

            const url = `http://${ipAddress}:8090/allUsers/`; // Using your exact URL
            const response = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            console.log("Response from fetchAllUsers:", response); // Debugging line

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch users: ${response.status} - ${errorText}`);
            }

            const responseJson = await response.json(); // Rename to avoid confusion
            console.log("Parsed usersData:", responseJson); // Keep this line

            if (responseJson && responseJson.data && Array.isArray(responseJson.data) && responseJson.data.length > 0) {
                setUsers(responseJson.data); // Access the 'data' array
            } else {
                setUsers([]);
                setError("No customers found.");
            }
        } catch (fetchError) {
            setError(fetchError.message || "Failed to fetch users.");
            Toast.show({ type: 'error', text1: 'Fetch Error', text2: fetchError.message });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllUsers();
    }, [fetchAllUsers]);

    // Update filtered users based on search query
    useEffect(() => {
        if (searchQuery) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            const results = users.filter(user =>
                user.name && user.name.toLowerCase().includes(lowerCaseQuery)
            );
            setFilteredUsers(results);
        } else {
            setFilteredUsers(users);
        }
    }, [searchQuery, users]);

    // Update auto order preferences for a customer
    const updateAutoOrderPreferences = async (customerId, autoAmOrder, autoPmOrder) => {
        setLoading(true);
        setError(null); // Clear previous errors
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const url = `http://${ipAddress}:8090/update-auto-order-preferences`;
            const payload = {
                customer_id: customerId,
                auto_am_order: autoAmOrder,
                auto_pm_order: autoPmOrder
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update preferences: ${response.status}, ${errorText}`);
            }

            const result = await response.json();
            if (result.success) {
                setUsers(prevUsers => prevUsers.map(user =>
                    user.customer_id === customerId
                        ? { ...user, auto_am_order: autoAmOrder, auto_pm_order: autoPmOrder }
                        : user
                ));
                Toast.show({ type: 'success', text1: 'Preferences Updated', text2: `Auto orders updated for customer ${customerId}.` });
            } else {
                throw new Error(result.message || "Failed to update preferences.");
            }
        } catch (updateError) {
            setError(updateError.message || "Failed to update auto order preferences.");
            Toast.show({ type: 'error', text1: 'Update Error', text2: updateError.message });
            if (updateError.message.includes("Customer not found")) {
                // Remove the customer from the list if not found
                setUsers(prevUsers => prevUsers.filter(user => user.customer_id !== customerId));
            }
        } finally {
            setLoading(false);
        }
    };

    // Toggle AM order preference
    const toggleAmOrder = (customerId, currentValue) => {
        const newValue = currentValue === 'Yes' ? 'No' : 'Yes';
        const user = users.find(u => u.customer_id === customerId);
        if (user) {
            updateAutoOrderPreferences(customerId, newValue, user.auto_pm_order);
        }
    };

    // Toggle PM order preference
    const togglePmOrder = (customerId, currentValue) => {
        const newValue = currentValue === 'Yes' ? 'No' : 'Yes';
        const user = users.find(u => u.customer_id === customerId);
        if (user) {
            updateAutoOrderPreferences(customerId, user.auto_am_order, newValue);
        }
    };

    // Render each customer item
    const renderCustomerItem = ({ item }) => (
        <View style={styles.customerItem}>
            <Text style={styles.customerIdText}>Customer ID: {item.customer_id}</Text>
            <Text style={styles.customerNameText}>Name: {item.name}</Text>
            <View style={styles.preferenceRow}>
                <Text style={styles.preferenceLabel}>Auto AM Order:</Text>
                <TouchableOpacity
                    style={[styles.toggleButton, item.auto_am_order === 'Yes' ? styles.toggleOn : styles.toggleOff]}
                    onPress={() => toggleAmOrder(item.customer_id, item.auto_am_order)}
                    disabled={loading}
                >
                    <Text style={styles.toggleText}>{item.auto_am_order || 'No'}</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.preferenceRow}>
                <Text style={styles.preferenceLabel}>Auto PM Order:</Text>
                <TouchableOpacity
                    style={[styles.toggleButton, item.auto_pm_order === 'Yes' ? styles.toggleOn : styles.toggleOff]}
                    onPress={() => togglePmOrder(item.customer_id, item.auto_pm_order)}
                    disabled={loading}
                >
                    <Text style={styles.toggleText}>{item.auto_pm_order || 'No'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Update Auto Order Preferences</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by Name"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {loading && <ActivityIndicator size="large" color="#FFD700" style={styles.loading} />}
            {error && <Text style={styles.errorText}>{error}</Text>}

            <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.customer_id.toString()}
                renderItem={renderCustomerItem}
                ListEmptyComponent={<Text style={styles.emptyText}>No customers found.</Text>}
                contentContainerStyle={styles.listContainer}
            />

            <Toast />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: {
        backgroundColor: '#FFD700',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    headerText: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#333',
        marginBottom: 10,
    },
    searchInput: {
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        fontSize: 16,
    },
    loading: { marginTop: 20 },
    errorText: { color: 'red', textAlign: 'center', padding: 10 },
    listContainer: { padding: 10 },
    customerItem: {
        backgroundColor: '#fff',
        padding: 15,
        marginVertical: 8,
        borderRadius: 8,
        elevation: 3, // Added elevation for a subtle shadow
        shadowColor: '#000', // iOS shadow properties
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    customerIdText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    customerNameText: { fontSize: 14, color: '#555', marginBottom: 8 },
    preferenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 5 },
    preferenceLabel: { fontSize: 14, color: '#666' },
    toggleButton: { padding: 8, borderRadius: 5, minWidth: 60, alignItems: 'center' },
    toggleOn: { backgroundColor: '#28a745' }, // Green for "Yes"
    toggleOff: { backgroundColor: '#d9534f' }, // Red for "No"
    toggleText: { color: '#fff', fontWeight: 'bold' },
    emptyText: { textAlign: 'center', color: '#666', padding: 20 },
});

export default AutoOrderUpdate;