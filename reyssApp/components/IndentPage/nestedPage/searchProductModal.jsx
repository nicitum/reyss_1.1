import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { ipAddress } from "../../../urls";
import { checkTokenAndRedirect } from "../../../services/auth";
import { useNavigation } from "@react-navigation/native";
import LoadingIndicator from "../../general/Loader";

const SearchProductModal = ({ isVisible, onClose, onAddProduct }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigation = useNavigation();

  useEffect(() => {
    if (isVisible) {
      fetchProducts();
    }
  }, [isVisible]);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, selectedBrand, allProducts]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const userAuthToken = await checkTokenAndRedirect(navigation);

      const response = await axios.get(`http://${ipAddress}:8090/products`, {
        headers: {
          Authorization: `Bearer ${userAuthToken}`,
          "Content-Type": "application/json",
        },
      });

      setAllProducts(response.data);
      setProducts(response.data);

      const productCategories = [
        ...new Set(response.data.map((product) => product.category)),
      ];
      setCategories(productCategories);

      const productBrands = [
        ...new Set(response.data.map((product) => product.brand)),
      ];
      setBrands(productBrands);

      setError(null);
    } catch (err) {
      setError("Failed to fetch products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = allProducts;

    if (selectedCategory) {
      filtered = filtered.filter((product) =>
        product.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (selectedBrand) {
      filtered = filtered.filter((product) =>
        product.brand.toLowerCase().includes(selectedBrand.toLowerCase())
      );
    }

    if (searchQuery.length > 2) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setProducts(filtered);
  };

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
                    selectedCategory === category &&
                      styles.selectedCategoryButton,
                  ]}
                  onPress={() => {
                    setSelectedCategory(
                      selectedCategory === category ? "" : category
                    );
                    setSearchQuery("");
                  }}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      selectedCategory === category &&
                        styles.selectedCategoryButtonText,
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
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>

          {/* Dark overlay when loading */}
          {loading && <View style={styles.loadingOverlay} />}
          {loading && <LoadingIndicator />}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <FlatList
            data={products}
            renderItem={({ item }) => (
              <View style={styles.productItem}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productDetails}>
                    {" "}
                    {item.category} | {item.brand} |{" "}
                    <Text style={styles.price}>₹{item.discountPrice}</Text>
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => onAddProduct(item)}
                >
                  <Ionicons name="add" size={18} color="white" />
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={(item, index) => index.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {searchQuery.length > 2
                  ? "No products found"
                  : "Type at least 3 characters to search"}
              </Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

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
  },
});

export default SearchProductModal;
