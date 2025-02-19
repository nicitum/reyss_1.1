const express = require("express");
const router = express.Router();
const { executeQuery } = require("../dbUtils/db");

// API to update order approved_status
router.post("/update-order-status", async (req, res) => {
    try {
        const { id, approve_status } = req.body;

        // Validate input
        if (!id || !approve_status) {
            return res.status(400).json({ message: "id and approved_status are required" });
        }

        // Update query
        const query = "UPDATE orders SET approve_status = ? WHERE id = ?";
        const values = [approve_status, id];

        // Execute the query
        const result = await executeQuery(query, values);

        if (result.affectedRows > 0) {
            return res.status(200).json({ message: "Order status updated successfully" });
        } else {
            return res.status(404).json({ message: "Order not found" });
        }
    } catch (error) {
        console.error("Error updating order status:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});




router.post("/update-delivery-status", async (req, res) => {
    try {
        const { customer_id, delivery_status } = req.body;

        if (!customer_id || !delivery_status) {
            return res.status(400).json({ status: false, message: "Customer ID and delivery status are required" });
        }

        if (!["pending", "delivered"].includes(delivery_status.toLowerCase())) {
            return res.status(400).json({ status: false, message: "Invalid delivery status" });
        }

        // Fetch the latest order_id first
        const fetchQuery = "SELECT id FROM orders WHERE customer_id = ? ORDER BY id DESC LIMIT 1";
        const fetchResult = await executeQuery(fetchQuery, [customer_id]);

        if (fetchResult.length === 0) {
            return res.status(404).json({ status: false, message: "No orders found for the customer" });
        }

        const latestOrderId = fetchResult[0].id;

        // Update the delivery status for this order
        const updateQuery = "UPDATE orders SET delivery_status = ? WHERE id = ?";
        const updateValues = [delivery_status.toLowerCase(), latestOrderId];
        const updateResult = await executeQuery(updateQuery, updateValues);

        if (updateResult.affectedRows > 0) {
            return res.json({
                status: true,
                message: "Delivery status updated successfully",
                order_id: latestOrderId
            });
        } else {
            return res.status(500).json({ status: false, message: "Failed to update delivery status" });
        }
    } catch (error) {
        console.error("Error updating delivery status:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
});



router.get("/get-orders/:customer_id", async (req, res) => {
    try {
        const { customer_id } = req.params;

        if (!customer_id) {
            return res.status(400).json({ status: false, message: "Customer ID is required" });
        }

        const fetchQuery = "SELECT id, delivery_status FROM orders WHERE customer_id = ? ORDER BY id DESC";
        const fetchResult = await executeQuery(fetchQuery, [customer_id]);

        if (fetchResult.length > 0) {
            return res.json({ status: true, orders: fetchResult });
        } else {
            return res.json({ status: true, orders: [] });
        }
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
});


module.exports = router;


  


