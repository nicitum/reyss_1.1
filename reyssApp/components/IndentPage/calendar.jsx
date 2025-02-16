import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const CalendarComponent = ({
  selectedDate,
  handleDatePress,
  dayOrderQuantity,
}) => {
  return (
    <Calendar
      onDayPress={handleDatePress}
      markedDates={{
        [selectedDate]: {
          selected: true,
          customText: dayOrderQuantity[selectedDate],
        },
      }}
      theme={{
        selectedDayBackgroundColor: "#ffcc00",
        todayTextColor: "#ffcc00",
        arrowColor: "#ffcc00",
      }}
      renderArrow={(direction) => (
        <MaterialIcons
          name={direction === "left" ? "arrow-back" : "arrow-forward"}
          size={24}
          color="#ffcc00"
        />
      )}
      dayComponent={({ date, state }) => {
        const customText = dayOrderQuantity[date.dateString] || "0";
        const isSelected = date.dateString === selectedDate;
        const isToday = state === "today";

        return (
          <View style={styles.dayWrapper}>
            {customText && (
              <Text
                style={[
                  styles.customText,
                  isSelected && styles.selectedCustomText,
                ]}
              >
                {customText}
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.dayContainer,
                isSelected && styles.selectedDay,
                isToday && styles.todayDay,
              ]}
              onPress={() => handleDatePress(date)}
            >
              <Text
                style={[
                  styles.dayText,
                  state === "disabled" && styles.disabledDayText,
                  isSelected && styles.selectedDayText,
                  isToday && styles.todayDayText,
                ]}
              >
                {date.day}
              </Text>
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  dayWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  dayContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 18,
    color: "black",
  },
  selectedDay: {
    backgroundColor: "#ffcc00",
    borderRadius: 16,
    width: 32,
    height: 32,
  },
  selectedDayText: {
    color: "white",
  },
  todayDay: {
    borderColor: "#ffcc00",
    borderWidth: 2,
    borderRadius: 16,
    width: 32,
    height: 32,
  },
  disabledDayText: {
    color: "gray",
  },
  customText: {
    fontSize: 12,
    color: "red",
  },
  selectedCustomText: {
    color: "red",
  },
});

export default CalendarComponent;
