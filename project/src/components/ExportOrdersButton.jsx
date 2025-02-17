import React from "react";
import * as XLSX from "xlsx";

// Format the date to IST (Indian Standard Time)
const formatDateToIST = (date) => {
  const options = { year: "numeric", month: "numeric", day: "numeric" };
  return new Date(date).toLocaleDateString("en-IN", options);
};

const ExportOrdersButton = ({ filteredOrders, selectedDate }) => {
  const handleSendOrders = async () => {
    // Generate the filename based on the selectedDate
    const fileName = `orders_${formatDateToIST(selectedDate)}.xlsx`;

    try {
      // Convert the filteredOrders data into a worksheet format
      const ws = XLSX.utils.json_to_sheet(filteredOrders);

      // Create a new workbook and append the worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orders");

      // Write the workbook to a file with the dynamic filename
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  };

  return (
    <button
      onClick={handleSendOrders}
      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none"
    >
      Export Orders
    </button>
  );
};

export default ExportOrdersButton;
