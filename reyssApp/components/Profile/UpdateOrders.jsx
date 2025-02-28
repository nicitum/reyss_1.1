import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Button, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { jwtDecode } from 'jwt-decode';
import Icon from 'react-native-vector-icons/FontAwesome';
import SearchProductModal from '../IndentPage/nestedPage/searchProductModal';
import moment from 'moment';

import { ipAddress } from '../../urls';

const UpdateOrderScreen = () => {
    const navigation = useNavigation();
    const [orders, setOrders] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [customerDetails, setCustomerDetails] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isOrderUpdated, setIsOrderUpdated] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteLoadingIndex, setDeleteLoadingIndex] = useState(null);
    const [showSearchModal, setShowSearchModal] = useState(false); // State for modal visibility
    const [orderDeleteLoading, setOrderDeleteLoading] = useState(false);
    const [orderDeleteLoadingId, setOrderDeleteLoadingId] = useState(null);


    useEffect(() => {
        fetchAdminOrders();
    }, []);

    const fetchAdminOrders = async () => {
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

            console.log("FETCH ADMIN ORDERS - Request URL:", url);
            console.log("FETCH ADMIN ORDERS - Request Headers:", headers);

            const ordersResponse = await fetch(url, { headers });

            console.log("FETCH ADMIN ORDERS - Response Status:", ordersResponse.status);
            console.log("FETCH ADMIN ORDERS - Response Status Text:", ordersResponse.statusText);

            if (!ordersResponse.ok) {
                const errorText = await ordersResponse.text();
                const message = `Failed to fetch admin orders. Status: ${ordersResponse.status}, Text: ${errorText}`;
                console.error("FETCH ADMIN ORDERS - Error Response Text:", errorText);
                throw new Error(message);
            }

            const ordersData = await ordersResponse.json();
            console.log("FETCH ADMIN ORDERS - Response Data:", ordersData);
            let fetchedOrders = ordersData.orders;

            // **FILTER ORDERS FOR TODAY (Epoch Seconds & CORRECT FORMAT & .unix()):**
            const todayFormatted = moment().format("YYYY-MM-DD"); // Corrected format to YYYY-MM-DD (more standard)
            console.log("DEBUG: Today's Formatted Date (YYYY-MM-DD):", todayFormatted); // DEBUG LOG

            const todaysOrders = fetchedOrders.filter(order => {
                if (!order.placed_on) {
                    console.log("DEBUG: order.placed_on is missing for order ID:", order.id); // DEBUG LOG
                    return false; // Skip if placed_on is missing or invalid
                }

                console.log("DEBUG: Raw order.placed_on value:", order.placed_on, typeof order.placed_on); // DEBUG LOG - Raw value and type

                const parsedEpochSeconds = parseInt(order.placed_on, 10); // Still parse to integer
                console.log("DEBUG: Parsed Epoch Timestamp (parseInt) - Seconds:", parsedEpochSeconds, typeof parsedEpochSeconds); // DEBUG LOG - Parsed integer (seconds)

                // **Use moment.unix() to parse epoch seconds:**
                const orderDateMoment = moment.unix(parsedEpochSeconds); // **Use moment.unix()**
                console.log("DEBUG: Moment Object from Epoch (Seconds using .unix()):", orderDateMoment); // DEBUG LOG - Moment object (parsed as seconds)
                console.log("DEBUG: Moment Object valueOf (Epoch in ms AFTER .unix()):", orderDateMoment.valueOf()); // DEBUG LOG - Epoch value from Moment (in ms)

                const orderDateFormatted = orderDateMoment.format("YYYY-MM-DD"); // Corrected format to YYYY-MM-DD
                console.log("DEBUG: Formatted Order Date (YYYY-MM-DD):", orderDateFormatted); // DEBUG LOG - Formatted date

                return orderDateFormatted === todayFormatted; // Compare formatted dates
            });

            setOrders(todaysOrders); 
            console.log('todayssss order',todaysOrders)// Set the filtered orders

        } catch (fetchOrdersError) {
            console.error("FETCH ADMIN ORDERS - Fetch Error:", fetchOrdersError);
            setError(fetchOrdersError.message || "Failed to fetch admin orders.");
            Toast.show({ type: 'error', text1: 'Fetch Error', text2: fetchOrdersError.message || "Failed to fetch admin orders." });
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
                // **Modified Condition: Only throw error if NOT a 404 "No products found"**
                if (productsResponse.status !== 404) {
                    throw new Error(message);
                } else {
                    // **Handle 404 "No products found" gracefully:**
                    console.log("FETCH ORDER PRODUCTS - No products found for this order, initializing empty product list.");
                    setProducts([]); // Initialize products to empty array
                    setSelectedOrderId(orderIdToFetch);
                    return; // Exit function early, no need to process JSON
                }
            }

            const productsData = await productsResponse.json();
            console.log("FETCH ORDER PRODUCTS - Response Data:", productsData);
            setProducts(productsData);
            setSelectedOrderId(orderIdToFetch);

        } catch (error) {
            console.error("FETCH ORDER PRODUCTS - Fetch Error:", error);
            setError(error.message || "Failed to fetch order products.");
            Toast.show({ type: 'error', text1: 'Fetch Error', text2: error.message || "Failed to fetch order products." });
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
            console.error("Order Product ID missing for deletion.");
            Toast.show({ type: 'error', text1: 'Deletion Error', text2: "Could not delete product item. Order Product ID missing." });
            return;
        }

        setDeleteLoading(true);
        setDeleteLoadingIndex(indexToDelete);
        setError(null);

        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const orderProductIdToDelete = productToDelete.product_id;
            console.log(orderProductIdToDelete)

            const url = `http://${ipAddress}:8090/delete_order_product/${orderProductIdToDelete}`;
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };
            const deleteResponse = await fetch(url, {
                method: 'DELETE',
                headers: headers,
            });

            if (!deleteResponse.ok) {
                const errorText = await deleteResponse.text();
                const message = `Failed to delete order product. Status: ${deleteResponse.status}, Text: ${errorText}`;
                console.error("DELETE ORDER PRODUCT - Error Response Status:", deleteResponse.status, "Status Text:", deleteResponse.statusText);
                console.error("DELETE ORDER PRODUCT - Full Error Response:", errorText);
                throw new Error(message);
            }

            const deleteData = await deleteResponse.json();
            console.log("DELETE ORDER PRODUCT - Response Data:", deleteData);

            // Check if this was the last product
            if (products.length === 1) {
                // Call handleDeleteOrder to cancel the entire order
                await handleDeleteOrder(selectedOrderId);
            } else {
                // Only the product item was deleted, update product list
                const updatedProducts = products.filter((_, index) => index !== indexToDelete);
                setProducts(updatedProducts);
                Toast.show({
                    type: 'success',
                    text1: 'Product Item Deleted',
                    text2: deleteData.message || "Product item deleted successfully from order."
                });
            }
            setIsOrderUpdated(false);

        } catch (deleteError) {
            console.error("DELETE ORDER PRODUCT - Error:", deleteError);
            setError(deleteError.message || "Failed to delete order product.");
            Toast.show({ type: 'error', text1: 'Deletion Error', text2: deleteError.message || "Failed to delete product item." });
        } finally {
            setDeleteLoading(false);
            setDeleteLoadingIndex(null);
        }
    };


     const checkCreditLimit = async () => {
            try {
                const userAuthToken = await checkTokenAndRedirect(navigation);
                if (!userAuthToken) {
                    Toast.show({
                        type: 'error',
                        text1: 'Authentication Error',
                        text2: "Authorization token missing."
                    });
                    return null; // Indicate error
                }
                const decodedToken = jwtDecode(userAuthToken);
                const customerId = decodedToken.id;
    
                const creditLimitResponse = await fetch(`http://${ipAddress}:8090/credit-limit?customerId=${customerId}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${userAuthToken}`,
                        'Content-Type': 'application/json',
                    },
                });
    
                if (creditLimitResponse.ok) {
                    const creditData = await creditLimitResponse.json();
                    return parseFloat(creditData.creditLimit); // Parse to float for comparison
                } else if (creditLimitResponse.status === 404) {
                    console.log("Credit limit not found for customer, proceeding without limit check.");
                    return Infinity; // Treat as no credit limit or very high limit, allow order (adjust logic if needed)
                } else {
                    console.error("Error fetching credit limit:", creditLimitResponse.status, creditLimitResponse.statusText);
                    Toast.show({
                        type: 'error',
                        text1: 'Credit Limit Error',
                        text2: "Failed to fetch credit limit."
                    });
                    return null; // Indicate error
                }
    
            } catch (error) {
                console.error("Error checking credit limit:", error);
                Toast.show({
                    type: 'error',
                    text1: 'Credit Limit Error',
                    text2: "Error checking credit limit."
                });
                return null; // Indicate error
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

            let calculatedTotalAmount = 0;
            const productsToUpdate = products.map(product => ({
                order_id: selectedOrderId,
                product_id: product.product_id,
                name: product.name,
                category: product.category,
                price: product.price,
                quantity: product.quantity,
            }));

            productsToUpdate.forEach(product => {
                calculatedTotalAmount += product.quantity * product.price;
            });


            
            

            const url = `http://${ipAddress}:8090/order_update`;
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };
            const requestBody = {
                orderId: selectedOrderId,
                products: productsToUpdate, // Use the updated productsToUpdate array
                totalAmount: calculatedTotalAmount,
                total_amount: calculatedTotalAmount
            };
        
            console.log("UPDATE ORDER - Request URL:", url);
            console.log("UPDATE ORDER - Request Headers:", headers);
            console.log("UPDATE ORDER - Request Body:", JSON.stringify(requestBody, null, 2));

            const updateResponse = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            console.log("UPDATE ORDER - Response Status:", updateResponse.status);
            console.log("UPDATE ORDER - Response Status Text:", updateResponse.statusText);
        

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                const message = `Failed to update order products and total amount. Status: ${updateResponse.status}, Text: ${errorText}`;
                console.error("UPDATE ORDER - Error Response Text:", errorText);
                throw new Error(message);
            }

            const updateData = await updateResponse.json();
            console.log("UPDATE ORDER - Response Data:", updateData);
            Toast.show({
                type: 'success',
                text1: 'Order Updated',
                text2: updateData.message || "Order updated successfully!"
            });
            await fetchAdminOrders()
            setSelectedOrderId(null);
            setProducts([]);
            setIsOrderUpdated(false);
        } catch (error) {
            console.error("UPDATE ORDER - Error:", error);
            setError(error.message || "Failed to update order.");
            Toast.show({ type: 'error', text1: 'Update Error', text2: error.message || "Failed to update order." });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOrder = async (orderIdToDelete) => {
        console.log("handleDeleteOrder CALLED - Order ID:", orderIdToDelete);

        setOrderDeleteLoading(true);
        setOrderDeleteLoadingId(orderIdToDelete);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const url = `http://${ipAddress}:8090/cancel_order/${orderIdToDelete}`;
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            const deleteOrderResponse = await fetch(url, {
                method: 'POST',
                headers: headers,
            });

            if (!deleteOrderResponse.ok) {
                const errorText = await deleteOrderResponse.text();
                const message = `Failed to delete order. Status: ${deleteOrderResponse.status}, Text: ${errorText}`;
                throw new Error(message);
            }

            const deleteOrderData = await deleteOrderResponse.json();

            if (deleteOrderData.success) {
                // First clear selections
                setSelectedOrderId(null);
                setProducts([]);
                
                // Then fetch updated orders
                await fetchAdminOrders(); // Added parentheses to execute the function
                
                Toast.show({
                    type: 'success',
                    text1: 'Order Cancelled',
                    text2: deleteOrderData.message || `Order ID ${orderIdToDelete} cancelled successfully.`
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Failed to Cancel Order',
                    text2: deleteOrderData.message || "Failed to cancel the order."
                });
                setError(deleteOrderData.message || "Failed to cancel the order.");
            }

        } catch (deleteOrderError) {
            console.error("DELETE ORDER - Error:", deleteOrderError);
            setError(deleteOrderError.message || "Failed to cancel order.");
            Toast.show({ type: 'error', text1: 'Cancellation Error', text2: deleteOrderError.message || "Failed to cancel the order." });
        } finally {
            setOrderDeleteLoading(false);
            setOrderDeleteLoadingId(null);
        }
    };

    const renderOrderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.orderItemTouchable}
            onPress={() => {
                if (selectedOrderId === item.id) {
                    setSelectedOrderId(null);
                    setProducts([]);
                } else {
                    setSelectedOrderId(item.id);
                    fetchOrderProducts(item.id);
                }
            }}
        >
            <View style={styles.orderItemContainer}>
                <Text style={styles.orderIdText}>Order ID: {item.id}</Text>
              
                <Text style={styles.orderAmountText}>Total Amount: {item.total_amount ? parseFloat(item.total_amount).toFixed(2) : 0.0}</Text>
                <Text style={styles.customerNameText}>
                    Cancelled ?: {item.cancelled ? item.cancelled : 'No'}
                </Text>
                <TouchableOpacity
                    style={styles.deleteOrderButton}
                    onPress={() => handleDeleteOrder(item.id)}
                    disabled={orderDeleteLoading}
                >
                    {orderDeleteLoading && orderDeleteLoadingId === item.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Icon name="time" size={20} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );


    const handleAddProductToOrder = async (productToAdd) => {
        if (!selectedOrderId) {
            Alert.alert("Error", "Please select an order before adding products.");
            return;
        }

        const isProductAlreadyAdded = products.some(p => p.product_id === productToAdd.id);
        if (isProductAlreadyAdded) {
            Toast.show({
                type: 'info',
                text1: 'Product Already Added',
                text2: 'This product is already in the order. Please update quantity instead.'
            });
            setShowSearchModal(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const url = `http://${ipAddress}:8090/add-product-to-order`;
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };
            const requestBody = {
                orderId: selectedOrderId,
                productId: productToAdd.id,
                quantity: 1,
                price: productToAdd.price,
                name: productToAdd.name, 
                category: productToAdd.category, // Include product category
            };

            console.log("ADD PRODUCT TO ORDER - Request URL:", url);
            console.log("ADD PRODUCT TO ORDER - Request Headers:", headers);
            console.log("ADD PRODUCT TO ORDER - Request Body:", JSON.stringify(requestBody, null, 2));

            const addProductResponse = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            console.log("ADD PRODUCT TO ORDER - Response Status:", addProductResponse.status);
            console.log("ADD PRODUCT TO ORDER - Response Status Text:", addProductResponse.statusText);

            if (!addProductResponse.ok) {
                const errorText = await addProductResponse.text();
                const message = `Failed to add product to order. Status: ${addProductResponse.status}, Text: ${errorText}`;
                console.error("ADD PRODUCT TO ORDER - Error Response Text:", errorText);
                throw new Error(message);
            }

            const addProductData = await addProductResponse.json();
            console.log("ADD PRODUCT TO ORDER - Response Data:", addProductData);

            if (addProductData.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Product Added to Order',
                    text2: addProductData.message || `${productToAdd.name} has been added to the order.`
                });
                setShowSearchModal(false);
                fetchOrderProducts(selectedOrderId);
                setIsOrderUpdated(false);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Failed to Add Product',
                    text2: addProductData.message || "Failed to add product to order."
                });
                setError(addProductData.message || "Failed to add product to order.");
            }

        } catch (error) {
            console.error("ADD PRODUCT TO ORDER - Error:", error);
            setError(error.message || "Failed to add product to order.");
            Toast.show({ type: 'error', text1: 'Add Product Error', text2: error.message || "Failed to add product to order." });
        } finally {
            setLoading(false);
        }
    };


    const renderProductItem = ({ item, index }) => {
        const totalAmount = item.quantity * item.price;
        return (
            <View style={styles.productItemContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={styles.productNameText}>{item.name} </Text>
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
                <View style={styles.inputContainer}>
                    <Text style={styles.quantityLabel}>Quantity:</Text>
                    {isOrderUpdated ? (
                        <Text style={styles.viewModeQuantity}>{item.quantity}</Text>
                    ) : (
                        <TextInput
                            style={styles.quantityInput}
                            placeholder="Quantity"
                            keyboardType="number-pad"
                            value={String(item.quantity)}
                            onChangeText={(text) => handleProductQuantityChange(index, text)}
                        />
                    )}
                </View>
                <Text style={styles.amountText}>Amount: ₹{totalAmount.toFixed(2)}</Text>
                {index === products.length - 1 && (
                    <View style={styles.totalSumContainer}>
                        <Text style={styles.totalSumText}>
                            Total Order Amount: ₹
                            {products.reduce((sum, product) => sum + (product.quantity * product.price), 0).toFixed(2)}
                        </Text>
                    </View>
                )}
            </View>
        );
    };


    return (
        <View style={styles.container}>
            <Text style={styles.headerText}>Order Update/Edit Page</Text>
            {loading && <Text style={styles.loadingText}>Loading Orders...</Text>}
            {error && <Text style={styles.errorText}>Error: {error}</Text>}

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Select Order to Update</Text>
            </View>

            <FlatList
                data={orders}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderOrderItem}
                ListEmptyComponent={() => <Text style={{ textAlign: 'center', marginTop: 10 }}>No orders found.</Text>}
            />

            {selectedOrderId && !isOrderUpdated && (
                <View style={styles.orderDetailsSection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <Text style={styles.sectionHeaderText}>Order ID: {selectedOrderId} - Product Details</Text>
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={() => setShowSearchModal(true)}
                        >
                            <Icon name="search" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1 }}>
                        <FlatList
                            data={products}
                            keyExtractor={(_item, index) => index.toString()}
                            renderItem={renderProductItem}
                            contentContainerStyle={{ paddingBottom: 100 }}
                        />
                    </View>
    
                    <View style={styles.bottomContainer}>
                        <View style={styles.totalSumContainer}>
                            <Text style={styles.totalSumText}>
                                Total Order Amount: ₹
                                {products.reduce((sum, product) => sum + (product.quantity * product.price), 0).toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.actionButtonsContainer}>
                            <Button
                                title="Update Order"
                                onPress={handleUpdateOrder}
                                disabled={loading}
                            />
                        </View>
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
    )};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f4f8',
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        padding: 10,
        backgroundColor: '#fff',
        textAlign: 'center',
        color: '#333',
    },
    loadingText: {
        textAlign: 'center',
        padding: 5,
        color: '#555',
    },
    errorText: {
        color: 'red',
        padding: 5,
        textAlign: 'center',
    },
    sectionHeader: {
        padding: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    sectionHeaderText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    orderItemTouchable: {
        backgroundColor: '#fff',
        padding: 8,
        marginHorizontal: 8,
        marginVertical: 4,
        borderRadius: 4,
        elevation: 1,
    },
    orderItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    orderIdText: {
        fontSize: 14,
        fontWeight: 'bold',
        flex: 1,
    },
    orderAmountText: {
        fontSize: 14,
        flex: 1,
    },
    customerNameText: {
        fontSize: 14,
        flex: 1,
    },
    orderDetailsSection: {
        flex: 1,
        marginTop: 5,
        backgroundColor: '#fff',
    },
    productItemContainer: {
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    productNameText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    productCategoryText: {
        fontSize: 12,
        color: '#666',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    quantityLabel: {
        fontSize: 14,
        width: 70,
    },
    quantityInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 4,
        width: 60,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        elevation: 3,
    },
    actionButtonsContainer: {
        padding: 10,
    },
    actionButtonsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        elevation: 3,
    },
    searchButton: {
        padding: 8,
        backgroundColor: '#FFD700',
        borderRadius: 4,
    },
    deleteOrderButton: {
        backgroundColor: '#FFD700',
        padding: 8,
        borderRadius: 4,
    },
    totalSumContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    totalSumText: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    // New button styles
    button: {
        backgroundColor: '#FFD700',
        padding: 10,
        borderRadius: 4,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

export default UpdateOrderScreen;