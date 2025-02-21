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


router.post("/update-default-order", async (req, res) => {
    try {
        const orders = req.body;

        if (!Array.isArray(orders)) {
            return res.status(400).json({ message: "Invalid request format. Expected an array of objects." });
        }

        // Get customer_id (If no products, use first product's customer_id)
        const customerId = orders.length > 0 ? orders[0].customer_id : req.body.customer_id;

        if (!customerId) {
            return res.status(400).json({ message: "Missing customer ID in request." });
        }

        // 🔴 Always delete existing orders first
        const deleteQuery = `DELETE FROM default_orders WHERE customer_id = ?`;
        await executeQuery(deleteQuery, [customerId]);

        // 🛑 If no new products, return after deletion
        if (orders.length === 0) {
            return res.status(200).json({ message: "All default orders cleared successfully." });
        }

        const createdAt = Math.floor(Date.now() / 1000);
        const updatedAt = createdAt;

        // Prepare new values for insertion
        const values = orders.map(order => [
            order.customer_id,
            order.product_id,
            order.quantity,
            createdAt,
            updatedAt
        ]);

        const insertQuery = `
            INSERT INTO default_orders (customer_id, product_id, quantity, created_at, updated_at)
            VALUES ?;
        `;

        const result = await executeQuery(insertQuery, [values]);

        if (result.affectedRows > 0) {
            return res.status(201).json({ message: "Default orders updated successfully." });
        } else {
            return res.status(500).json({ message: "Failed to update default orders." });
        }

    } catch (error) {
        console.error("Error updating default order:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});


  

router.get("/get-default-order/:customer_id", async (req, res) => {
    try {
        const { customer_id } = req.params;

        if (!customer_id) {
            return res.status(400).json({ status: false, message: "Customer ID is required" });
        }

        // Fetch default orders + calculate total amount
        const fetchQuery = `
            SELECT d.id, 
                   d.product_id, 
                   p.name AS product_name, 
                   d.quantity, 
                   (d.quantity * p.price) AS total_amount
            FROM default_orders d
            JOIN products p ON d.product_id = p.id
            WHERE d.customer_id = ? 
            ORDER BY d.id DESC;
        `;

        const fetchResult = await executeQuery(fetchQuery, [customer_id]);

        console.log("✅ Default Orders Fetched:", fetchResult); // Debugging log

        if (fetchResult.length > 0) {
            return res.json({ status: true, default_orders: fetchResult });
        } else {
            return res.json({ status: true, default_orders: [] });
        }
    } catch (error) {
        console.error("❌ Error fetching default orders:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
});



// API to fetch orders for a specific admin with total indent amount
router.get("/get-admin-orders/:admin_id", async (req, res) => {
    try {
        const { admin_id } = req.params;

        if (!admin_id) {
            return res.status(400).json({ success: false, message: "Admin ID is required" });
        }

        // Updated SQL Query to fetch orders along with total indent amount
        const query = `
            SELECT o.*, 
                   SUM(op.price * op.quantity) AS amount 
            FROM orders o
            JOIN admin_assign a ON o.customer_id = a.cust_id
            LEFT JOIN order_products op ON o.id = op.order_id
            WHERE a.admin_id = ?
            GROUP BY o.id;
        `;

        const orders = await executeQuery(query, [admin_id]);

        res.json({ success: true, orders });

    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});



module.exports = router;


  


