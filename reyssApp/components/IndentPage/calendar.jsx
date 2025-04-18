import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const CalendarComponent = ({ selectedDate, handleDatePress }) => {
    return (
        <View style={styles.container}>
            <Calendar
                onDayPress={handleDatePress} // Directly pass the date press handler without restrictions
                markedDates={{
                    [selectedDate]: {
                        selected: true,
                        selectedColor: styles.theme.selectedDayBackgroundColor,
                        selectedTextColor: styles.theme.selectedDayTextColor,
                    },
                }}
                theme={styles.theme}
                renderArrow={(direction) => (
                    <MaterialIcons
                        name={direction === "left" ? "chevron-left" : "chevron-right"}
                        size={24}
                        color={styles.theme.arrowColor}
                    />
                )}
                dayComponent={({ date, state }) => {
                    const isSelected = date.dateString === selectedDate;

                    return (
                        <View style={styles.dayWrapper}>
                            <TouchableOpacity
                                style={[styles.dayContainer, isSelected && styles.selectedDay]}
                                onPress={() => handleDatePress(date)}
                            >
                                <Text
                                    style={[
                                        styles.dayText,
                                        state === "disabled" && styles.disabledDayText,
                                        isSelected && styles.selectedDayText,
                                    ]}
                                >
                                    {date.day}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        borderColor: '#e0e0e0',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    theme: {
        backgroundColor: '#ffffff',
        calendarBackground: '#ffffff',
        textSectionTitleColor: '#777777',
        dayTextColor: '#333333',
        todayTextColor: '#007bff',
        selectedDayBackgroundColor: '#007bff',
        selectedDayTextColor: '#ffffff',
        monthTextColor: '#333333',
        yearTextColor: '#333333',
        arrowColor: '#007bff',
    },
    dayWrapper: {
        alignItems: "center",
        justifyContent: "center",
    },
    dayContainer: {
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    dayText: {
        fontSize: 16,
        color: "#333",
    },
    selectedDay: {
        backgroundColor: '#007bff',
    },
    selectedDayText: {
        color: "white",
        fontWeight: 'bold',
    },
    disabledDayText: {
        color: "#999999",
    },
});

export default CalendarComponent;