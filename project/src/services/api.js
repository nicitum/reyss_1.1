import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8090",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (username, password) => {
  const response = await api.post("/auth", { username, password });
  return response.data;
};

export const getOrders = async (date) => {
  const response = await api.get(`/allOrders?date=${date}`);
  return response.data.data;
};

export const getUsers = async (search) => {
  const response = await api.get(
    `/allUsers${search ? `?search=${search}` : ""}`
  );
  return response.data.data;
};

export const addUser = async (userDetails) => {
  const response = await api.post(`/addUser`, userDetails);
  return response.data.data;
};

export const updateUser = async (userId, userData) => {
  const response = await api.post(`/update?customer_id=${userId}`, userData);
  return response.data.data;
};

export const toggleUserBlock = async (userId, status) => {
  const response = await api.post(`/update?customer_id=${userId}`, { status });
  return response.data.data;
};

export const getPayments = async () => {
  const response = await api.get("/payments");
  return response.data.data;
};

export const getProducts = async () => {
  const response = await api.get("/products");
  return response.data;
};

export const addProduct = async (productData) => {
  const response = await api.post("/newItem", productData);
  return response.data;
};

export const updateProduct = async (productId, productData) => {
  const response = await api.post(`/editProd?id=${productId}`, productData);
  return response.data;
};

export const updateProductsByBrand = async (brand, updateData) => {
  const response = await api.patch(`/products/brand/${brand}`, updateData);
  return response.data;
};
