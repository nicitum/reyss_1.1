import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import OrderCard from "./orderCard";
import moment from "moment";
import Toast from "react-native-toast-message";

const showToast = (message) => {
    Toast.show({
        type: "info", // Changed to info to reflect just information
        text1: "Order Information",
        text2: message,
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
        propsOverride: {
            text2Style: { flexWrap: "wrap", width: "100%" },
        },
    });
};

const OrdersList = ({ amOrder, pmOrder, selectedDate, navigation }) => {
    const handleOrderClick = (order, shift) => {
        // Always navigate to PlaceOrderPage
        navigation.navigate("PlaceOrderPage", { order, selectedDate, shift });
        if (order) {
            showToast(`Navigating to existing ${shift} order details for ${moment(selectedDate).format('YYYY-MM-DD')}.`);
        } else {
            showToast(`Navigating to place new ${shift} order for ${moment(selectedDate).format('YYYY-MM-DD')}.`);
        }
    };

    return (
        <>
            <ScrollView style={styles.ordersContainer}>
                <OrderCard shift="AM" order={amOrder} selectedDate={selectedDate} onOrderClick={handleOrderClick} />
                <OrderCard shift="PM" order={pmOrder} selectedDate={selectedDate} onOrderClick={handleOrderClick} />
            </ScrollView>
            <Toast />
        </>
    );
};

const styles = StyleSheet.create({
    ordersContainer: {
        flex: 1,
        padding: 10,
    },
});

export default OrdersList;