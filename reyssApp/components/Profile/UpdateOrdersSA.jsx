import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Button, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { jwtDecode } from 'jwt-decode';
import Icon from 'react-native-vector-icons/FontAwesome';
import SearchProductModal from '../IndentPage/nestedPage/searchProductModal';
import moment from 'moment';
import { checkTokenAndRedirect } from '../../services/auth';
import axios from 'axios';
import { ipAddress } from '../../urls';
import { memo } from 'react';

const UpdateOrdersSA = () => {
    const navigation = useNavigation();
    const [orders, setOrders] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isOrderUpdated, setIsOrderUpdated] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteLoadingIndex, setDeleteLoadingIndex] = useState(null);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [orderDeleteLoading, setOrderDeleteLoading] = useState(false);
    const [orderDeleteLoadingId, setOrderDeleteLoadingId] = useState(null);
    const [selectedOrderCustomerId, setSelectedOrderCustomerId] = useState(null);

    useEffect(() => {
        fetchAdminOrders();
    }, []);

    const fetchAdminOrders = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            if (!token) throw new Error("No authentication token found");
            
            const decodedToken = jwtDecode(token);
            const adminId = decodedToken.id1;
    
            const todayFormatted = moment().format("YYYY-MM-DD");
            const url = `http://${ipAddress}:8090/get-orders-sa?date=${todayFormatted}`;
            console.log("[DEBUG] Fetching admin orders from:", url);
    
            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json"
                }
            });
    
            if (!response.data || !response.data.status) {
                throw new Error(response.data?.message || "No valid data received from server");
            }
            
            console.log("Fetched orders data:", response.data);
            
            setOrders(response.data.orders);
            
        } catch (error) {
            const errorMessage = error.response?.data?.message || 
                               error.message || 
                               "Failed to fetch admin orders";
            setError(errorMessage);
            Toast.show({
                type: 'error',
                text1: 'Fetch Error',
                text2: errorMessage
            });
            console.error("Error fetching admin orders:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderProducts = async (orderIdToFetch) => {
        setLoading(true);
        setError(null);
        setIsOrderUpdated(false);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const url = `http://${ipAddress}:8090/order-products?orderId=${orderIdToFetch}`;
            const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
            const productsResponse = await fetch(url, { headers });

            if (!productsResponse.ok && productsResponse.status !== 404) {
                throw new Error(`Failed to fetch order products: ${productsResponse.status}`);
            }

            const productsData = productsResponse.status === 404 ? [] : await productsResponse.json();
            setProducts(productsData);
            setSelectedOrderId(orderIdToFetch);
            const selectedOrder = orders.find(order => order.id === orderIdToFetch);
            if (selectedOrder) setSelectedOrderCustomerId(selectedOrder.customer_id);
        } catch (error) {
            setError(error.message || "Failed to fetch order products.");
            Toast.show({ type: 'error', text1: 'Fetch Error', text2: error.message });
            setProducts([]);
            setSelectedOrderId(null);
            setSelectedOrderCustomerId(null);
        } finally {
            setLoading(false);
        }
    };

    const handleProductQuantityChange = (index, text) => {
        if (isOrderUpdated) return;
        const newProducts = [...products];
        newProducts[index].quantity = parseInt(text, 10) || 0;
        setProducts(newProducts);
    };

    const handleDeleteProductItem = async (indexToDelete) => {
        if (isOrderUpdated) return;
        const productToDelete = products[indexToDelete];
        setDeleteLoading(true);
        setDeleteLoadingIndex(indexToDelete);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const url = `http://${ipAddress}:8090/delete_order_product/${productToDelete.product_id}`;
            const deleteResponse = await fetch(url, { method: 'DELETE', headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } });

            if (!deleteResponse.ok) throw new Error(`Failed to delete product: ${deleteResponse.status}`);
            if (products.length === 1) {
                await handleDeleteOrder(selectedOrderId);
            } else {
                setProducts(products.filter((_, index) => index !== indexToDelete));
                Toast.show({ type: 'success', text1: 'Product Deleted', text2: "Product removed successfully." });
            }
        } catch (deleteError) {
            setError(deleteError.message || "Failed to delete product.");
            Toast.show({ type: 'error', text1: 'Deletion Error', text2: deleteError.message });
        } finally {
            setDeleteLoading(false);
            setDeleteLoadingIndex(null);
        }
    };

    const checkCreditLimit = async () => {
        try {
            const token = await checkTokenAndRedirect(navigation);
            if (!token) return null;
            const decodedToken = jwtDecode(token);
            const customerId = decodedToken.id;
            const response = await fetch(`http://${ipAddress}:8090/credit-limit?customerId=${customerId}`, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (response.ok) return parseFloat((await response.json()).creditLimit);
            if (response.status === 404) return Infinity;
            throw new Error("Failed to fetch credit limit.");
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Credit Limit Error', text2: error.message });
            return null;
        }
    };

    const handleUpdateOrder = async () => {
        if (!selectedOrderId) return Alert.alert("Error", "Please select an order to update.");
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const productsToUpdate = products.map(product => ({
                order_id: selectedOrderId,
                product_id: product.product_id,
                name: product.name,
                category: product.category,
                price: product.price,
                quantity: product.quantity,
                gst_rate: product.gst_rate
            }));
            const totalAmount = productsToUpdate.reduce((sum, p) => sum + p.quantity * p.price, 0);

            const creditLimit = await checkCreditLimit();
            if (creditLimit !== null && creditLimit !== Infinity && totalAmount > creditLimit) {
                Toast.show({ type: 'error', text1: 'Credit Limit Exceeded', text2: `Order exceeds limit by ₹${(totalAmount - creditLimit).toFixed(2)}` });
                return;
            }

            const response = await fetch(`http://${ipAddress}:8090/order_update`, {
                method: 'POST', headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: selectedOrderId, products: productsToUpdate, totalAmount })
            });

            if (!response.ok) throw new Error(`Failed to update order: ${response.status}`);
            const updateData = await response.json();

            if (response.status === 200) {
                const originalOrder = orders.find(o => o.id === selectedOrderId);
                if (originalOrder) {
                    const amountDifference = totalAmount - originalOrder.total_amount;
                    const customerId = originalOrder.customer_id;

                    if (amountDifference > 0) {
                        await axios.post(`http://${ipAddress}:8090/credit-limit/deduct`, { customerId, amountChange: amountDifference }, { headers: { 'Content-Type': 'application/json' } });
                    } else if (amountDifference < 0) {
                        await axios.post(`http://${ipAddress}:8090/increase-credit-limit`, { customerId, amountToIncrease: Math.abs(amountDifference) }, { headers: { 'Content-Type': 'application/json' } });
                    }

                    await axios.post(`http://${ipAddress}:8090/credit-limit/update-amount-due-on-order`, {
                        customerId, totalOrderAmount: totalAmount, originalOrderAmount: originalOrder.total_amount
                    }, { headers: { 'Content-Type': 'application/json' } });

                    Toast.show({ type: 'success', text1: 'Order Updated', text2: "Order and credit updated successfully!" });
                }
                await fetchAdminOrders();
                setSelectedOrderId(null);
                setProducts([]);
            }
        } catch (error) {
            setError(error.message || "Failed to update order.");
            Toast.show({ type: 'error', text1: 'Update Error', text2: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOrder = async (orderIdToDelete) => {
        setOrderDeleteLoading(true);
        setOrderDeleteLoadingId(orderIdToDelete);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
            const response = await fetch(`http://${ipAddress}:8090/cancel_order/${orderIdToDelete}`, { method: "POST", headers });

            if (!response.ok) throw new Error(`Failed to delete order: ${response.status}`);
            const deleteData = await response.json();
            if (!deleteData.success) throw new Error(deleteData.message);

            const cancelledOrder = orders.find(order => order.id === orderIdToDelete);
            if (cancelledOrder) {
                const { customer_id: customerId, total_amount: cancelledOrderAmount } = cancelledOrder;
                await fetch(`http://${ipAddress}:8090/increase-credit-limit`, {
                    method: "POST", headers, body: JSON.stringify({ customerId, amountToIncrease: cancelledOrderAmount })
                });
                await axios.post(`http://${ipAddress}:8090/credit-limit/update-amount-due-on-order`, {
                    customerId, totalOrderAmount: 0, originalOrderAmount: cancelledOrderAmount
                }, { headers: { 'Content-Type': 'application/json' } });
            }

            setSelectedOrderId(null);
            setProducts([]);
            await fetchAdminOrders();
            Toast.show({ type: "success", text1: "Order Cancelled", text2: deleteData.message });
        } catch (error) {
            setError(error.message || "Failed to cancel order.");
            Toast.show({ type: "error", text1: "Cancellation Error", text2: error.message });
        } finally {
            setOrderDeleteLoading(false);
            setOrderDeleteLoadingId(null);
        }
    };

    const handleAddProductToOrder = async (productToAdd) => {
        if (!selectedOrderId) return Alert.alert("Error", "Please select an order.");
        if (products.some(p => p.product_id === productToAdd.id)) {
            Toast.show({ type: 'info', text1: 'Product Already Added', text2: 'Update quantity instead.' });
            setShowSearchModal(false);
            return;
        }
    
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const orderToCheck = orders.find(order => order.id === selectedOrderId);
            if (!orderToCheck) {
                Toast.show({ type: 'error', text1: 'Order Not Found', text2: "The selected order no longer exists. Please select or create a new order." });
                setSelectedOrderId(null);
                setProducts([]);
                await fetchAdminOrders();
                return;
            }
            
    
            console.log("Raw productToAdd from SearchProductModal:", productToAdd);
    
            // Determine price: Check customer-specific price first, then fallback to productToAdd.price or latest price
            let priceToUse = productToAdd.price; // Default price
            if (selectedOrderCustomerId) { // Ensure customer ID is available
                const customerPriceCheckUrl = `http://${ipAddress}:8090/customer_price_check?customer_id=${selectedOrderCustomerId}`;
                const customerPriceResponse = await fetch(customerPriceCheckUrl, {
                    method: 'GET',
                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
                });
    
                if (customerPriceResponse.ok) {
                    const customerPrices = await customerPriceResponse.json();
                    const specificPrice = customerPrices.find(item => item.product_id === productToAdd.id);
                    if (specificPrice && specificPrice.customer_price !== undefined && specificPrice.customer_price !== null) {
                        priceToUse = specificPrice.customer_price;
                        console.log(`Using customer-specific price: ₹${priceToUse} for product ${productToAdd.id}`);
                    }
                } else {
                    console.log("No customer-specific price found or fetch failed, falling back to default.");
                }
            }
    
            // If priceToUse is still invalid, fetch from /latest-product-price
            if (priceToUse === undefined || priceToUse === null || isNaN(priceToUse)) {
                const priceResponse = await fetch(`http://${ipAddress}:8090/latest-product-price?productId=${productToAdd.id}`, {
                    method: 'GET',
                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
                });
                if (priceResponse.ok) {
                    const priceData = await priceResponse.json();
                    priceToUse = priceData.price;
                    console.log(`Using latest price from order_products: ₹${priceToUse} for product ${productToAdd.id}`);
                } else {
                    const errorText = await priceResponse.text();
                    console.log("Failed to fetch latest price:", errorText);
                    priceToUse = 0; // Final fallback if all else fails
                    console.log(`Falling back to price: ₹${priceToUse} for product ${productToAdd.id}`);
                }
            }
    
            const gstRateToUse = productToAdd.gst_rate !== undefined ? productToAdd.gst_rate : 0;
    
            const payload = {
                orderId: selectedOrderId,
                productId: productToAdd.id,
                quantity: 1,
                price: priceToUse,
                name: productToAdd.name,
                category: productToAdd.category,
                gst_rate: gstRateToUse
            };
            console.log("Payload being sent to add-product-to-order:", payload);
    
            const response = await fetch(`http://${ipAddress}:8090/add-product-to-order`, {
                method: 'POST',
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                console.log("Error Response from server:", errorText);
                throw new Error(`Failed to add product: ${response.status}, ${errorText}`);
            }
    
            const addProductData = await response.json();
            if (addProductData.success) {
                Toast.show({ type: 'success', text1: 'Product Added', text2: `${productToAdd.name} added with price ₹${priceToUse}.` });
                fetchOrderProducts(selectedOrderId);
                setShowSearchModal(false);
            } else {
                throw new Error(addProductData.message || "Failed to add product.");
            }
        } catch (error) {
            setError(error.message || "Failed to add product.");
            Toast.show({ type: 'error', text1: 'Add Product Error', text2: error.message });
        } finally {
            setLoading(false);
        }
    };

    
    const renderOrderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.orderItem, selectedOrderId === item.id && styles.selectedOrderItem]}
            onPress={() => fetchOrderProducts(item.id)}
        >
            <View style={styles.orderItemContent}>
                <Text style={styles.orderIdText}>Order #{item.id}</Text>
                <Text style={styles.orderAmountText}>₹{item.total_amount ? parseFloat(item.total_amount).toFixed(2) : '0.00'}</Text>
                <TouchableOpacity
                    style={styles.deleteOrderButton}
                    onPress={() => handleDeleteOrder(item.id)}
                    disabled={orderDeleteLoading}
                >
                    {orderDeleteLoading && orderDeleteLoadingId === item.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Icon name="times" size={20} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const renderProductItem = ({ item, index }) => {
        const totalAmount = item.quantity * item.price;
        return (
            <View style={styles.productItem}>
                <View style={styles.productHeader}>
                    <View>
                        <Text style={styles.productNameText}>{item.name}</Text>
                        <Text style={styles.productCategoryText}>({item.category})</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteProductItem(index)}
                        disabled={deleteLoading}
                    >
                        {deleteLoading && deleteLoadingIndex === index ? (
                            <ActivityIndicator size="small" color="#d9534f" />
                        ) : (
                            <Icon name="trash" size={20} color="#d9534f" />
                        )}
                    </TouchableOpacity>
                </View>
                <View style={styles.quantityContainer}>
                    <Text style={styles.quantityLabel}>Qty:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => {
                                const newProducts = [...products];
                                newProducts[index].quantity = Math.max(0, item.quantity - 1);
                                setProducts(newProducts);
                            }}
                        >
                            <Text style={{ fontSize: 20, paddingHorizontal: 10 }}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 16, width: 40, textAlign: 'center' }}>
                            {item.quantity}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                const newProducts = [...products];
                                newProducts[index].quantity = item.quantity + 1;
                                setProducts(newProducts);
                            }}
                        >
                            <Text style={{ fontSize: 20, paddingHorizontal: 10 }}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.amountText}>₹{totalAmount.toFixed(2)}</Text>
            </View>
        );
    };
    
    

    return (
        <View style={styles.container}>
            <Text style={styles.headerText}>Update Orders</Text>
            {loading && <ActivityIndicator size="large" color="#FFD700" style={styles.loading} />}
            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.ordersContainer}>
                <Text style={styles.sectionTitle}>Today's Orders</Text>
                <FlatList
                    data={orders}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderOrderItem}
                    ListEmptyComponent={<Text style={styles.emptyText}>No orders for today.</Text>}
                    contentContainerStyle={styles.orderList}
                />
            </View>

            {selectedOrderId && (
                <View style={styles.editContainer}>
                    <View style={styles.editHeader}>
                        <Text style={styles.sectionTitle}>Edit Order #{selectedOrderId}</Text>
                        <TouchableOpacity style={styles.searchButton} onPress={() => setShowSearchModal(true)}>
                            <Icon name="search" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={products}
                        keyExtractor={(_, index) => index.toString()}
                        renderItem={renderProductItem}
                        ListEmptyComponent={<Text style={styles.emptyText}>No products in this order.</Text>}
                        contentContainerStyle={styles.productList}
                    />
                    <View style={styles.footer}>
                        <Text style={styles.totalText}>
                            Total: ₹{products.reduce((sum, p) => sum + p.quantity * p.price, 0).toFixed(2)}
                        </Text>
                        <Button title="Save Changes" onPress={handleUpdateOrder} disabled={loading} color="#FFD700" />
                    </View>
                </View>
            )}

            <SearchProductModal
                isVisible={showSearchModal}
                onClose={() => setShowSearchModal(false)}
                onAddProduct={handleAddProductToOrder}
                currentCustomerId={selectedOrderCustomerId}
                selectedOrderId={selectedOrderId}
            />
            <Toast />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    headerText: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', padding: 15, backgroundColor: '#FFD700', color: '#333' },
    loading: { marginTop: 20 },
    errorText: { color: 'red', textAlign: 'center', padding: 10 },
    ordersContainer: { flex: 1, padding: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 10 },
    orderList: { paddingBottom: 20 },
    orderItem: { 
        backgroundColor: '#fff', 
        padding: 15, 
        marginVertical: 5, 
        borderRadius: 8, 
        elevation: 2 
    },
    selectedOrderItem: { borderWidth: 2, borderColor: '#FFD700' },
    orderItemContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    orderIdText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    orderAmountText: { fontSize: 16, color: '#666' },
    deleteOrderButton: { backgroundColor: '#d9534f', padding: 8, borderRadius: 5 },
    editContainer: { flex: 1, backgroundColor: '#fff', padding: 10, borderTopWidth: 1, borderColor: '#ddd' },
    editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    searchButton: { backgroundColor: '#FFD700', padding: 8, borderRadius: 5 },
    productList: { flexGrow: 1 },
    productItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    productNameText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    productCategoryText: { fontSize: 14, color: '#888' },
    quantityContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
    quantityLabel: { fontSize: 14, color: '#666', marginRight: 10 },
    quantityInput: { borderWidth: 1, borderColor: '#ddd', padding: 5, width: 60, borderRadius: 5 },
    amountText: { fontSize: 14, color: '#333' },
    deleteButton: { padding: 5 },
    footer: { padding: 10, borderTopWidth: 1, borderColor: '#ddd', alignItems: 'center' },
    totalText: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    emptyText: { textAlign: 'center', color: '#666', padding: 20 }
});

export default UpdateOrdersSA;