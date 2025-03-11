import React, { useState, useEffect, useCallback } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { ipAddress } from "../../urls";
import { checkTokenAndRedirectfd } from "../../services/auth";  
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

const SearchProductModalAdmin = ({ isVisible, onClose, onAddProduct, currentCustomerId, selectedOrderId }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [allProducts, setAllProducts] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedBrand, setSelectedBrand] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [adminCustomerId, setAdminCustomerId] = useState(null);

    const navigation = useNavigation();

    // Fetch assigned users for the admin to get the customer ID
    const fetchAssignedUsers = async () => {
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const decodedToken = jwtDecode(token);
            const adminId = decodedToken.id1; // Assuming admin ID is stored as id1 in the token

            const response = await axios.get(`http://${ipAddress}:8090/assigned-users/${adminId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            const assignedUsers = response.data.assignedUsers;
            if (assignedUsers && assignedUsers.length > 0) {
                // Assuming currentCustomerId comes from the selected order's customer_id
                const matchedCustomer = assignedUsers.find(user => user.cust_id === currentCustomerId);
                if (matchedCustomer) {
                    setAdminCustomerId(matchedCustomer.cust_id);
                } else {
                    setError("No matching customer found for this order.");
                }
            } else {
                setError("No users assigned to this admin.");
            }
        } catch (err) {
            console.error("Error fetching assigned users:", err);
            setError("Failed to fetch assigned users.");
        }
    };

    const filterProducts = useCallback(async () => {
        if (!allProducts || allProducts.length === 0) return;

        let filtered = [...allProducts];

        if (selectedCategory) {
            filtered = filtered.filter((product) =>
                product.category && product.category.toLowerCase() === selectedCategory.toLowerCase()
            );
        }

        if (selectedBrand) {
            filtered = filtered.filter((product) =>
                product.brand && product.brand.toLowerCase().includes(selectedBrand.toLowerCase())
            );
        }

        if (searchQuery.length > 2) {
            filtered = filtered.filter((product) =>
                product.name && product.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        const fetchPricesForFilteredProducts = async () => {
            let customerId = adminCustomerId || currentCustomerId; // Use adminCustomerId if available, else fallback to currentCustomerId
            if (!customerId) {
                setError("Customer ID not available for price filtering.");
                setLoading(false);
                return;
            }

            try {
                const productsWithPricesPromises = filtered.map(async (product) => {
                    try {
                        const priceResponse = await axios.get(`http://${ipAddress}:8090/customer-product-price`, {
                            params: {
                                product_id: product.id,
                                customer_id: customerId,
                            },
                        });
                        const basePrice = priceResponse.data.effectivePrice || product.price || 0;
                        const gstRate = product.gst_rate || 0;
                        const gstAmount = (basePrice * gstRate) / 100;
                        const finalPrice = basePrice + gstAmount;

                        return {
                            ...product,
                            effectivePrice: finalPrice,
                            price: basePrice,
                            gstRate: gstRate,
                            gstAmount: gstAmount,
                            finalPrice: finalPrice,
                        };
                    } catch (priceError) {
                        console.error(`Error fetching price for product ${product.id}:`, priceError);
                        const basePrice = product.discountPrice || product.price || 0;
                        const gstRate = product.gst_rate || 0;
                        const gstAmount = (basePrice * gstRate) / 100;
                        const finalPrice = basePrice + gstAmount;
                        return {
                            ...product,
                            effectivePrice: finalPrice,
                            price: basePrice,
                            gstRate: gstRate,
                            gstAmount: gstAmount,
                            finalPrice: finalPrice,
                        };
                    }
                });

                const productsWithPrices = await Promise.all(productsWithPricesPromises);
                setProducts(productsWithPrices);
                console.log("Products with prices and GST for customer:", productsWithPrices);
            } catch (promiseAllError) {
                console.error("Error fetching prices:", promiseAllError);
                setError("Error fetching product prices.");
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        if (filtered.length > 0) {
            setLoading(true);
            setError(null);
            await fetchPricesForFilteredProducts();
        } else {
            setProducts([]);
            setLoading(false);
        }
    }, [searchQuery, selectedCategory, selectedBrand, allProducts, adminCustomerId, currentCustomerId, ipAddress]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            setError(null);
            const userAuthToken = await checkTokenAndRedirect(navigation);

            const response = await axios.get(`http://${ipAddress}:8090/products`, {
                headers: {
                    Authorization: `Bearer ${userAuthToken}`,
                    "Content-Type": "application/json",
                },
            });

            const fetchedProducts = response.data;
            setAllProducts(fetchedProducts);
            console.log("Fetched Products Data:", fetchedProducts);

            const productCategories = [...new Set(fetchedProducts.map((product) => product.category).filter(Boolean))];
            setCategories(productCategories);

            const productBrands = [...new Set(fetchedProducts.map((product) => product.brand).filter(Boolean))];
            setBrands(productBrands);
        } catch (fetchErr) {
            console.error("Error fetching products:", fetchErr);
            setError("Failed to fetch products. Please check your network and try again.");
            setProducts([]);
            setAllProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isVisible) {
            fetchAssignedUsers(); // Fetch assigned users when modal opens
            fetchProducts();
        } else {
            setSearchQuery("");
            setSelectedCategory("");
            setSelectedBrand("");
            setProducts([]);
            setError(null);
            setAdminCustomerId(null);
        }
    }, [isVisible, currentCustomerId]);

    useEffect(() => {
        if (isVisible && allProducts.length > 0 && adminCustomerId) {
            filterProducts();
        }
    }, [isVisible, searchQuery, selectedCategory, selectedBrand, allProducts, adminCustomerId, filterProducts]);

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalBackground}>
                <View style={styles.modalContainer}>
                    <View style={styles.categoryFilterContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {categories.map((category) => (
                                <TouchableOpacity
                                    key={category}
                                    style={[
                                        styles.categoryButton,
                                        selectedCategory === category && styles.selectedCategoryButton,
                                    ]}
                                    onPress={() => {
                                        setSelectedCategory(selectedCategory === category ? "" : category);
                                        setSearchQuery("");
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.categoryButtonText,
                                            selectedCategory === category && styles.selectedCategoryButtonText,
                                        ]}
                                    >
                                        {category}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.brandFilterContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {brands.map((brand) => (
                                <TouchableOpacity
                                    key={brand}
                                    style={[
                                        styles.brandButton,
                                        selectedBrand === brand && styles.selectedBrandButton,
                                    ]}
                                    onPress={() => {
                                        setSelectedBrand(selectedBrand === brand ? "" : brand);
                                        setSearchQuery("");
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.brandButtonText,
                                            selectedBrand === brand && styles.selectedBrandButtonText,
                                        ]}
                                    >
                                        {brand}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search products (3+ chars)..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="black" />
                        </TouchableOpacity>
                    </View>

                    {loading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#ffcc00" />
                        </View>
                    )}

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <FlatList
                        data={products}
                        renderItem={({ item }) => (
                            <View style={styles.productItem}>
                                <View style={styles.productInfo}>
                                    <Text style={styles.productName}>{item.name}</Text>
                                    <Text style={styles.productDetails}>
                                        {item.category} | {item.brand} |
                                        <Text style={styles.price}> ₹{item.finalPrice ? item.finalPrice.toFixed(2) : 'N/A'}</Text>
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => {
                                        console.log("Adding product:", item);
                                        console.log("Product being added with price:", item.finalPrice);
                                        onAddProduct({
                                            ...item,
                                            price: item.finalPrice,
                                        });
                                    }}
                                >
                                    <Ionicons name="add" size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}
                        keyExtractor={(item, index) => `${item.id}-${index}`}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>
                                {searchQuery.length > 2
                                    ? "No products found matching your criteria."
                                    : "Please type at least 3 characters to search products or select category/brand."}
                            </Text>
                        }
                    />
                </View>
            </View>
        </Modal>
    );
};

// Styles remain unchanged
const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        backgroundColor: "white",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: "75%",
        padding: 20,
    },
    categoryFilterContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 10,
    },
    brandFilterContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 10,
    },
    categoryButton: {
        backgroundColor: "#f0f0f0",
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
        marginRight: 5,
        marginBottom: 5,
    },
    selectedCategoryButton: {
        backgroundColor: "#ffcc00",
    },
    categoryButtonText: {
        fontSize: 12,
        color: "#333",
    },
    selectedCategoryButtonText: {
        color: "white",
    },
    brandButton: {
        backgroundColor: "#f0f0f0",
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
        marginRight: 5,
        marginBottom: 5,
    },
    selectedBrandButton: {
        backgroundColor: "#ffcc00",
    },
    brandButtonText: {
        fontSize: 12,
        color: "#333",
    },
    selectedBrandButtonText: {
        color: "white",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 10,
        height: 40,
    },
    closeButton: {
        marginLeft: 10,
    },
    productItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomColor: "#ccc",
        borderBottomWidth: 1,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontWeight: "bold",
    },
    price: {
        color: "#ff6347",
    },
    productDetails: {
        fontSize: 12,
        color: "#777",
    },
    addButton: {
        backgroundColor: "#ffcc00",
        padding: 10,
        borderRadius: 20,
    },
    emptyText: {
        textAlign: "center",
        marginTop: 20,
        fontSize: 16,
        color: "#777",
    },
    errorText: {
        color: "red",
        textAlign: "center",
        marginBottom: 10,
    },
    loadingOverlay: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default SearchProductModalAdmin;