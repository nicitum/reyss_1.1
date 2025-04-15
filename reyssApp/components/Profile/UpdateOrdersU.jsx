import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { View, Text, TextInput, FlatList, Button, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { jwtDecode } from 'jwt-decode';
import Icon from 'react-native-vector-icons/FontAwesome';
import SearchProductModal from '../IndentPage/nestedPage/searchProductModal';
import { checkTokenAndRedirect } from "../../services/auth";
import moment from 'moment';
import { ipAddress } from '../../urls';

const UpdateOrdersU = () => {
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
    const [originalOrderAmounts, setOriginalOrderAmounts] = useState({});

    useEffect(() => {
        fetchUsersOrders();
    }, []);

    const fetchUsersOrders = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const decodedToken = jwtDecode(token);
            const custId = decodedToken.id;

            const url = `http://${ipAddress}:8090/get-orders/${custId}`;
            const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
            const ordersResponse = await fetch(url, { headers });

            if (!ordersResponse.ok) {
                const errorText = await ordersResponse.text();
                throw new Error(`Failed to fetch customer orders. Status: ${ordersResponse.status}, Text: ${errorText}`);
            }

            const ordersData = await ordersResponse.json();
            const todayFormatted = moment().format("YYYY-MM-DD");
            const todaysOrders = ordersData.orders.filter(order => {
                if (!order.placed_on) return false;
                const parsedEpochSeconds = parseInt(order.placed_on, 10);
                const orderDateFormatted = moment.unix(parsedEpochSeconds).format("YYYY-MM-DD");
                return orderDateFormatted === todayFormatted;
            });

            setOrders(todaysOrders);
            const amountsMap = {};
            todaysOrders.forEach(order => amountsMap[order.id] = order.total_amount);
            setOriginalOrderAmounts(amountsMap);
        } catch (fetchOrdersError) {
            setError(fetchOrdersError.message || "Failed to fetch customer orders.");
            Toast.show({ type: 'error', text1: 'Fetch Error', text2: fetchOrdersError.message });
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

            if (!productsResponse.ok) {
                if (productsResponse.status === 404) {
                    setProducts([]);
                    setSelectedOrderId(orderIdToFetch);
                    return;
                }
                const errorText = await productsResponse.text();
                throw new Error(`Failed to fetch order products. Status: ${productsResponse.status}, Text: ${errorText}`);
            }

            const productsData = await productsResponse.json();
            setProducts(productsData);
            setSelectedOrderId(orderIdToFetch);
        } catch (error) {
            setError(error.message || "Failed to fetch order products.");
            Toast.show({ type: 'error', text1: 'Fetch Error', text2: error.message });
            setProducts([]);
            setSelectedOrderId(null);
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
        if (!productToDelete || !productToDelete.order_id) {
            Toast.show({ type: 'error', text1: 'Deletion Error', text2: "Could not delete product item. Order Product ID missing." });
            return;
        }
        setDeleteLoading(true);
        setDeleteLoadingIndex(indexToDelete);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const orderToCheck = orders.find(order => order.id === productToDelete.order_id);
            if (orderToCheck?.loading_slip === 'Yes') {
                Toast.show({ type: 'error', text1: 'Deletion Prohibited', text2: "Loading slip already generated for this order." });
                return;
            }
            const url = `http://${ipAddress}:8090/delete_order_product/${productToDelete.product_id}`;
            const deleteResponse = await fetch(url, { method: 'DELETE', headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } });

            if (!deleteResponse.ok) {
                const errorText = await deleteResponse.text();
                throw new Error(`Failed to delete order product. Status: ${deleteResponse.status}, Text: ${errorText}`);
            }

            const deleteData = await deleteResponse.json();
            if (products.length === 1) {
                await handleDeleteOrder(selectedOrderId);
            } else {
                const updatedProducts = products.filter((_, index) => index !== indexToDelete);
                setProducts(updatedProducts);
                Toast.show({ type: 'success', text1: 'Product Item Deleted', text2: deleteData.message || "Product item deleted successfully from order." });
            }
            setIsOrderUpdated(false);
        } catch (deleteError) {
            setError(deleteError.message || "Failed to delete order product.");
            Toast.show({ type: 'error', text1: 'Deletion Error', text2: deleteError.message });
        } finally {
            setDeleteLoading(false);
            setDeleteLoadingIndex(null);
        }
    };

    const checkCreditLimit = async () => {
        try {
            const userAuthToken = await checkTokenAndRedirect(navigation);
            if (!userAuthToken) {
                Toast.show({ type: 'error', text1: 'Authentication Error', text2: "Authorization token missing." });
                return null;
            }
            const decodedToken = jwtDecode(userAuthToken);
            const customerId = decodedToken.id;
            const creditLimitResponse = await fetch(`http://${ipAddress}:8090/credit-limit?customerId=${customerId}`, {
                method: 'GET', headers: { Authorization: `Bearer ${userAuthToken}`, 'Content-Type': 'application/json' }
            });
            if (creditLimitResponse.ok) return parseFloat((await creditLimitResponse.json()).creditLimit);
            if (creditLimitResponse.status === 404) return Infinity;
            Toast.show({ type: 'error', text1: 'Credit Limit Error', text2: "Failed to fetch credit limit." });
            return null;
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Credit Limit Error', text2: "Error checking credit limit." });
            return null;
        }
    };

    const handleUpdateOrder = async () => {
        if (!selectedOrderId) {
            Alert.alert("Error", "Please select an order to update.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            if (!token) {
                Toast.show({ type: 'error', text1: 'Authentication Error', text2: "Auth token missing." });
                return;
            }
            const orderToCheck = orders.find(order => order.id === selectedOrderId);
            if (orderToCheck?.loading_slip === 'Yes') {
                Toast.show({ type: 'error', text1: 'Order Update Prohibited', text2: "Loading slip already generated for this order." });
                return;
            }
            let calculatedTotalAmount = 0;
            const productsToUpdate = products.map(product => ({
                order_id: selectedOrderId,
                product_id: product.product_id,
                name: product.name,
                category: product.category,
                price: product.price,
                quantity: product.quantity,
                gst_rate: product.gst_rate
            }));
            productsToUpdate.forEach(product => calculatedTotalAmount += product.quantity * product.price);
            const originalOrderAmount = originalOrderAmounts[selectedOrderId];
            const orderAmountDifference = calculatedTotalAmount - originalOrderAmount;

            const creditLimit = await checkCreditLimit();
            if (creditLimit === null) throw new Error("Unable to verify credit limit");
            if (calculatedTotalAmount > creditLimit) {
                Toast.show({ type: 'error', text1: 'Credit Limit Exceeded', text2: `Order amount (₹${calculatedTotalAmount}) exceeds your credit limit (₹${creditLimit})` });
                return;
            }

            const url = `http://${ipAddress}:8090/order_update`;
            const updateResponse = await fetch(url, {
                method: 'POST',
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: selectedOrderId, products: productsToUpdate, totalAmount: calculatedTotalAmount })
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Failed to update order. Status: ${updateResponse.status}, Text: ${errorText}`);
            }

            const updateData = await updateResponse.json();
            if (updateResponse.status === 200) {
                const customerIdForCreditUpdate = jwtDecode(token).id;
                if (orderAmountDifference > 0) {
                    await axios.post(`http://${ipAddress}:8090/credit-limit/deduct`, { customerId: customerIdForCreditUpdate, amountChange: orderAmountDifference }, { headers: { 'Content-Type': 'application/json' } });
                } else if (orderAmountDifference < 0) {
                    await axios.post(`http://${ipAddress}:8090/increase-credit-limit`, { customerId: customerIdForCreditUpdate, amountToIncrease: Math.abs(orderAmountDifference) }, { headers: { 'Content-Type': 'application/json' } });
                }
                await axios.post(`http://${ipAddress}:8090/credit-limit/update-amount-due-on-order`, {
                    customerId: customerIdForCreditUpdate, totalOrderAmount: calculatedTotalAmount, originalOrderAmount
                }, { headers: { 'Content-Type': 'application/json' } });
                Toast.show({ type: 'success', text1: 'Order Updated & Credit Updated', text2: "Order and credit limit adjusted successfully!" });
            } else {
                Toast.show({ type: 'error', text1: 'Order Update Failed', text2: updateData.message || "Failed to update order." });
                setError(updateData.message || "Failed to update order.");
            }
            await fetchUsersOrders();
            setSelectedOrderId(null);
            setProducts([]);
            setIsOrderUpdated(false);
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
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
            const orderToCheck = orders.find(order => order.id === orderIdToDelete);
            if (orderToCheck?.loading_slip === 'Yes') {
                Toast.show({ type: 'error', text1: 'Cancellation Prohibited', text2: "Loading slip already generated for this order." });
                return;
            }
            const deleteOrderResponse = await fetch(`http://${ipAddress}:8090/cancel_order/${orderIdToDelete}`, { method: 'POST', headers });

            if (!deleteOrderResponse.ok) {
                const errorText = await deleteOrderResponse.text();
                throw new Error(`Failed to delete order. Status: ${deleteOrderResponse.status}, Text: ${errorText}`);
            }

            const deleteOrderData = await deleteOrderResponse.json();
            if (deleteOrderData.success) {
                const cancelledOrder = orders.find(order => order.id === orderIdToDelete);
                if (cancelledOrder) {
                    const { customer_id: customerId, total_amount: cancelledOrderAmount } = cancelledOrder;
                    if (customerId && cancelledOrderAmount !== undefined && cancelledOrderAmount !== null) {
                        await fetch(`http://${ipAddress}:8090/increase-credit-limit`, {
                            method: "POST", headers, body: JSON.stringify({ customerId, amountToIncrease: cancelledOrderAmount })
                        });
                    }
                    await axios.post(`http://${ipAddress}:8090/credit-limit/update-amount-due-on-order`, {
                        customerId, totalOrderAmount: 0, originalOrderAmount: cancelledOrderAmount
                    }, { headers: { 'Content-Type': 'application/json' } });
                }
                await fetchUsersOrders();
                setSelectedOrderId(null);
                setProducts([]);
                Toast.show({ type: 'success', text1: 'Order Cancelled', text2: deleteOrderData.message || `Order ID ${orderIdToDelete} cancelled successfully.` });
            } else {
                Toast.show({ type: 'error', text1: 'Failed to Cancel Order', text2: deleteOrderData.message || "Failed to cancel the order." });
                setError(deleteOrderData.message || "Failed to cancel the order.");
            }
        } catch (deleteOrderError) {
            setError(deleteOrderError.message || "Failed to cancel order.");
            Toast.show({ type: 'error', text1: 'Cancellation Error', text2: deleteOrderError.message });
        } finally {
            setOrderDeleteLoading(false);
            setOrderDeleteLoadingId(null);
        }
    };

    const fetchLatestPriceFromOrderProducts = async (productId) => {
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const url = `http://${ipAddress}:8090/latest-product-price?productId=${productId}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
            });

            if (!response.ok) {
                return null; // Fallback to default price if no data found
            }

            const data = await response.json();
            return data.price; // Assuming the endpoint returns { price: <value> }
        } catch (error) {
            console.error("Error fetching latest price:", error);
            return null;
        }
    };

    const handleAddProductToOrder = async (productToAdd) => {
        if (!selectedOrderId) {
            Alert.alert("Error", "Please select an order before adding products.");
            return;
        }
        const isProductAlreadyAdded = products.some(p => p.product_id === productToAdd.id);
        if (isProductAlreadyAdded) {
            Toast.show({ type: 'info', text1: 'Product Already Added', text2: 'This product is already in the order. Please update quantity instead.' });
            setShowSearchModal(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const decodedToken = jwtDecode(token);
            const custId = decodedToken.id;
            const orderToCheck = orders.find(order => order.id === selectedOrderId);
            if (orderToCheck?.loading_slip === 'Yes') {
                Toast.show({ type: 'error', text1: 'Adding Product Prohibited', text2: "Loading slip already generated for this order." });
                return;
            }
    
            let priceToUse = productToAdd.price;
            // Fetch customer-specific price
            const customerPriceCheckUrl = `http://${ipAddress}:8090/customer_price_check?customer_id=${custId}`;
            const customerPriceResponse = await fetch(customerPriceCheckUrl, {
                method: 'GET',
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
            });
    
            if (customerPriceResponse.ok) {
                const customerPrices = await customerPriceResponse.json();
                const specificPrice = customerPrices.find(item => item.product_id === productToAdd.id);
                if (specificPrice && specificPrice.customer_price !== undefined && specificPrice.customer_price !== null) {
                    priceToUse = specificPrice.customer_price;
                } else {
                    // If no specific price found, fall back to fetching the latest price
                    const latestPrice = await fetchLatestPriceFromOrderProducts(productToAdd.id);
                    if (latestPrice !== null) {
                        priceToUse = latestPrice;
                    }
                }
            } else {
                console.error("Failed to fetch customer-specific prices:", customerPriceResponse.status, await customerPriceResponse.text());
                // Fallback to fetching the latest price if customer price check fails
                const latestPrice = await fetchLatestPriceFromOrderProducts(productToAdd.id);
                if (latestPrice !== null) {
                    priceToUse = latestPrice;
                }
            }
    
            const url = `http://${ipAddress}:8090/add-product-to-order`;
            const addProductResponse = await fetch(url, {
                method: 'POST',
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderId: selectedOrderId,
                    productId: productToAdd.id,
                    quantity: 1,
                    price: priceToUse, // Use the determined price
                    name: productToAdd.name,
                    category: productToAdd.category,
                    gst_rate: productToAdd.gst_rate
                })
            });
    
            if (!addProductResponse.ok) {
                const errorText = await addProductResponse.text();
                throw new Error(`Failed to add product to order. Status: ${addProductResponse.status}, Text: ${errorText}`);
            }
    
            const addProductData = await addProductResponse.json();
            if (addProductData.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Product Added to Order',
                    text2: `${productToAdd.name} has been added with price ₹${priceToUse.toFixed(2)}.`
                });
                setShowSearchModal(false);
                fetchOrderProducts(selectedOrderId);
                setIsOrderUpdated(false);
            } else {
                Toast.show({ type: 'error', text1: 'Failed to Add Product', text2: addProductData.message || "Failed to add product to order." });
                setError(addProductData.message || "Failed to add product to order.");
            }
        } catch (error) {
            setError(error.message || "Failed to add product to order.");
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

            <Toast ref={(ref) => Toast.setRef(ref)} />
            <SearchProductModal
                isVisible={showSearchModal}
                onClose={() => setShowSearchModal(false)}
                onAddProduct={handleAddProductToOrder}
            />
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
    gstText: { fontSize: 12, color: '#666' },
    quantityContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
    quantityLabel: { fontSize: 14, color: '#666', marginRight: 10 },
    quantityInput: { borderWidth: 1, borderColor: '#ddd', padding: 5, width: 60, borderRadius: 5 },
    amountText: { fontSize: 14, color: '#333' },
    deleteButton: { padding: 5 },
    footer: { padding: 10, borderTopWidth: 1, borderColor: '#ddd', alignItems: 'center' },
    totalText: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    emptyText: { textAlign: 'center', color: '#666', padding: 20 }
});

export default UpdateOrdersU;