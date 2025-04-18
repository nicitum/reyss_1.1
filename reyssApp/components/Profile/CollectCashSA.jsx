import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ipAddress } from '../../urls';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CollectCashSA = () => {
    const [users, setUsers] = useState([]);
    const [amountDueMap, setAmountDueMap] = useState({});
    const [cashInputMap, setCashInputMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [loadingAmounts, setLoadingAmounts] = useState({});
    const [updatingCash, setUpdatingCash] = useState({});
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalCustomerId, setModalCustomerId] = useState(null);
    const [modalCash, setModalCash] = useState(null);

    const fetchAllUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            if (!token) {
                throw new Error("Authentication token not found. Please log in.");
            }

            const url = `http://${ipAddress}:8090/allUsers/`;
            const response = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch users: ${response.status} - ${errorText}`);
            }

            const responseJson = await response.json();
            if (responseJson && responseJson.data && Array.isArray(responseJson.data)) {
                setUsers(responseJson.data);
                const initialLoadingAmounts = {};
                responseJson.data.forEach(user => {
                    initialLoadingAmounts[user.customer_id] = false;
                });
                setLoadingAmounts(initialLoadingAmounts);
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

    const fetchAmountDue = useCallback(async (customerId) => {
        setLoadingAmounts(prev => ({ ...prev, [customerId]: true }));
        try {
            const response = await fetch(`http://${ipAddress}:8090/collect_cash?customerId=${customerId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch amount due for customer ${customerId}.`);
            }

            const data = await response.json();
            setAmountDueMap(prev => ({ ...prev, [customerId]: data.amountDue }));
        } catch (error) {
            setAmountDueMap(prev => ({ ...prev, [customerId]: 'Error' }));
            Toast.show({ type: 'error', text1: 'Error', text2: error.message });
        } finally {
            setLoadingAmounts(prev => ({ ...prev, [customerId]: false }));
        }
    }, []);

    const handleCollectCash = (customerId, cash) => {
        if (isNaN(cash) || cash < 0) {
            Toast.show({ type: 'error', text1: 'Invalid Input', text2: 'Please enter a valid cash amount.' });
            return;
        }

        const currentAmountDue = amountDueMap[customerId];
        if (currentAmountDue !== 'Error' && parseFloat(cash) > parseFloat(currentAmountDue)) {
            Toast.show({
                type: 'info',
                text1: 'Info',
                text2: `Cannot collect more than Amount Due: ${parseFloat(currentAmountDue).toFixed(2)}`,
            });
            return;
        }

        setModalCustomerId(customerId);
        setModalCash(cash);
        setIsModalVisible(true);
    };

    const confirmCollectCash = async () => {
        const customerId = modalCustomerId;
        const cash = modalCash;
        setUpdatingCash(prev => ({ ...prev, [customerId]: true }));
        setIsModalVisible(false);

        try {
            const response = await fetch(`http://${ipAddress}:8090/collect_cash?customerId=${customerId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cash: parseFloat(cash) }),
            });

            if (!response.ok) {
                throw new Error(`Failed to collect cash for customer ${customerId}.`);
            }

            const data = await response.json();
            setAmountDueMap(prev => ({ ...prev, [customerId]: data.updatedAmountDue }));
            setCashInputMap(prev => ({ ...prev, [customerId]: '' }));
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: data.message || "Cash collected successfully!",
            });
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message });
        } finally {
            setUpdatingCash(prev => ({ ...prev, [customerId]: false }));
        }
    };

    const handleCashInputChange = (customerId, text) => {
        const sanitizedText = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
        if (!isNaN(Number(sanitizedText)) && Number(sanitizedText) >= 0) {
            setCashInputMap(prev => ({ ...prev, [customerId]: sanitizedText }));
        } else if (text === '') {
            setCashInputMap(prev => ({ ...prev, [customerId]: '' }));
        }
    };

    const handleSearchChange = (text) => {
        setSearchQuery(text);
        if (text) {
            const filtered = users.filter(user =>
                user.name.toLowerCase().includes(text.toLowerCase())
            );
            setFilteredUsers(filtered);
        } else {
            setFilteredUsers(users);
        }
    };

    useEffect(() => {
        fetchAllUsers();
    }, [fetchAllUsers]);

    useEffect(() => {
        if (users.length > 0) {
            users.forEach(user => {
                fetchAmountDue(user.customer_id);
            });
        }
    }, [users, fetchAmountDue]);

    const usersToDisplay = searchQuery ? filteredUsers : users;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.loadingText}>Loading Customers...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="error-outline" size={40} color="#dc3545" />
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
                <Text style={styles.header}>Cash Collection</Text>

                <View style={styles.searchContainer}>
                    <Icon name="search" size={24} color="#6c757d" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by customer name..."
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                    />
                </View>

                {usersToDisplay.length === 0 ? (
                    <View style={styles.noDataContainer}>
                        <Icon name="inbox" size={40} color="#6c757d" />
                        <Text style={styles.noDataText}>No customers found.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={usersToDisplay}
                        keyExtractor={(item) => item.customer_id}
                        renderItem={({ item }) => (
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.customerName}>{item.name}</Text>
                                    <Text style={styles.customerId}>ID: {item.customer_id}</Text>
                                </View>
                                <View style={styles.cardBody}>
                                    <Text style={styles.amountDue}>
                                        Amount Due: {loadingAmounts[item.customer_id] ? (
                                            <ActivityIndicator size="small" color="#007bff" />
                                        ) : amountDueMap[item.customer_id] !== 'Error' ? (
                                            `${parseFloat(amountDueMap[item.customer_id]).toFixed(2)}`
                                        ) : (
                                            'Error'
                                        )}
                                    </Text>
                                    <View style={styles.inputContainer}>
                                        <TextInput
                                            style={styles.cashInput}
                                            placeholder="0.00"
                                            keyboardType="numeric"
                                            value={cashInputMap[item.customer_id] || ''}
                                            onChangeText={(text) => handleCashInputChange(item.customer_id, text)}
                                        />
                                        <TouchableOpacity
                                            style={[styles.collectButton, updatingCash[item.customer_id] && styles.disabledButton]}
                                            onPress={() => handleCollectCash(item.customer_id, cashInputMap[item.customer_id])}
                                            disabled={updatingCash[item.customer_id]}
                                        >
                                            {updatingCash[item.customer_id] ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={styles.collectButtonText}>Collect</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    />
                )}

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={isModalVisible}
                    onRequestClose={() => setIsModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Confirm Collection</Text>
                            <Text style={styles.modalText}>
                                Collect {modalCash ? `${parseFloat(modalCash).toFixed(2)}` : ''} from customer {modalCustomerId}?
                            </Text>
                            <View style={styles.modalButtonContainer}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setIsModalVisible(false)}
                                >
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.confirmButton]}
                                    onPress={confirmCollectCash}
                                >
                                    <Text style={styles.modalButtonText}>Confirm</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
            <Toast />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        backgroundColor: '#f0f4f8',
    },
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1a3c34',
        textAlign: 'center',
        marginBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#333',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: '#dc3545',
        textAlign: 'center',
        marginTop: 10,
    },
    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noDataText: {
        fontSize: 18,
        color: '#6c757d',
        textAlign: 'center',
        marginTop: 10,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 15,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    customerName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a3c34',
    },
    customerId: {
        fontSize: 14,
        color: '#6c757d',
    },
    cardBody: {
        paddingTop: 10,
    },
    amountDue: {
        fontSize: 16,
        color: '#495057',
        marginBottom: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cashInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ced4da',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        backgroundColor: '#f8f9fa',
    },
    collectButton: {
        backgroundColor: '#28a745',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        backgroundColor: '#6c757d',
    },
    collectButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a3c34',
        marginBottom: 15,
    },
    modalText: {
        fontSize: 16,
        color: '#495057',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#dc3545',
    },
    confirmButton: {
        backgroundColor: '#28a745',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CollectCashSA;