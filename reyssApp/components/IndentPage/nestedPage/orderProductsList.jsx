import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";

const OrderProductsList = ({ products, isEditable, onQuantityChange }) => {
  const [modifiedOrder, setModifiedOrder] = useState(null);

  useEffect(() => {
    const loadModifiedOrder = async () => {
      try {
        if (isEditable) {
          // Check if modified order already exists in AsyncStorage
          const storedOrder = await AsyncStorage.getItem("modifiedOrder");
          if (storedOrder) {
            // If exists, use the saved modified order
            const parsedOrder = JSON.parse(storedOrder);
            setModifiedOrder(parsedOrder);
          } else {
            // If not, initialize it with default products and save it in AsyncStorage
            await AsyncStorage.setItem(
              "modifiedOrder",
              JSON.stringify(products)
            );
            setModifiedOrder(products); // Set modified order with default products
          }
        } else {
          // When not editable, clear modified order to show default products
          setModifiedOrder(null);
        }
      } catch (error) {
        console.error("Error loading modifiedOrder from AsyncStorage:", error);
      }
    };

    loadModifiedOrder();
  }, [isEditable, products]);

  const handleRemoveProduct = async (productToRemove) => {
    try {
      const updatedProducts = modifiedOrder.filter(
        (product) => product.product_id !== productToRemove.product_id
      );

      // Update state first
      setModifiedOrder(updatedProducts);

      // Then update AsyncStorage
      await AsyncStorage.setItem(
        "modifiedOrder",
        JSON.stringify(updatedProducts)
      );
    } catch (error) {
      console.error("Error removing product:", error);
      Alert.alert("Error", "Could not remove product");
    }
  };

  // Always use products (default order) when not editable
  // Use modifiedOrder only when editable and it exists
  const currentProducts = isEditable ? modifiedOrder || products : products;

  const renderItem = ({ item, index }) => (
    <View style={styles.itemRow}>
      <Text style={[styles.itemText, { flex: 6 }]}>{item.name}</Text>

      {isEditable ? (
        <View style={styles.editableQuantityContainer}>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={String(item.quantity)}
            onChangeText={(text) => onQuantityChange(text, index)}
          />
          <Text style={styles.pktsText}> pkts</Text>
        </View>
      ) : (
        <Text style={[styles.itemText, { flex: 2 }]}>{item.quantity} pkts</Text>
      )}

      {isEditable && (
        <TouchableOpacity
          onPress={() => handleRemoveProduct(item)}
          style={styles.removeButton}
        >
          <Icon name="delete" size={16} color="red" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.orderListContainer}>
      <View style={styles.itemHeaderRow}>
        <Text style={[styles.itemHeaderText, { flex: 6 }]}>Item</Text>
        <Text style={[styles.itemHeaderText, { flex: 2 }]}>Qty</Text>
      </View>
      <FlatList
        data={currentProducts}
        renderItem={renderItem}
        keyExtractor={(item) => item.product_id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  orderListContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    margin: 10,
  },
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  itemHeaderText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    alignItems: "center",
  },
  itemText: {
    fontSize: 14,
  },
  editableQuantityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    textAlign: "center",
    paddingVertical: 3,
    paddingHorizontal: 3,
    width: 30,
    marginRight: 5,
  },
  pktsText: {
    fontSize: 14,
  },
  removeButton: {
    padding: 5,
  },
});

export default OrderProductsList;