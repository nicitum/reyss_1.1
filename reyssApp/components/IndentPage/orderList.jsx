import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import OrderCard from "./orderCard";
import moment from "moment";
import Toast from "react-native-toast-message";

const showToast = (message, type = "info") => {
    Toast.show({
        type, // "info" for general messages, "error" for restrictions
        text1: type === "info" ? "Order Information" : "Time Restriction",
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
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentDate = moment(currentTime).format("YYYY-MM-DD");
    const isSelectedDateToday = moment(selectedDate).format("YYYY-MM-DD") === currentDate;

    // AM allowed between 6:00 AM and 8:00 AM (6 <= hour < 8)
    const isAMAllowed = isSelectedDateToday
        ? currentHour >= 6 && currentHour < 12
        : true; // Allow AM if not today (no time restriction)

    // PM allowed between 12:00 PM and 4:00 PM (12 <= hour < 16)
    const isPMAllowed = isSelectedDateToday
        ? currentHour >= 12 && currentHour < 16
        : true; // Allow PM if not today (no time restriction)

    const handleOrderClick = (order, shift) => {
        if (shift === "AM" && !isAMAllowed) {
            showToast("AM orders can only be placed between 6:00 AM and 8:00 AM.", "error");
            return;
        }
        if (shift === "PM" && !isPMAllowed) {
            showToast("PM orders can only be placed between 12:00 PM and 4:00 PM.", "error");
            return;
        }

        // Navigate to PlaceOrderPage if time is allowed
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
                {isAMAllowed || !isSelectedDateToday ? (
                    <OrderCard
                        shift="AM"
                        order={amOrder}
                        selectedDate={selectedDate}
                        onOrderClick={handleOrderClick}
                    />
                ) : (
                    <OrderCard
                        shift="AM"
                        order={amOrder}
                        selectedDate={selectedDate}
                        onOrderClick={handleOrderClick}
                        disabled={true} // Pass disabled prop to OrderCard if outside time range
                    />
                )}
                {isPMAllowed || !isSelectedDateToday ? (
                    <OrderCard
                        shift="PM"
                        order={pmOrder}
                        selectedDate={selectedDate}
                        onOrderClick={handleOrderClick}
                    />
                ) : (
                    <OrderCard
                        shift="PM"
                        order={pmOrder}
                        selectedDate={selectedDate}
                        onOrderClick={handleOrderClick}
                        disabled={true} // Pass disabled prop to OrderCard if outside time range
                    />
                )}
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