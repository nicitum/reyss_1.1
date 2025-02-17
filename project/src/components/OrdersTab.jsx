import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getOrders } from "../services/api";
import { Calendar, Filter, ArrowUpDown } from "lucide-react";
import { formatEpochTime } from "../utils/dateUtils";
import ExportOrdersButton from "./ExportOrdersButton";

export default function OrdersTab() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [orders, setOrders] = useState([]);
  const [sortBy, setSortBy] = useState("date");
  const [filterStatus, setFilterStatus] = useState("all");

  const formatDateToIST = (date) => {
    const inputDate = date ? new Date(date) : new Date();
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const ISTDate = new Date(inputDate.getTime() + IST_OFFSET_MS);
    return ISTDate.toISOString().split("T")[0];
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getOrders(formatDateToIST(selectedDate));
        setOrders(data.orders);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      }
    };
    fetchOrders();
  }, [selectedDate]);

  const filteredOrders = orders.sort((a, b) => {
    if (sortBy === "date") {
      return b.placed_on - a.placed_on;
    }
    return b.total_amount - a.total_amount;
  });

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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Calendar className="h-5 w-5 text-gray-500" />
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-2xl font-bold">
          Total Orders: {filteredOrders.length}
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center">
          <Filter className="h-5 w-5 text-gray-500 mr-2" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex items-center">
          <ArrowUpDown className="h-5 w-5 text-gray-500 mr-2" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="date">Sort by Date</option>
            <option value="total">Sort by Total</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg mb-4">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer Paid
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Indent Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatEpochTime(order.placed_on)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${
                      order.delivery_status === "delivered"
                        ? "bg-green-100 text-green-800"
                        : order.delivery_status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {order.delivery_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₹{order.total_amount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₹{order.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ExportOrdersButton filteredOrders={filteredOrders} selectedDate={selectedDate} />
    </div>
  );
}
