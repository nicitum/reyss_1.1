import React, { useState, useEffect } from "react";
import {
  View,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Text,
  ToastAndroid,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import LoadingIndicator from "../general/Loader";
import OrderProductsList from "../IndentPage/nestedPage/orderProductsList";
import BackButton from "../general/backButton";
import SubmitButton from "../IndentPage/nestedPage/submitButton";
import ErrorMessage from "../general/errorMessage";
import SearchProductModal from "../IndentPage/nestedPage/searchProductModal";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const DefaultProductsUpdate = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [defaultOrder, setDefaultOrder] = useState({ products: [] });
  const [showSearchModal, setShowSearchModal] = useState(false);
  const navigation = useNavigation();
  const [editable, setEditable] = useState(true);

  // Load stored order from AsyncStorage
  useEffect(() => {
    const loadModifiedOrder = async () => {
      try {
        const storedOrder = await AsyncStorage.getItem("modifiedOrder");
        if (storedOrder) {
          setDefaultOrder({ products: JSON.parse(storedOrder) });
        }
      } catch (err) {
        console.error("Error loading modified order:", err);
      } finally {
        setLoading(false);
      }
    };

    loadModifiedOrder();
  }, []);

  const showToast = (message, type = "success") => {
    if (Platform.OS === "android") {
      ToastAndroid.showWithGravity(
        type === "success" ? `✅ ${message}` : `❌ ${message}`,
        ToastAndroid.SHORT,
        ToastAndroid.CENTER
      );
    } else {
      Alert.alert(type === "success" ? "Success" : "Error", message);
    }
  };
  

  const handleAddProduct = async (product) => {
    try {
      const storedOrder = await AsyncStorage.getItem("modifiedOrder");
      const currentProducts = storedOrder ? JSON.parse(storedOrder) : defaultOrder?.products || [];
  
      // Prevent duplicate products
      if (currentProducts.some((p) => p.product_id === product.id)) {
        showToast("❌ Product already exists! Increase the quantity instead.", "error");
        return;
      }
  
      const newProduct = {
        category: product.category,
        name: product.name,
        price: product.discountPrice || product.price,
        product_id: product.id,
        quantity: 1,
      };
  
      const updatedProducts = [...currentProducts, newProduct];
  
      setDefaultOrder({ ...defaultOrder, products: updatedProducts });
      await AsyncStorage.setItem("modifiedOrder", JSON.stringify(updatedProducts));
  
      setShowSearchModal(false);
      showToast("✅ Product added successfully!", "success");
    } catch (error) {
      console.error("Error adding product:", error);
      showToast("❌ Could not add product. Please try again.", "error");
    }
  };
  

  // Update quantity in the list
  const handleQuantityChange = async (text, index) => {
    try {
      const storedOrder = await AsyncStorage.getItem("modifiedOrder");
      const currentProducts = storedOrder
        ? JSON.parse(storedOrder)
        : defaultOrder?.products || [];

      const updatedProducts = [...currentProducts];
      const parsedQuantity = parseInt(text, 10);

      updatedProducts[index] = {
        ...updatedProducts[index],
        quantity: isNaN(parsedQuantity) ? 0 : parsedQuantity,
      };

      setDefaultOrder({ ...defaultOrder, products: updatedProducts });
      await AsyncStorage.setItem("modifiedOrder", JSON.stringify(updatedProducts));
    } catch (error) {
      console.error("Error updating quantity:", error);
      Alert.alert("Error", "Could not update quantity.");
    }
  };

  const handleSubmit = async () => {
    try {
      const userAuthToken = await AsyncStorage.getItem("userAuthToken");
      if (!userAuthToken) {
        showToast("❌ Authorization token is missing.", "error");
        return;
      }
  
      const decodedToken = jwtDecode(userAuthToken);
      const customerId = decodedToken.id;
  
      if (!defaultOrder?.products || defaultOrder?.products.length === 0) {
        showToast("❌ No products selected. Please add items.", "error");
        return;
      }
  
      // Remove duplicates before sending to backend
      const uniqueProducts = [];
      const seenProductIds = new Set();
  
      defaultOrder.products.forEach((product) => {
        if (!seenProductIds.has(product.product_id)) {
          seenProductIds.add(product.product_id);
          uniqueProducts.push(product);
        }
      });
  
      const payload = uniqueProducts.map((product) => ({
        customer_id: customerId,
        product_id: product.product_id,
        quantity: product.quantity,
      }));
  
      const response = await axios.post(
        `http://localhost:8090/update-default-order`,
        payload
      );
  
      if (response.status === 201) {
        showToast("✅ Default order updated successfully!", "success");
      } else {
        showToast("❌ Failed to update default order.", "error");
      }
    } catch (error) {
      console.error("Submit error:", error);
      if (error.response) {
        showToast(`❌ ${error.response.data.message || "Server error occurred."}`, "error");
      } else {
        showToast("❌ An error occurred. Please try again.", "error");
      }
    }
  };
  
  

  if (loading) return <LoadingIndicator />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <BackButton navigation={navigation} />
        <Text style={styles.title}>Default Products Update</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => setShowSearchModal(true)}
        >
          <Icon name="search" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <OrderProductsList
        products={defaultOrder?.products || []}
        isEditable={editable}
        onQuantityChange={handleQuantityChange}
      />

      <SubmitButton handleSubmit={handleSubmit} />

      <SearchProductModal
        isVisible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onAddProduct={handleAddProduct}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffcc00",
    paddingTop: 20,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  searchButton: {
    padding: 10,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
    color: "black",
  },
});

export default DefaultProductsUpdate;
