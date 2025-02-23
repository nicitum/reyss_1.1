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




router.get("/order-by-date-shift", async (req, res) => {
    try {
        const { customerId, orderDate, orderType } = req.query;

        // Validate input
        if (!customerId || !orderDate || !orderType) {
            return res.status(400).json({ message: "customerId, orderDate, and orderType are required" });
        }

        // **Corrected SQL Query for INTEGER timestamp - Use FROM_UNIXTIME**
        // CONVERT_TZ is added to handle potential timezone differences, converting to 'UTC' for consistency.
        const query = `
            SELECT *
            FROM orders
            WHERE customer_id = ?
              AND DATE(CONVERT_TZ(FROM_UNIXTIME(placed_on), '+00:00', '+00:00')) = STR_TO_DATE(?, '%Y-%d-%m')
              AND order_type = ?
        `;
        const values = [customerId, orderDate, orderType];

        // Execute the query using await executeQuery
        const results = await executeQuery(query, values); // AWAIT the result

        if (results && results.length > 0) {
            // Order found - return the first result
            return res.status(200).json(results[0]);
        } else {
            // No order found
            return res.status(404).json({ message: "Order not found" });
        }

    } catch (error) { // Error handling using try...catch - simplified and cleaner
        console.error("Error fetching order by date and shift:", error);
        return res.status(500).json({ message: "Internal server error", error: error });
    }
});



router.get("/order-products", async (req, res) => { // <-- GET request, path: /order-products (now expects orderId as query parameter)
    try {
        const { orderId } = req.query; // Extract orderId from query parameters

        // Validate input - check if orderId is provided
        if (!orderId) {
            return res.status(400).json({ message: "orderId is required as a query parameter" });
        }

        // SQL query - fetch product details for a specific orderId
        const queryStatement = `
            SELECT
                order_id,
                product_id,
                quantity,
                price,
                name,
                category
            FROM
                order_products
            WHERE
                order_id = ?  -- Filter by orderId
        `;
        const params = [orderId]; // Parameter array with orderId

        // Execute the query using executeQuery
        const results = await executeQuery(queryStatement, params); // AWAIT the result

        if (results && results.length > 0) {
            // Products found for the given orderId - format and return
            const productList = results.map(row => ({
                order_id: row.order_id,
                product_id: row.product_id,
                quantity: row.quantity,
                price: row.price,
                name: row.name,
                category: row.category
            }));
            return res.status(200).json(productList);
        } else {
            // No products found for the given orderId
            return res.status(404).json({ message: "No products found for orderId: " + orderId });
        }

    } catch (error) { // Error handling
        console.error("Error fetching order products for orderId:", error);
        return res.status(500).json({ message: "Internal server error", error: error });
    }
});



// API to fetch the most recent order for a specific customer and order type
router.get("/most-recent-order", async (req, res) => {
    try {
        const { customerId, orderType } = req.query;

        if (!customerId || !orderType) {
            return res.status(400).json({ success: false, message: "Customer ID and Order Type are required" });
        }

        if (orderType !== 'AM' && orderType !== 'PM') {
            return res.status(400).json({ success: false, message: "Invalid Order Type. Must be 'AM' or 'PM'" });
        }

        // SQL Query to fetch the most recent order
        const query = `
            SELECT *
            FROM orders
            WHERE customer_id = ? AND order_type = ?
            ORDER BY placed_on DESC
            LIMIT 1;
        `;

        const recentOrder = await executeQuery(query, [customerId, orderType]);

        if (recentOrder && recentOrder.length > 0) {
            // Order found
            res.json({ success: true, order: recentOrder[0] }); // Return the first (most recent) order
        } else {
            // No order found
            res.json({ success: true, order: null, message: "No previous orders found for this customer and order type" });
        }

    } catch (error) {
        console.error("Error fetching most recent order:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
});



// --- 1. DELETE Order Product (New Endpoint for immediate deletion) ---
router.delete("/delete_order_product/:orderProductId", async (req, res) => {
    try {
        const { orderProductId } = req.params; // Extract orderProductId from URL params

        if (!orderProductId) {
            return res.status(400).json({ success: false, message: "Order Product ID is required" });
        }

        const deleteOrderProductQuery = `DELETE FROM order_products WHERE product_id = ?`; // **Crucially: WHERE order_id = ?**
        const deleteResult = await executeQuery(deleteOrderProductQuery, [orderProductId]);

        if (deleteResult.affectedRows > 0) {
            console.log(`Deleted order_product with ID: ${orderProductId}`);
            res.json({ success: true, message: "Order product deleted successfully" });
        } else {
            res.status(404).json({ success: false, message: "Order product not found or already deleted" });
        }

    } catch (error) {
        console.error("Error deleting order product:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error });
    }
});


// --- 2. POST /order_update (Modified - Quantity Updates Only, Total Amount Update) ---
router.post("/order_update", async (req, res) => {
    try {
        const { orderId, products, totalAmount } = req.body;

        // Input validation (orderId, products array, totalAmount) -  (No change in validation)
        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required" });
        }
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ success: false, message: "Products array is required" });
        }
        if (totalAmount === undefined || totalAmount === null) {
            return res.status(400).json({ success: false, message: "Total amount is required" });
        }


        // **Database Update Logic (Quantity and Price Updates Only)**
        for (const product of products) {
            const { order_id, quantity, price } = product; // **Crucially: expects 'order_id' in product**

            if (!order_id) { // o
                return res.status(400).json({ success: false, message: "order_product_id is required for product updates" }); // Message is a bit misleading, but API expects order_id
            }

            const updateProductQuery = `
                UPDATE order_products
                SET quantity = ?, price = ?
                WHERE order_id = ?
            `;
            await executeQuery(updateProductQuery, [quantity, price, order_id]);
        }


        // 3. Update total_amount in the orders table (No change)
        const updateOrderTotalAmountQuery = `
            UPDATE orders
            SET total_amount = ?
            WHERE id = ?
        `;
        await executeQuery(updateOrderTotalAmountQuery, [totalAmount, orderId]);

        res.json({ success: true, message: "Order products and total amount updated successfully" });

    } catch (error) {
        console.error("Error updating order products and total amount:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error });
    }
});


// --- 3. DELETE Order (Endpoint to delete the entire order - No Change) ---
router.delete("/delete_order/:orderId", async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required" });
        }

        const deleteOrderQuery = `DELETE FROM orders WHERE id = ?`;
        const deleteResult = await executeQuery(deleteOrderQuery, [orderId]);

        if (deleteResult.affectedRows > 0) {
            console.log(`Deleted order with ID: ${orderId}`);
            res.json({ success: true, message: "Order deleted successfully for order ID: " + orderId });
        } else {
            res.status(404).json({ success: false, message: "Order not found or already deleted" });
        }

    } catch (error) {
        console.error("Error deleting order:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error });
    }
});

// --- 2. ADD Product to Order (New Endpoint) ---
router.post("/add-product-to-order", async (req, res) => {
    try {
        const { orderId, productId, quantity, price, name , category } = req.body;

        // --- Input Validation ---
        if (!orderId || !productId || quantity === undefined || price === undefined) {
            return res.status(400).json({ success: false, message: "Missing required fields: orderId, productId, quantity, and price are required." });
        }
        if (isNaN(orderId) || isNaN(productId) || isNaN(quantity) || isNaN(price) || quantity <= 0 || price < 0) {
            return res.status(400).json({ success: false, message: "Invalid data types: orderId and productId must be numbers, quantity must be a positive number, and price must be a non-negative number." });
        }

        // --- Check if Order and Product Exist (Optional but recommended for data integrity) ---
        const orderExistsQuery = `SELECT id FROM orders WHERE id = ?`;
        const productExistsQuery = `SELECT id FROM products WHERE id = ?`;

        const orderExistsResult = await executeQuery(orderExistsQuery, [orderId]);
        if (orderExistsResult.length === 0) {
            return res.status(400).json({ success: false, message: `Order with ID ${orderId} not found.` });
        }

        const productExistsResult = await executeQuery(productExistsQuery, [productId]);
        if (productExistsResult.length === 0) {
            return res.status(400).json({ success: false, message: `Product with ID ${productId} not found.` });
        }


        // --- Check if the product is already in the order ---
        const productAlreadyInOrderQuery = `SELECT * FROM order_products WHERE order_id = ? AND product_id = ?`;
        const productInOrderResult = await executeQuery(productAlreadyInOrderQuery, [orderId, productId]);

        if (productInOrderResult.length > 0) {
            return res.status(409).json({ // 409 Conflict status code
                success: false,
                message: `Product with ID ${productId} is already in order ID ${orderId}. Please update quantity instead.`
            });
        }


        // --- Insert new order_product record ---
        const insertQuery = `
            INSERT INTO order_products (order_id, product_id, quantity, price,name,category)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const insertResult = await executeQuery(insertQuery, [orderId, productId, quantity, price,name,category]);

        if (insertResult.affectedRows > 0) {
            console.log(`Product ID ${productId} added to order ID ${orderId}`);
            res.status(201).json({ // 201 Created - successful creation
                success: true,
                message: "Product added to order successfully",
                newOrderProductId: insertResult.insertId // Optionally return the ID of the newly created order_product record
            });
        } else {
            console.error("Failed to insert product into order");
            res.status(500).json({ success: false, message: "Failed to add product to order" }); // 500 Internal Server Error
        }

    } catch (error) {
        console.error("Error adding product to order:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error }); // 500 Internal Server Error
    }
});

module.exports = router;


  


