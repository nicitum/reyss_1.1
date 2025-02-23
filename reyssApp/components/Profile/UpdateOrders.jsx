import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Button, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { jwtDecode } from 'jwt-decode';
import Icon from 'react-native-vector-icons/FontAwesome';
import SearchProductModal from '../IndentPage/nestedPage/searchProductModal';

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
            const adminId = decodedToken.id;

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
                const errorText = await ordersResponse.text(); // Read response.text() only once
                const message = `Failed to fetch admin orders. Status: ${ordersResponse.status}, Text: ${errorText}`;
                console.error("FETCH ADMIN ORDERS - Error Response Text:", errorText);
                throw new Error(message);
            }

            const ordersData = await ordersResponse.json();
            console.log("FETCH ADMIN ORDERS - Response Data:", ordersData);
            setOrders(ordersData.orders);

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


            const orderProductIdToDelete = productToDelete.product_id; //
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

            if (deleteData.orderDeleted) {
                // Order was also deleted, update orders list
                const deletedOrderId = deleteData.deletedOrderId;
                const updatedOrders = orders.filter(order => order.id !== deletedOrderId);
                setOrders(updatedOrders);
                Toast.show({
                    type: 'success',
                    text1: 'Order and Product Item Deleted',
                    text2: deleteData.message || `Product item deleted successfully, and order ${deletedOrderId} removed as it became empty.`
                });
                setSelectedOrderId(null);
                setProducts([]);

            } else {
                // Only the product item was deleted, update product list as before
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
            // Include both existing products and newly added products in the update
            const productsToUpdate = products.map(product => ({
                order_id: selectedOrderId,
                product_id: product.product_id, // Ensure product_id is included for existing products
                name: product.name, // Include name and category for new products
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
            setIsOrderUpdated(true);
            fetchOrderProducts(selectedOrderId);
        } catch (error) {
            console.error("UPDATE ORDER - Error:", error);
            setError(error.message || "Failed to update order.");
            Toast.show({ type: 'error', text1: 'Update Error', text2: error.message || "Failed to update order." });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOrder = async (orderIdToDelete) => {
        console.log("handleDeleteOrder CALLED - Order ID:", orderIdToDelete); // Keep this log
    
        setOrderDeleteLoading(true);
        setOrderDeleteLoadingId(orderIdToDelete);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            console.log("DELETE ORDER - Token:", token);
            const url = `http://${ipAddress}:8090/delete_order/${orderIdToDelete}`;
            console.log("DELETE ORDER - URL:", url);
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };
            console.log("DELETE ORDER - Headers:", headers);
            const deleteOrderResponse = await fetch(url, {
                method: 'DELETE',
                headers: headers,
            });
    
            console.log("DELETE ORDER - Response Status:", deleteOrderResponse.status);
            console.log("DELETE ORDER - Response Status Text:", deleteOrderResponse.statusText);
    
    
            if (!deleteOrderResponse.ok) {
                const errorText = await deleteOrderResponse.text();
                const message = `Failed to delete order. Status: ${deleteOrderResponse.status}, Text: ${errorText}`;
                console.error("DELETE ORDER - Error Response:", errorText);
                throw new Error(message);
            }
    
            const deleteOrderData = await deleteOrderResponse.json();
            console.log("DELETE ORDER - Response Data:", deleteOrderData);
    
            if (deleteOrderData.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Order Deleted',
                    text2: deleteOrderData.message || `Order ID ${orderIdToDelete} deleted successfully.`
                });
                const updatedOrders = orders.filter(order => order.id !== orderIdToDelete);
                setOrders(updatedOrders);
                setSelectedOrderId(null);
                setProducts([]);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Failed to Delete Order',
                    text2: deleteOrderData.message || "Failed to delete the order."
                });
                setError(deleteOrderData.message || "Failed to delete the order.");
            }
    
    
        } catch (deleteOrderError) {
            console.error("DELETE ORDER - Error:", deleteOrderError);
            setError(deleteOrderError.message || "Failed to delete order.");
            Toast.show({ type: 'error', text1: 'Deletion Error', text2: deleteOrderError.message || "Failed to delete the order." });
        } finally {
            setOrderDeleteLoading(false);
            setOrderDeleteLoadingId(null);
        }
    
        console.log("handleDeleteOrder END"); // Keep this log
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
                <Text style={styles.customerNameText}>Customer ID: {item.customer_id}</Text>
                <Text style={styles.orderAmountText}>Total Amount: {item.amount ? parseFloat(item.amount).toFixed(2) : 'N/A'}</Text>
                <TouchableOpacity
                    style={styles.deleteOrderButton}
                    onPress={() => handleDeleteOrder(item.id)}
                    disabled={orderDeleteLoading}
                >
                    {orderDeleteLoading && orderDeleteLoadingId === item.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Icon name="trash" size={20} color="#fff" />
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
                name: productToAdd.name,       // Include product name
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
                <Text style={styles.amountText}>Amount: {totalAmount.toFixed(2)}</Text>
            </View>
        );
    };


    return (
        <View style={styles.container}>
            <Text style={styles.headerText}>Update Orders (Backend Delete Fixed)</Text>
            {loading && <Text style={styles.loadingText}>Loading Orders...</Text>}
            {error && <Text style={styles.errorText}>Error: {error}</Text>}

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Select Order to Update</Text>
                {isOrderUpdated && (
                    <View style={styles.updateConfirmConfirmation}>
                        <Icon name="check-circle" size={20} color="#4CAF50" style={styles.confirmationIcon} />
                        <Text style={styles.confirmationText}>Order Updated</Text>
                    </View>
                )}
            </View>


            <FlatList
                data={orders}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderOrderItem}
                ListEmptyComponent={() => <Text style={{ textAlign: 'center', marginTop: 10 }}>No orders found.</Text>}
            />

            {selectedOrderId && (
                <View style={styles.orderDetailsSection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <Text style={styles.sectionHeaderText}>Order ID: {selectedOrderId} - Product Details</Text>
                        {!isOrderUpdated && (
                            <TouchableOpacity
                                style={styles.searchButton}
                                onPress={() => setShowSearchModal(true)}
                            >
                                <Icon name="search" size={24} color="#333" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <FlatList
                        data={products}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={renderProductItem}
                    />
                    {!isOrderUpdated && (
                        <View style={styles.actionButtonsContainer}>
                            <Button
                                title="Update Order"
                                onPress={handleUpdateOrder}
                                disabled={loading || products.length === 0 || isOrderUpdated}
                                style={styles.updateButton}
                            />
                        </View>
                    )}
                    {isOrderUpdated && (
                        <Text style={styles.viewModeMessage}>Order updated. Editing disabled.</Text>
                    )}
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
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f4f4f8',
    },
    headerText: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 25,
        textAlign: 'center',
        color: '#333',
    },
    loadingText: {
        textAlign: 'center',
        marginBottom: 15,
        color: '#555',
    },
    errorText: {
        color: 'red',
        marginBottom: 15,
        textAlign: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionHeaderText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3a3a3a',
    },
    updateConfirmConfirmation: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    confirmationText: {
        color: '#4CAF50',
        marginLeft: 5,
        fontWeight: 'bold',
    },
    confirmationIcon: {
        marginRight: 5,
    },
    orderItemTouchable: {
        backgroundColor: '#fff',
        padding: 15,
        marginBottom: 10,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    orderItemContainer: {
        marginBottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    orderIdText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2e2e2e',
        flex: 2,
    },
    customerNameText: {
        fontSize: 16,
        color: '#5a5a5a',
        marginTop: 5,
        flex: 2,
    },
    orderAmountText: {
        fontSize: 16,
        color: '#5a5a5a',
        marginTop: 5,
        flex: 2,
    },
    orderDetailsSection: {
        marginTop: 25,
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionHeaderText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#3a3a3a',
    },
    productItemContainer: {
        padding: 12,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    productNameText: {
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#333',
    },
    productCategoryText: {
        fontSize: 15,
        color: '#777',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    quantityLabel: {
        fontSize: 16,
        marginRight: 10,
        color: '#444',
    },
    quantityInput: {
        flex: 1,
        borderWidth: 1,
        padding: 8,
        borderRadius: 5,
        marginLeft: 10,
        backgroundColor: '#fff',
        color: '#333',
    },
    viewModeQuantity: {
        fontSize: 16,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginLeft: 10,
        color: '#555',
    },
    amountText: {
        fontSize: 17,
        fontWeight: '500',
        textAlign: 'right',
        color: '#444',
    },
    updateButton: {
        marginTop: 25,
        backgroundColor: '#4285f4',
        borderRadius: 8,
        paddingVertical: 12,
    },
    deleteButton: {
        padding: 5,
        marginLeft: 10,
    },
    viewModeMessage: {
        textAlign: 'center',
        marginTop: 15,
        color: '#777',
        fontStyle: 'italic',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
        justifyContent: 'center'
    },
    searchButton: {
        padding: 8,
    },
    deleteOrderButton: {
        backgroundColor: '#d9534f',
        padding: 8,
        borderRadius: 5,
        marginLeft: 10,
    },
});

export default UpdateOrderScreen;