import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Alert,
    ActivityIndicator,
    Platform,
    TouchableOpacity,
    ToastAndroid,
    PermissionsAndroid,
    Linking
} from "react-native";
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { ipAddress } from "../../urls";
import { useNavigation } from "@react-navigation/native";
import { checkTokenAndRedirect } from "../../services/auth";
import moment from 'moment';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const LOADING_SLIP_DIR_URI_KEY = 'loadingSlipDirectoryUri'; // Key for AsyncStorage

const LoadingSlipPage = () => {
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [adminOrders, setAdminOrders] = useState([]);
    const [adminUsersWithOrdersToday, setAdminUsersWithOrdersToday] = useState([]);
    const [adminId, setAdminId] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [orderTypeFilter, setOrderTypeFilter] = useState('AM');
    const navigation = useNavigation();
    const [products, setProducts] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [isOrderUpdated, setIsOrderUpdated] = useState(false);
    const [savedDirectoryUri, setSavedDirectoryUri] = useState(null); // State to store directory URI

    useEffect(() => { // Load savedDirectoryUri from AsyncStorage on component mount
        const loadSavedDirectoryUri = async () => {
            try {
                const storedUri = await AsyncStorage.getItem(LOADING_SLIP_DIR_URI_KEY);
                if (storedUri) {
                    setSavedDirectoryUri(storedUri);
                    console.log("Loaded savedDirectoryUri from AsyncStorage:", storedUri);
                }
            } catch (e) {
                console.error("Error loading savedDirectoryUri from AsyncStorage:", e);
            }
        };
        loadSavedDirectoryUri();
    }, []);


    const fetchAssignedUsers = useCallback(async (currentAdminId, userAuthToken) => {
        try {
            const response = await fetch(`http://${ipAddress}:8090/assigned-users/${currentAdminId}`, {
                headers: {
                    "Authorization": `Bearer ${userAuthToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) throw new Error(`Failed to fetch assigned users. Status: ${response.status}`);

            const responseData = await response.json();
            if (responseData.success) {
                setAssignedUsers(responseData.assignedUsers);
                setError(null);
            } else {
                setError("Failed to fetch assigned users.");
            }
        } catch (err) {
            setError("Error fetching assigned users. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAdminOrders = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            if (!token) throw new Error("User authentication token not found.");

            const decodedToken = jwtDecode(token);
            const adminId = decodedToken.id1;
            setAdminId(adminId);

            const response = await fetch(`http://${ipAddress}:8090/get-admin-orders/${adminId}`, {
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
            });

            if (!response.ok) throw new Error(`Failed to fetch orders. Status: ${response.status}`);

            const ordersData = await response.json();
            const todayFormatted = moment().format("YYYY-MM-DD");

            const todaysOrders = ordersData.orders.filter(order => {
                if (!order.placed_on) return false;
                const orderDate = moment.unix(parseInt(order.placed_on, 10)).format("YYYY-MM-DD");
                return orderDate === todayFormatted;
            });

            setAdminOrders(todaysOrders);
        } catch (err) {
            setError(err.message || "Failed to fetch admin orders.");
            Alert.alert("Error", "Failed to fetch admin orders. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);


    const fetchOrderProducts = async (orderIdToFetch, routeName) => {
        setLoading(true);
        setError(null);
        setIsOrderUpdated(false);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const url = `http://${ipAddress}:8090/order-products?orderId=${orderIdToFetch}`;
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            console.log("FETCH ORDER PRODUCTS - Request URL:", url);
            console.log("FETCH ORDER PRODUCTS - Request Headers:", headers);

            const productsResponse = await fetch(url, { headers });

            console.log("FETCH ORDER PRODUCTS - Response Status:", productsResponse.status);
            console.log("FETCH ORDER PRODUCTS - Response Status Text:", productsResponse.statusText);

            if (!productsResponse.ok) {
                const errorText = await productsResponse.text();
                const message = `Failed to fetch order products. Status: ${productsResponse.status}, Text: ${errorText}`;
                console.error("FETCH ORDER PRODUCTS - Error Response Text:", errorText);
                if (productsResponse.status !== 404) {
                    throw new Error(message);
                } else {
                    console.log("FETCH ORDER PRODUCTS - No products found for this order, initializing empty product list.");
                    setProducts([]);
                    setSelectedOrderId(orderIdToFetch);
                    return;
                }
            }

            const productsData = await productsResponse.json();
            console.log("FETCH ORDER PRODUCTS - Response Data:", productsData);
            setProducts(productsData);
            setSelectedOrderId(orderIdToFetch);

            generateExcelReport(productsData, routeName);
            if (Platform.OS === 'android') {
                ToastAndroid.show('Loading Slip Generated Successfully!', ToastAndroid.SHORT);
            } else {
                Alert.alert('Success', 'Loading Slip Generated Successfully!');
            }


        } catch (error) {
            console.error("FETCH ORDER PRODUCTS - Fetch Error:", error);
            setError(error.message || "Failed to fetch order products.");
            if (Platform.OS === 'android') {
                ToastAndroid.show('Failed to generate Loading Slip.', ToastAndroid.SHORT);
            } else {
                Alert.alert('Error', 'Failed to generate Loading Slip.');
            }
            setProducts([]);
            setSelectedOrderId(null);
        } finally {
            setLoading(false);
        }
    };

    const save = async (uri, filename, mimetype) => {
        if (Platform.OS === "android") {
            try {
                // First check if we already have a saved directory URI
                let directoryUriToUse = await AsyncStorage.getItem(LOADING_SLIP_DIR_URI_KEY);
    
                // Only request permissions if we don't have a saved URI
                if (!directoryUriToUse) {
                    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        directoryUriToUse = permissions.directoryUri;
                        // Save the URI for future use
                        await AsyncStorage.setItem(LOADING_SLIP_DIR_URI_KEY, directoryUriToUse);
                    } else {
                        // If user denies permission, fall back to sharing
                        shareAsync(uri);
                        return;
                    }
                }
    
                // Use the directory URI to save the file
                const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
                    directoryUriToUse,
                    filename,
                    mimetype
                );
                await FileSystem.writeAsStringAsync(newUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                
                ToastAndroid.show('Loading Slip Saved Successfully!', ToastAndroid.SHORT);
            } catch (error) {
                console.error("Error saving file:", error);
                // Clear saved URI only if we get a permission error
                if (error.message.includes('permission')) {
                    await AsyncStorage.removeItem(LOADING_SLIP_DIR_URI_KEY);
                }
                ToastAndroid.show('Failed to save Loading Slip. Please try again.', ToastAndroid.SHORT);
            }
        } else {
            shareAsync(uri);
        }
    };
    


    const generateExcelReport = async (productsData, routeName) => {
        if (!productsData || productsData.length === 0) {
            Alert.alert("No Products", "No products to include in the loading slip.");
            return;
        }

        setLoading(true);
        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([
                ["Loading Slip"],
                [`Route: ${routeName}`],
                [],
                ["Products", "Category", "Quantity", "Crates"],
                ...productsData.map(product => [
                    product.name,
                    product.category,
                    product.quantity,
                    "",
                ]),
            ]);
            XLSX.utils.book_append_sheet(wb, ws, "Loading Slip Data");

            const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
            const base64Workbook = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

            const filename = 'LoadingSlip.xlsx';
            const mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';


            if (Platform.OS === 'web') {
                const blob = new Blob([wbout], { type: mimetype });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                const fileDir = FileSystem.documentDirectory;
                const fileUri = fileDir + filename;

                await FileSystem.writeAsStringAsync(fileUri, base64Workbook, {
                    encoding: FileSystem.EncodingType.Base64
                });

                console.log("File written to documentDirectory:", fileUri);

                if (Platform.OS === 'android') {
                    save(fileUri, filename, mimetype);
                } else {
                    try {
                        await Sharing.shareAsync(fileUri, {
                            mimeType: mimetype,
                            dialogTitle: 'Loading Slip Report',
                            UTI: 'com.microsoft.excel.xlsx'
                        });
                    } catch (shareError) {
                        console.error("Sharing Error:", shareError);
                        Alert.alert("Sharing Failed", "Error occurred while trying to share the loading slip.");
                        setError("Error sharing file.");
                    }
                }
            }


        } catch (e) {
            console.error("Excel Generation Error:", e);
            Alert.alert("Generation Failed", "Error generating Excel loading slip.");
            setError("Error generating Excel file.");
        } finally {
            setLoading(false);
        }
    };


    const requestStoragePermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    {
                        title: "Storage Permission",
                        message: "App needs storage permission to download files.",
                        buttonNeutral: "Ask Me Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "OK"
                    }
                );
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    console.log("Storage permission granted");
                    return true;
                } else {
                    console.log("Storage permission denied");
                    return false;
                }
            } catch (err) {
                console.warn("Storage permission error", err);
                return false;
            }
        } else {
            return true;
        }
    };


    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const userAuthToken = await checkTokenAndRedirect(navigation);
                if (!userAuthToken) {
                    setError("User authentication token not found.");
                    setLoading(false);
                    return;
                }

                const decodedToken = jwtDecode(userAuthToken);
                const currentAdminId = decodedToken.id1;
                setAdminId(currentAdminId);

                await Promise.all([
                    fetchAssignedUsers(currentAdminId, userAuthToken),
                    fetchAdminOrders()
                ]);
            } catch (err) {
                setError("Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigation, fetchAssignedUsers, fetchAdminOrders]);

    useEffect(() => {
        if (assignedUsers.length && adminOrders.length) {
            const usersWithOrders = assignedUsers.filter(user =>
                adminOrders.some(order =>
                    order.customer_id === user.cust_id && order.order_type === orderTypeFilter
                )
            );
            setAdminUsersWithOrdersToday(usersWithOrders);
        }
    }, [assignedUsers, adminOrders, orderTypeFilter]);


    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    style={{ marginRight: 15, backgroundColor: '#FDDA0D', padding: 10, borderRadius: 8 }}
                    onPress={() => {
                        if (adminUsersWithOrdersToday.length > 0 ) {
                            const firstUserWithOrder = adminUsersWithOrdersToday[0];
                            const orderForUser = adminOrders.find(order => order.customer_id === firstUserWithOrder.cust_id);

                            if (orderForUser) {
                                fetchOrderProducts(orderForUser.id, firstUserWithOrder.route);
                            } else {
                                Alert.alert("Error", "Could not find order details for the first user.");
                            }
                        } else {
                            Alert.alert("No Orders", "No orders available to generate loading slip for the current filter.");
                        }
                    }}
                >
                    <Text style={{ fontWeight: 'bold', color: '#333' }}>Generate Loading Slip</Text>
                </TouchableOpacity>
            ),
        });
    }, [navigation, adminOrders, adminUsersWithOrdersToday]);


    const renderItem = ({ item }) => {
        const orderForUser = adminOrders.find(order => order.customer_id === item.cust_id);

        return (
            <View style={styles.dataRow}>
                <Text style={[styles.dataCell, { flex: 1.1 }]}>{item?.name || 'N/A'}</Text>
                <Text style={[styles.dataCell, { flex: 1.6 }]}>{item?.route || 'N/A'}</Text>
                <Text style={[styles.dataCell, { flex: 1.5 }]}>{orderForUser?.id || 'N/A'}</Text>
                <Text style={[styles.dataCell, { flex: 2.1 }]}>₹ {orderForUser?.amount?.toFixed(2) || '0.00'}</Text>
                <Text style={[styles.dataCell, { flex: 1.5 }]}>{orderForUser?.approve_status || 'N/A'}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Loading Slip</Text>
            </View>

            <View style={styles.filterContainer}>
                <Text style={styles.filterLabel}>Filter Order Type:</Text>
                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={orderTypeFilter}
                        onValueChange={setOrderTypeFilter}
                        style={Platform.OS === "android" ? styles.androidPicker : styles.orderTypePicker}
                    >
                        <Picker.Item label="AM" value="AM" />
                        <Picker.Item label="PM" value="PM" />
                    </Picker>
                </View>
            </View>

            {/* Column Headers */}
            <View style={styles.columnHeader}>
                <Text style={[styles.columnHeaderText, { flex: 1.1 }]}>Name</Text>
                <Text style={[styles.columnHeaderText, { flex: 1.6 }]}>Route</Text>
                <Text style={[styles.columnHeaderText, { flex: 1.5 }]}>Order ID</Text>
                <Text style={[styles.columnHeaderText, { flex: 2.1 }]}>Amount</Text>
                <Text style={[styles.columnHeaderText, { flex: 1.5 }]}>Approval</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#FDDA0D" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={adminUsersWithOrdersToday}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item?.cust_id?.toString() || index.toString()}
                    ListEmptyComponent={() => <Text style={styles.emptyListText}>No {orderTypeFilter} orders today.</Text>}
                />
            )}
             {loading && <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FDDA0D" />
                <Text style={styles.loadingText}>Generating Loading Slip...</Text>
            </View>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    header: { backgroundColor: "#FDDA0D", padding: 15, borderBottomLeftRadius: 15, borderBottomRightRadius: 15 },
    headerText: { fontSize: 22, fontWeight: "bold", textAlign: "center", color: "#333" },
    filterContainer: { flexDirection: "row", alignItems: "center", padding: 10 },
    filterLabel: { fontSize: 15, fontWeight: "bold", marginRight: 10 },
    pickerWrapper: { flex: 0.4, borderWidth: 1, borderColor: "#777", borderRadius: 5 },
    columnHeader: { flexDirection: "row", padding: 10, backgroundColor: "#ddd" },
    columnHeaderText: { fontSize: 16, fontWeight: "bold", textAlign: "center" },
    dataRow: { flexDirection: "row", padding: 10, borderBottomWidth: 1, borderBottomColor: "#ddd" },
    dataCell: { fontSize: 15, textAlign: "center" },
    emptyListText: { textAlign: "center", marginTop: 20, fontSize: 16, color: "#777" },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#fff'
    }
});

export default LoadingSlipPage;