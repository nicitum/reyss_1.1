import React, { useState, useEffect, useCallback} from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Alert,
    ActivityIndicator,
    Platform,
    TouchableOpacity,
    ToastAndroid, // Keep ToastAndroid for Android
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


const LOADING_SLIP_DIR_URI_KEY = 'loadingSlipDirectoryUri';

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
    const [savedDirectoryUri, setSavedDirectoryUri] = useState(null);

    useEffect(() => {
        const loadSavedState = async () => {
            try {
                const storedUri = await AsyncStorage.getItem(LOADING_SLIP_DIR_URI_KEY);
                if (storedUri) {
                    setSavedDirectoryUri(storedUri);
                    console.log("Loaded savedDirectoryUri from AsyncStorage:", storedUri);
                }
            } catch (e) {
                console.error("Error loading state from AsyncStorage:", e);
            }
        };
        loadSavedState();
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
            const nonCancelledOrders = todaysOrders.filter(order => order.cancelled !== 'Yes' && order.approve_status === 'Accepted');
            setAdminOrders(nonCancelledOrders);
        } catch (err) {
            setError(err.message || "Failed to fetch admin orders.");
            Alert.alert("Error", "Failed to fetch admin orders. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);


  

    const save = async (uri, filename, mimetype, reportType) => {
        if (Platform.OS === "android") {
            try {
                let directoryUriToUse = await AsyncStorage.getItem(LOADING_SLIP_DIR_URI_KEY);

                if (!directoryUriToUse) {
                    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        directoryUriToUse = permissions.directoryUri;
                        await AsyncStorage.setItem(LOADING_SLIP_DIR_URI_KEY, directoryUriToUse);
                    } else {
                        shareAsync(uri, reportType);
                        return;
                    }
                }

                const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
                    directoryUriToUse,
                    filename,
                    mimetype
                );
                await FileSystem.writeAsStringAsync(newUri, base64, { encoding: FileSystem.EncodingType.Base64 });

                if (Platform.OS === 'android') {
                    ToastAndroid.show(`${reportType} Saved Successfully!`, ToastAndroid.SHORT);
                } else {
                    Alert.alert('Success', `${reportType} Saved Successfully!`);
                }
            } catch (error) {
                console.error("Error saving file:", error);
                if (error.message.includes('permission')) {
                    await AsyncStorage.removeItem(LOADING_SLIP_DIR_URI_KEY);
                }
                if (Platform.OS === 'android') {
                    ToastAndroid.show(`Failed to save ${reportType}. Please try again.`, ToastAndroid.SHORT);
                } else {
                    Alert.alert('Error', `Failed to save ${reportType}. Please try again.`);
                }
            }
        } else {
            shareAsync(uri, reportType);
        }
    };


    const generateExcelReport = async (productsData, reportType, routeName = '') => {
        if (!productsData || productsData.length === 0) {
            Alert.alert("No Products", "No products to include in the loading slip.");
            return;
        }
    
        setLoading(true);
        try {
            const wb = XLSX.utils.book_new();
    
            // Calculate totals
            let totalQuantity = 0; // Total for 'Quantity in base units (eaches)' if needed
            let totalBaseUnitQuantity = 0;
            let totalCrates = 0;
    
            productsData.forEach(product => {
                totalQuantity += product.quantity; // Summing 'eaches' quantity - optional
                totalBaseUnitQuantity += parseFloat(product.baseUnitQuantity);
                totalCrates += product.crates;
            });
    
            const wsData = [
                [`${reportType} - Route ${routeName}`],
                [],
                ["Products", "Quantity in base units (eaches)", "Quantity in base units (kgs/lts)", "Crates"],
                ...productsData.map(product => [
                    product.name,
                    product.quantity,
                    product.baseUnitQuantity,
                    product.crates
                ]),
                ["Totals",  totalQuantity.toFixed(2), totalBaseUnitQuantity.toFixed(2), totalCrates] // Totals row
            ];
    
    
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, `${reportType} Data`);
    
            const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
            const base64Workbook = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    
            const filename = `${reportType.replace(/\s/g, '')}-Route-${routeName}.xlsx`;
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
                if (Platform.OS === 'web') {
                    Alert.alert('Success', `${reportType} Generated Successfully! File downloaded in your browser.`);
                }
            } else {
                const fileDir = FileSystem.documentDirectory;
                const fileUri = fileDir + filename;
    
                await FileSystem.writeAsStringAsync(fileUri, base64Workbook, {
                    encoding: FileSystem.EncodingType.Base64
                });
    
    
                if (Platform.OS === 'android') {
                    save(fileUri, filename, mimetype, reportType);
                } else {
                    try {
                        await Sharing.shareAsync(fileUri, {
                            mimeType: mimetype,
                            dialogTitle: `${reportType} Report`,
                            UTI: 'com.microsoft.excel.xlsx'
                        });
                        if (Platform.OS !== 'android') {
                            Alert.alert('Success', `${reportType} Generated and Shared Successfully!`);
                        }
                    } catch (shareError) {
                        console.error("Sharing Error:", shareError);
                        if (Platform.OS === 'android') {
                            ToastAndroid.show(`Sharing ${reportType} Failed.`, ToastAndroid.SHORT);
                        } else {
                            Alert.alert("Sharing Failed", `Error occurred while trying to share the ${reportType.toLowerCase()}.`);
                        }
                        setError("Error sharing file.");
                    }
                }
            }
    
    
        } catch (e) {
            console.error("Excel Generation Error:", e);
            if (Platform.OS === 'android') {
                ToastAndroid.show(`Failed to generate ${reportType}.`, ToastAndroid.SHORT);
            } else {
                Alert.alert("Generation Failed", `Error generating Excel ${reportType.toLowerCase()}.`);
            }
            setError("Error generating Excel file.");
        } finally {
            setLoading(false);
        }
    };

    const generateDeliveryExcelReport = async (usersForRoute, routeName) => { // Added usersForRoute and routeName
        const reportType = 'Delivery Slip';
        setLoading(true);
        try {
            const wb = XLSX.utils.book_new();
            const deliverySlipData = await createDeliverySlipDataForExcelForRoute(usersForRoute); //Pass usersForRoute
            const ws = XLSX.utils.aoa_to_sheet([
                [`${reportType}`]
                [`Route: ${routeName}`], // Slip Title now includes Route
                //[`Route: ${routeName}`], // No separate Route line needed as Route is in title
                [],
                deliverySlipData[2], // Headers (Items, Customer Names)
                ...deliverySlipData.slice(3) // Product rows
            ]);
            XLSX.utils.book_append_sheet(wb, ws, `${reportType}`);

            const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
            const base64Workbook = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

            const filename = `${reportType.replace(/\s/g, '')}-Route-${routeName}.xlsx`; // Filename now includes Route
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
                if (Platform.OS === 'web') {
                    Alert.alert('Success', `${reportType} Generated Successfully! File downloaded in your browser.`);
                }
            } else {
                const fileDir = FileSystem.documentDirectory;
                const fileUri = fileDir + filename;

                await FileSystem.writeAsStringAsync(fileUri, base64Workbook, {
                    encoding: FileSystem.EncodingType.Base64
                });

                console.log(`${reportType} File written to documentDirectory:`, fileUri);

                if (Platform.OS === 'android') {
                    save(fileUri, filename, mimetype, reportType);
                } else {
                    try {
                        await Sharing.shareAsync(fileUri, {
                            mimeType: mimetype,
                            dialogTitle: `${reportType} Report`,
                            UTI: 'com.microsoft.excel.xlsx'
                        });
                        if (Platform.OS !== 'android') {
                            Alert.alert('Success', `${reportType} Generated and Shared Successfully!`);
                        }
                    } catch (shareError) {
                        console.error(`${reportType} Sharing Error:`, shareError);
                        if (Platform.OS === 'android') {
                            ToastAndroid.show(`Sharing ${reportType} Failed.`, ToastAndroid.SHORT);
                        } else {
                            Alert.alert("Sharing Failed", `Error occurred while trying to share the ${reportType.toLowerCase()}.`);
                        }
                        setError("Error sharing delivery slip file.");
                    }
                }
            }

        } catch (e) {
            console.error(`${reportType} Excel Generation Error:`, e);
            if (Platform.OS === 'android') {
                ToastAndroid.show(`Failed to generate ${reportType}.`, ToastAndroid.SHORT);
            } else {
                Alert.alert("Generation Failed", `Error generating Excel ${reportType.toLowerCase()}.`);
            }
            setError("Error generating delivery slip Excel file.");
        } finally {
            setLoading(false);
        }
    };

    const createDeliverySlipDataForExcelForRoute = async (usersForRoute) => { // Modified to accept usersForRoute
        const orderMap = new Map();
        const allProducts = new Set();
        const customerNames = [];

        usersForRoute.forEach(user => { // Use usersForRoute
            const order = adminOrders.find(ord => ord.customer_id === user.cust_id && ord.order_type === orderTypeFilter);
            if (order) {
                customerNames.push(user.name);
                orderMap.set(user.cust_id, { name: user.name, orderId: order.id, products: [], route: user.route }); // Include route here
            }
        });

        for (const customerId of orderMap.keys()) {
            const orderData = orderMap.get(customerId);
            try {
                const token = await AsyncStorage.getItem("userAuthToken");
                const url = `http://${ipAddress}:8090/order-products?orderId=${orderData.orderId}`;
                const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
                const productsResponse = await fetch(url, { headers });
                if (!productsResponse.ok) {
                    console.error(`Failed to fetch products for order ID ${orderData.orderId}. Status: ${productsResponse.status}`);
                    continue;
                }
                const productsData = await productsResponse.json();
                orderData.products = productsData;
                productsData.forEach(product => allProducts.add(product.name));
            } catch (fetchError) {
                console.error("Error fetching order products:", fetchError);
            }
        }

        const productList = Array.from(allProducts);
        const excelData = [["Delivery Slip"], [], ["Items", ...customerNames]];

        productList.forEach(productName => {
            const productRow = [productName];
            customerNames.forEach(customerName => {
                let quantity = 0;
                const customerOrder = orderMap.get(usersForRoute.find(u => u.name === customerName)?.cust_id); // Use usersForRoute
                if (customerOrder && customerOrder.products) {
                    const productInOrder = customerOrder.products.find(p => p.name === productName);
                    quantity = productInOrder ? productInOrder.quantity : 0;
                }
                productRow.push(quantity);
            });
            excelData.push(productRow);
        });
        return excelData;
    };

    const createLoadingSlipDataForExcelForRoute = async (usersForRoute) => {
        const consolidatedProducts = new Map();
    
        for (const user of usersForRoute) {
            const order = adminOrders.find(ord => ord.customer_id === user.cust_id && ord.order_type === orderTypeFilter);
            if (order) {
                try {
                    const token = await AsyncStorage.getItem("userAuthToken");
                    const url = `http://${ipAddress}:8090/order-products?orderId=${order.id}`;
                    const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
                    const productsResponse = await fetch(url, { headers });
                    if (!productsResponse.ok) {
                        console.error(`Failed to fetch products for order ID ${order.id}. Status: ${productsResponse.status}`);
                        continue;
                    }
                    const productsData = await productsResponse.json();
                    productsData.forEach(product => {
                        console.log("--- Processing Product: ---");
                        console.log("Product Name:", product.name);
    
                        let quantityValue = 0;
                        let unit = '';
                        const nameParts = product.name.split(" ");
                        console.log("nameParts:", nameParts);
                        const lastPart = nameParts[nameParts.length - 1];
                        const secondLastPart = nameParts[nameParts.length - 2];
                        console.log("lastPart:", lastPart);
                        console.log("secondLastPart:", secondLastPart);
    
                        const lowerLastPart = lastPart.toLowerCase();
                        const lowerSecondLastPart = secondLastPart ? secondLastPart.toLowerCase() : '';
                        console.log("lowerLastPart:", lowerLastPart);
                        console.log("lowerSecondLastPart:", lowerSecondLastPart);
    
                        if (lowerLastPart.includes('kg') || lowerLastPart.includes('kgs')) {
                            quantityValue = parseFloat(nameParts[nameParts.length - 2] === '1' ? '1' : nameParts[nameParts.length - 2]);
                            unit = 'kg';
                        } else if (lowerLastPart.includes('ltr') || lowerLastPart.includes('liter')) {
                            quantityValue = parseFloat(nameParts[nameParts.length - 2] === '1' ? '1' : nameParts[nameParts.length - 2]);
                            unit = 'ltr';
                        } else if (lowerLastPart.includes('gm') || lowerLastPart.includes('gms') || lowerLastPart.includes('g')) {
                            quantityValue = parseFloat(nameParts[nameParts.length - 2]);
                            unit = 'gm';
                        }  else if (lowerLastPart.includes('ml')) {
                            quantityValue = parseFloat(nameParts[nameParts.length - 2]);
                            unit = 'ml';
                        } else if (lowerLastPart === 'gms' && lowerSecondLastPart === '1000') {
                            quantityValue = 1;
                            unit = 'kg';
                        }
                        console.log("quantityValue (parsed):", quantityValue);
                        console.log("unit (detected):", unit);
    
                        let baseUnitQuantity = 0;
                        if (unit === 'ml') {
                            baseUnitQuantity = (quantityValue * product.quantity) / 1000;
                        } else if (unit === 'gm') {
                            baseUnitQuantity = (quantityValue * product.quantity) / 1000;
                        } else if (unit === 'ltr' || unit === 'liter' || unit === 'kg' || unit === 'kgs') {
                            baseUnitQuantity = quantityValue * product.quantity;
                        } else {
                            baseUnitQuantity = product.quantity;
                        }
                        console.log("baseUnitQuantity:", baseUnitQuantity);
    
                        const crates = Math.floor(baseUnitQuantity / 12);
                        console.log("crates:", crates);
    
    
                        const currentProductInfo = consolidatedProducts.get(product.name);
                        if (currentProductInfo) {
                            consolidatedProducts.set(product.name, {
                                totalQuantity: currentProductInfo.totalQuantity + product.quantity,
                                category: currentProductInfo.category,
                                totalBaseUnitQuantity: currentProductInfo.totalBaseUnitQuantity + baseUnitQuantity,
                                totalCrates: currentProductInfo.totalCrates + crates,
                            });
                        } else {
                            consolidatedProducts.set(product.name, {
                                totalQuantity: product.quantity,
                                category: product.category || 'Unknown',
                                totalBaseUnitQuantity: baseUnitQuantity,
                                totalCrates: crates,
                            });
                        }
                    });
                } catch (fetchError) {
                    console.error("Error fetching order products:", fetchError);
                }
            }
        }
        const productListForExcel = [];
        for (const [productName, productInfo] of consolidatedProducts.entries()) {
            productListForExcel.push({
                name: productName,
                quantity: productInfo.totalQuantity,
                category: productInfo.category,
                baseUnitQuantity: productInfo.totalBaseUnitQuantity.toFixed(2),
                crates: productInfo.totalCrates
            });
        }
        return productListForExcel;
    };


    // New function to group users by route
    const groupUsersByRoute = (usersWithOrders) => {
        const routesMap = new Map();
        usersWithOrders.forEach(user => {
            const route = user.route || 'Unrouted'; // Handle users without route?
            if (!routesMap.has(route)) {
                routesMap.set(route, []);
            }
            routesMap.get(route).push(user);
        });
        return routesMap; // Returns Map: { route1: [users], route2: [users], ... }
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
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                        style={{
                            marginRight: 10,
                            padding: 10,
                            borderRadius: 8,
                            backgroundColor: '#FFD700' // Yellow for Loading Slip
                        }}
                        onPress={async () => {
                            if (adminUsersWithOrdersToday.length > 0 ) {
                                const routesMap = groupUsersByRoute(adminUsersWithOrdersToday); // Group users by route
                                for (const [routeName, usersForRoute] of routesMap.entries()) { // Iterate through routes
                                    const loadingSlipDataForRoute = await createLoadingSlipDataForExcelForRoute(usersForRoute, routeName); // Get data for each route
                                    generateExcelReport(loadingSlipDataForRoute, 'Loading Slip', routeName); // Generate report for each route
                                }
                                Alert.alert("Slips Generated", "Loading Slips generated for each route.");
                            } else {
                                Alert.alert("No Orders", "No orders available to generate loading slips for the current filter.");
                            }
                        }}
                    >
                        <Text style={{ fontWeight: 'bold', color: '#fff' }}>Generate Loading Slip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            marginRight: 15,
                            padding: 10,
                            borderRadius: 8,
                            backgroundColor: '#2196F3' // Blue for Delivery Slip
                        }}
                        onPress={async () => {
                            if (adminUsersWithOrdersToday.length > 0 ) {
                                const routesMap = groupUsersByRoute(adminUsersWithOrdersToday); // Group users by route
                                for (const [routeName, usersForRoute] of routesMap.entries()) { // Iterate through routes
                                    generateDeliveryExcelReport(usersForRoute, routeName); // Generate Delivery Slip for each route - pass usersForRoute and routeName
                                }
                                Alert.alert("Slips Generated", "Delivery Slips generated for each route.");

                            } else {
                                Alert.alert("No Orders", "No orders available to generate delivery slips for the current filter.");
                            }
                        }}
                    >
                        <Text style={{ fontWeight: 'bold', color: '#fff' }}>Generate Delivery Slip</Text>
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [navigation, adminOrders, adminUsersWithOrdersToday, orderTypeFilter]);


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
                <Text style={styles.loadingText}>Generating Slip...</Text>
            </View>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    headerText: { fontSize: 22, fontWeight: "bold", textAlign: "center", color: "#333" },
    filterContainer: { flexDirection: "row", alignItems: "center", padding: 20 },
    filterLabel: { fontSize: 15, fontWeight: "bold", marginRight: 20 },
    pickerWrapper: { flex: 0.4, borderWidth: 1, borderColor: "#777", borderRadius: 10 },
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