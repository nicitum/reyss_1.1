import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { ipAddress } from "../../urls";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";

const ProductsComponent = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`http://${ipAddress}:8090/products`);
      const data = await response.json();
      if (response.ok) {
        setProducts(data);
        setFilteredProducts(data);
        setBrands([...new Set(data.map((product) => product.brand))]);
        setCategories([...new Set(data.map((product) => product.category))]);
      } else {
        Alert.alert("Error", "Failed to fetch products");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      Alert.alert("Error", "An error occurred while fetching products");
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }

    if (selectedBrand) {
      filtered = filtered.filter((product) => product.brand === selectedBrand);
    }

    setFilteredProducts(filtered);
  };

  // Handle category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  // Handle brand selection
  const handleBrandSelect = (brand) => {
    setSelectedBrand(brand === selectedBrand ? "" : brand);
  };

  // Filter products whenever search term, category, or brand changes
  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, selectedBrand]);

  // Render each product
  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productDetails}>Category: {item.category}</Text>
      <Text style={styles.productDetails}>Brand: {item.brand}</Text>
      <View style={styles.priceContainer}>
        <Text style={styles.productPrice}>₹{item.price}</Text>
      </View>
    </View>
  );

  // Group products into pairs of two for each row
  const renderProductsRow = ({ item }) => (
    <View style={styles.productRow}>
      {item.map((product, index) => (
        <View style={styles.productCardWrapper} key={index}>
          {product ? (
            renderProduct({ item: product })
          ) : (
            <View style={styles.emptyProductCard} />
          )}
        </View>
      ))}
    </View>
  );

  const groupProductsInRows = (productsArray) => {
    const rows = [];
    for (let i = 0; i < productsArray.length; i += 2) {
      const row = productsArray.slice(i, i + 2);
      if (row.length === 1) {
        row.push(null);
      }
      rows.push(row);
    }
    return rows;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Search input */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search products..."
        value={searchTerm}
        onChangeText={setSearchTerm}
      />

      {/* Category Filters */}
      <View style={styles.categoriesContainer}>
        <View style={styles.categoriesList}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.selectedCategory,
              ]}
              onPress={() => handleCategorySelect(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.selectedCategoryText,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Brand Filters */}
      <View style={styles.brandsContainer}>
        <View style={styles.brandsList}>
          {brands.map((brand) => (
            <TouchableOpacity
              key={brand}
              style={[
                styles.brandButton,
                selectedBrand === brand && styles.selectedBrand,
              ]}
              onPress={() => handleBrandSelect(brand)}
            >
              <Text
                style={[
                  styles.brandText,
                  selectedBrand === brand && styles.selectedBrandText,
                ]}
              >
                {brand}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Products List */}
      {filteredProducts.length > 0 ? (
        <FlatList
          data={groupProductsInRows(filteredProducts)}
          renderItem={renderProductsRow}
          keyExtractor={(item, index) => index.toString()}
          style={styles.productsList}
        />
      ) : (
        <Text style={styles.noProductsText}>No products found</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f0f0f0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 10,
  },
  searchInput: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  categoriesList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  categoryButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#ffcc00",
    marginRight: 8,
    marginBottom: 8,
  },
  selectedCategory: {
    backgroundColor: "#ff9900",
  },
  categoryText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
  },
  selectedCategoryText: {
    color: "#333",
  },
  brandsList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  brandButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#ffcc00",
    marginRight: 8,
    marginBottom: 8,
  },
  selectedBrand: {
    backgroundColor: "#ff9900",
  },
  brandText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
  },
  selectedBrandText: {
    color: "#333",
  },
  productsList: {
    flexGrow: 1,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  productCardWrapper: {
    flex: 1,
    marginRight: 8,
  },
  productCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  productDetails: {
    fontSize: 14,
    color: "#666",
  },
  priceContainer: {
    marginTop: 8,
    backgroundColor: "#ffcc00",
    padding: 5,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  noProductsText: {
    textAlign: "center",
    fontSize: 18,
    color: "#999",
  },
  emptyProductCard: {
    flex: 1, // Ensures it takes up space but remains invisible
  },
});

export default ProductsComponent;
