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

        // Update query with conditional altered status
        const query = "UPDATE orders SET approve_status = ?, altered = CASE WHEN ? = 'Accepted' THEN 'No' ELSE altered END WHERE id = ?";
        const values = [approve_status, approve_status, id];

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
        // **Correctly extract order_id from req.body**
        const { customer_id, delivery_status, order_id } = req.body;

        if (!customer_id || !delivery_status || !order_id) { // **Added check for order_id**
            return res.status(400).json({ status: false, message: "Customer ID, order ID, and delivery status are required" }); // **Updated message**
        }

        if (!["pending", "delivered"].includes(delivery_status.toLowerCase())) {
            return res.status(400).json({ status: false, message: "Invalid delivery status" });
        }

        // **Update the delivery status for the SPECIFIC order ID from the request**
        const updateQuery = "UPDATE orders SET delivery_status = ? WHERE id = ?"; // **WHERE id = ? is now correct for order_id**
        const updateValues = [delivery_status.toLowerCase(), order_id]; // **Using order_id from request!**
        const updateResult = await executeQuery(updateQuery, updateValues);

        if (updateResult.affectedRows > 0) {
            return res.json({
                status: true,
                message: "Delivery status updated successfully",
                order_id: order_id // **Returning the CORRECT order_id that was updated**
            });
        } else {
            return res.status(404).json({ status: false, message: "Order not found or failed to update", order_id: order_id }); // **Return order_id in error response too**
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

        const fetchQuery = "SELECT id,total_amount,customer_id,delivery_status,approve_status,cancelled,placed_on FROM orders WHERE customer_id = ? ORDER BY id DESC";
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
            WHERE customer_id = ?  
            AND order_type = ?  
            ORDER BY FROM_UNIXTIME(placed_on) DESC  
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


// --- 2. POST /order_update (Modified with cancellation and altered status logic) ---
router.post("/order_update", async (req, res) => {
    try {
        const { orderId, products, totalAmount } = req.body;

        // Input validation
        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required" });
        }
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ success: false, message: "Products array is required" });
        }
        if (totalAmount === undefined || totalAmount === null) {
            return res.status(400).json({ success: false, message: "Total amount is required" });
        }

        // First check if any products exist for this order
        const checkProductsQuery = `
            SELECT COUNT(*) as count 
            FROM order_products 
            WHERE order_id = ?
        `;
        const [productCount] = await executeQuery(checkProductsQuery, [orderId]);
        
        // Set cancelled status based on products existence
        const cancelledStatus = (products.length === 0 || productCount.count === 0) ? 'Yes' : 'No';

        // Update order products if there are any
        if (products.length > 0) {
            for (const product of products) {
                const { order_id, quantity, price, is_new } = product;
                if (!order_id) {
                    return res.status(400).json({ success: false, message: "order_product_id is required for product updates" });
                }

                // Get current quantity for existing products
                let currentQuantity = 0;
                if (!is_new) {
                    const currentProductQuery = `SELECT quantity FROM order_products WHERE order_id = ? AND product_id = ?`;
                    const currentProduct = await executeQuery(currentProductQuery, [order_id, product.product_id]);
                    if (currentProduct.length > 0) {
                        currentQuantity = currentProduct[0].quantity;
                    }
                }

                if (is_new) {
                    const insertProductQuery = `
                        INSERT INTO order_products (order_id, product_id, quantity, price, name, category, altered)
                        VALUES (?, ?, ?, ?, ?, ?, 'No')
                    `;
                    await executeQuery(insertProductQuery, [orderId, product.product_id, quantity, price, product.name, product.category]);
                } else {
                    // Calculate the actual quantity difference
                    const quantityDifference = quantity - currentQuantity;
                    const quantityChange = quantityDifference !== 0 ? quantityDifference.toString() : null;
                    
                    const updateProductQuery = `
                        UPDATE order_products
                        SET quantity = ?, 
                            price = ?,
                            altered = ?,
                            quantity_change = ?
                        WHERE order_id = ? AND product_id = ?
                    `;
                    
                    let alteredStatus = currentQuantity !== quantity ? 'Yes' : 'No';
                    await executeQuery(updateProductQuery, [
                        quantity, 
                        price, 
                        alteredStatus,
                        quantityChange,
                        orderId, 
                        product.product_id
                    ]);
                }
            }
        }

        // Update total amount and cancelled status in orders table
        const updateOrderQuery = `
            UPDATE orders
            SET total_amount = ?,
                cancelled = ?,
                altered = 'Yes'
            WHERE id = ?
        `;
        await executeQuery(updateOrderQuery, [totalAmount, cancelledStatus, orderId]);

        res.json({ 
            success: true, 
            message: `Order updated successfully. Status: ${cancelledStatus}`,
            cancelled: cancelledStatus
        });

    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error });
    }
});




// --- 3. CANCEL Order (Endpoint to cancel the order - Modified from DELETE) ---
router.post("/cancel_order/:orderId", async (req, res) => { // Changed to POST
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required" });
        }

        // SQL query to DELETE from order_products table to remove product details
        const cancelOrderProductsQuery = `
            DELETE FROM order_products
            WHERE order_id = ?
        `;

        // Execute the query to cancel order products (DELETE instead of UPDATE)
        const cancelProductsResult = await executeQuery(cancelOrderProductsQuery, [orderId]);
        console.log("Order Products Cancel Result:", cancelProductsResult);

        // SQL query to update orders table to set total_amount to 0 and cancelled to 'Yes'
        const cancelOrdersTableQuery = `
            UPDATE orders
            SET total_amount = 0.0,
            cancelled = 'Yes'
            WHERE id = ?
        `;


        // Execute the query to cancel order in orders table
        const cancelOrdersResult = await executeQuery(cancelOrdersTableQuery, [orderId]);
        console.log("Order Table Cancel Result:", cancelOrdersResult);

        if (cancelOrdersResult.affectedRows > 0) { // Check if order in 'orders' table was updated
            console.log(`Cancelled order with ID: ${orderId}`);
            res.json({ success: true, message: "Order cancelled successfully for order ID: " + orderId });
        } else {
            res.status(404).json({ success: false, message: "Order not found or already cancelled" });
        }

    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error });
    }
});


// --- 2. ADD Product to Order (New Endpoint) ---
router.post("/add-product-to-order", async (req, res) => {
    try {
        const { orderId, productId, quantity, price, name, category } = req.body;

        // --- Input Validation ---
        if (!orderId || !productId || quantity === undefined || price === undefined) {
            return res.status(400).json({ success: false, message: "Missing required fields: orderId, productId, quantity, and price are required." });
        }
        if (isNaN(orderId) || isNaN(productId) || isNaN(quantity) || isNaN(price) || quantity <= 0 || price < 0) {
            return res.status(400).json({ success: false, message: "Invalid data types: orderId and productId must be numbers, quantity must be a positive number, and price must be a non-negative number." });
        }

        // --- Check if Order and Product Exist ---
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
        const productAlreadyInOrderQuery = `SELECT quantity FROM order_products WHERE order_id = ? AND product_id = ?`;
        const productInOrderResult = await executeQuery(productAlreadyInOrderQuery, [orderId, productId]);

        if (productInOrderResult.length > 0) {
            // Update quantity if different
            if (parseInt(productInOrderResult[0].quantity) !== parseInt(quantity)) {
                const updateQuery = `
                    UPDATE order_products 
                    SET quantity = ?, price = ?
                    WHERE order_id = ? AND product_id = ?
                `;
                await executeQuery(updateQuery, [quantity, price, orderId, productId]);

                return res.json({
                    success: true,
                    message: "Product quantity updated"
                });
            } else {
                return res.status(409).json({
                    success: false,
                    message: "Product already exists with same quantity"
                });
            }
        }

        // --- Insert new order_product record ---
        const insertQuery = `
            INSERT INTO order_products (order_id, product_id, quantity, price, name, category)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const insertResult = await executeQuery(insertQuery, [orderId, productId, quantity, price, name, category]);

        if (insertResult.affectedRows > 0) {
            console.log(`Product ID ${productId} added to order ID ${orderId}`);
            res.status(201).json({
                success: true,
                message: "Product added to order successfully",
                newOrderProductId: insertResult.insertId
            });
        } else {
            console.error("Failed to insert product into order");
            res.status(500).json({ success: false, message: "Failed to add product to order" });
        }

    } catch (error) {
        console.error("Error adding product to order:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error });
    }
});

router.post("/on-behalf", async (req, res) => {
    try {
        const { customer_id, order_type, reference_order_id } = req.body;

        if (!customer_id || !order_type || !reference_order_id) {
            return res.status(400).json({
                message: "customer_id, order_type, and reference_order_id are required"
            });
        }

        // 1. Place Admin Order and get new_order_id
        const insertOrderQuery = `
            INSERT INTO orders (customer_id, total_amount, order_type, placed_on, created_at, updated_at)
            VALUES (?, 0.0, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), UNIX_TIMESTAMP());
        `;
        const orderValues = [customer_id, order_type];
        const insertOrderResult = await executeQuery(insertOrderQuery, orderValues);
        const newOrderId = insertOrderResult.insertId;

        if (!newOrderId) {
            return res.status(500).json({ message: "Failed to create new order." });
        }

        // 2. Insert Order Products from reference order
        const insertOrderProductsQuery = `
        INSERT INTO order_products (order_id, product_id, quantity, price, name, category)
        SELECT ?, product_id, quantity, price, name, category
        FROM order_products
        WHERE order_id = ?
        AND LOWER(category) NOT LIKE '%Others%'
        `;
        const orderProductsValues = [newOrderId, reference_order_id];
        await executeQuery(insertOrderProductsQuery, orderProductsValues);

        // 3. Update total_amount in orders table
        const updateOrderTotalQuery = `
            UPDATE orders
            SET total_amount = (
                SELECT SUM(quantity * price)
                FROM order_products
                WHERE order_id = ?
            )
            WHERE id = ?
        `;
        const updateTotalValues = [newOrderId, newOrderId];
        await executeQuery(updateOrderTotalQuery, updateTotalValues);

        return res.status(201).json({
            message: "Admin order placed successfully with products copied.",
            new_order_id: newOrderId
        });

    } catch (error) {
        console.error("Error placing admin order with products:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
});

// Revised endpoint to update loading_slip status (following provided structure)
router.post('/update-loading-slip-status', async (req, res) => { // Changed to POST and removed :orderId from path
    try {
        const { orderId } = req.body; // Expecting orderId in request body

        // Validate input
        if (!orderId) {
            return res.status(400).json({ message: "Order ID is required in the request body" }); // More specific message
        }

        // Update query
        const query = 'UPDATE orders SET loading_slip = ? WHERE id = ?';
        const values = ['Yes', orderId];

        // Execute the query using executeQuery
        const result = await executeQuery(query, values);

        if (result.affectedRows > 0) {
            return res.status(200).json({ message: "Loading slip status updated successfully." });
        } else {
            return res.status(404).json({ message: "Order not found" });
        }
    } catch (error) {
        console.error("Error updating loading slip status:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});


router.get('/credit-limit', async (req, res) => {
    try {
        const { customerId } = req.query; // Expecting customerId as a query parameter, e.g., /credit-limit?customerId=123

        // Validate input
        if (!customerId) {
            return res.status(400).json({ message: "Customer ID is required as a query parameter" });
        }

        const query = 'SELECT credit_limit FROM credit_limit WHERE customer_id = ?'; // Assuming table name is 'credit_limit' and columns are 'customer_id' and 'credit_limit'
        const values = [customerId];

        const result = await executeQuery(query, values);

        if (result.length > 0) {
            // Assuming credit_limit is the first column selected
            const creditLimit = result[0].credit_limit;
            return res.status(200).json({ creditLimit: creditLimit });
        } else {
            return res.status(404).json({ message: "Credit limit not found for this customer ID" });
        }

    } catch (error) {
        console.error("Error fetching credit limit:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});



router.post('/credit-limit/deduct', async (req, res) => {
    try {
        // 1. Get customerId and amountChange from request body
        const { customerId, amountChange } = req.body; // Renamed from orderAmount to amountChange

        // 2. Validate input
        if (!customerId || !amountChange || isNaN(parseFloat(amountChange))) {
            return res.status(400).json({ message: "Customer ID and amountChange are required and amountChange must be a number." });
        }
        const amountToChange = parseFloat(amountChange); // Renamed variable

        // 3. Fetch current credit limit for the customer
        const getCreditLimitQuery = 'SELECT credit_limit FROM credit_limit WHERE customer_id = ?';
        const creditLimitValues = [customerId];
        const creditLimitResult = await executeQuery(getCreditLimitQuery, creditLimitValues);

        if (creditLimitResult.length === 0) {
            return res.status(404).json({ message: "Credit limit not found for this customer." });
        }
        let currentCreditLimit = parseFloat(creditLimitResult[0].credit_limit);

        // 4. **Apply the amount change to the credit limit (can be deduction or addition)**
        const newCreditLimit = currentCreditLimit - amountToChange; // It's still subtraction, but amountChange can be negative for credit addition

        // **Optionally, add a check for negative credit limit if needed**
        // if (newCreditLimit < 0) {
        //     newCreditLimit = 0; // Or handle based on your business logic
        // }

        const updateCreditLimitQuery = 'UPDATE credit_limit SET credit_limit = ? WHERE customer_id = ?';
        const updateCreditLimitValues = [newCreditLimit, customerId];
        await executeQuery(updateCreditLimitQuery, updateCreditLimitValues);

        // 5. Return success response
        return res.status(200).json({ message: "Credit limit updated successfully", newCreditLimit: newCreditLimit }); // Message updated

    } catch (error) {
        console.error("Error updating credit limit:", error); // Message updated
        return res.status(500).json({ message: "Internal server error while updating credit limit." }); // Message updated
    }
});



// New API endpoint to update credit_limit.amount_due when an order is placed
router.post('/credit-limit/update-amount-due-on-order', async (req, res) => {
    try {
        const { customerId, totalOrderAmount } = req.body; // Expect customerId and totalOrderAmount in request body

        if (!customerId || totalOrderAmount === undefined || totalOrderAmount === null) {
            return res.status(400).json({ message: "Missing customerId or totalOrderAmount in request." });
        }

        // 1. Get current amount_due from credit_limit
        const getCreditLimitQuery = 'SELECT amount_due FROM credit_limit WHERE customer_id = ?';
        const creditLimitValues = [customerId];
        const creditLimitResult = await executeQuery(getCreditLimitQuery, creditLimitValues); // Assuming 'executeQuery' is your DB query function

        let currentAmountDue = 0;
        if (creditLimitResult.length > 0 && creditLimitResult[0].amount_due !== null) {
            currentAmountDue = parseFloat(creditLimitResult[0].amount_due);
        }

        // 2. Calculate new amount_due (add total order amount)
        const updatedAmountDue = currentAmountDue + parseFloat(totalOrderAmount);

        // 3. Update amount_due in credit_limit table
        const updateCreditLimitQuery = 'UPDATE credit_limit SET amount_due = ? WHERE customer_id = ?';
        const updateCreditLimitValues = [updatedAmountDue, customerId];
        await executeQuery(updateCreditLimitQuery, updateCreditLimitValues);

        console.log(`Credit_limit.amount_due updated for customer ${customerId} by ${totalOrderAmount}. New amount_due: ${updatedAmountDue}`);

        res.status(200).json({ success: true, message: "Credit limit amount_due updated successfully." });

    } catch (error) {
        console.error("Error updating credit_limit.amount_due in /credit-limit/update-amount-due-on-order:", error);
        res.status(500).json({ success: false, message: "Failed to update credit limit amount_due." });
    }
});


router.post('/collect_cash', async (req, res) => {
    try {
        let customerId = req.query.customerId; 
        if (!customerId) {
            customerId = req.body.customerId; // Fallback to body if not in query
        } 
        const { cash } = req.body;        // Get cash from request body (optional)

        // 1. Validate customerId
        if (!customerId) {
            return res.status(400).json({ message: "Customer ID is required as a query parameter" });
        }

        // 2. Fetch Current Customer Data
        const fetchQuery = 'SELECT amount_due, amount_paid, credit_limit FROM credit_limit WHERE customer_id = ?';
        const fetchValues = [customerId];
        const customerDataResult = await executeQuery(fetchQuery, fetchValues); // Assuming executeQuery function exists

        if (customerDataResult.length === 0) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const currentCustomerData = customerDataResult[0];
        let amountDue = currentCustomerData.amount_due; // Default amount_due to return if no cash

        // 3. Handle cash Input (Optional)
        if (cash !== undefined && cash !== null) { // Check if cash is provided (not undefined and not null)
            const currentAmountPaid = currentCustomerData.amount_paid || 0; // Default to 0 if null
            const currentCreditLimit = currentCustomerData.credit_limit || 0; // Default to 0 if null

            const parsedCash = parseFloat(cash); // Parse cash to a number (important!)
            if (isNaN(parsedCash) || parsedCash < 0) {
                return res.status(400).json({ message: "Invalid cash amount provided. Cash must be a non-negative number." });
            }

            const newAmountPaid = currentAmountPaid + parsedCash;
            const newAmountDue = Math.max(0, amountDue - parsedCash); // Ensure amount_due doesn't go below 0
            const newCreditLimit = currentCreditLimit + parsedCash;

            // 4. Database Update (when cash is provided)
            const updateQuery = `
                UPDATE credit_limit
                SET amount_paid = ?, amount_due = ?, credit_limit = ?
                WHERE customer_id = ?
            `;
            const updateValues = [newAmountPaid, newAmountDue, newCreditLimit, customerId];
            await executeQuery(updateQuery, updateValues);

            return res.status(200).json({
                message: "Cash collected and customer data updated successfully",
                updatedAmountPaid: newAmountPaid,
                updatedAmountDue: newAmountDue,
                updatedCreditLimit: newCreditLimit
            });

        } else {
            // Cash is not provided, only return amount_due
            return res.status(200).json({ amountDue: amountDue });
        }

    } catch (error) {
        console.error("Error processing cash collection:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});


// New API endpoint to get total amount due across all customers
router.get('/admin/total-amount-due', async (req, res) => {
    try {
        // 1. SQL query to sum amount_due from credit_limit table
        const getTotalAmountDueQuery = 'SELECT SUM(amount_due) AS totalAmountDue FROM credit_limit';

        // 2. Execute the query
        const totalAmountDueResult = await executeQuery(getTotalAmountDueQuery);

        // 3. Extract totalAmountDue from the result
        let totalAmountDue = 0;
        if (totalAmountDueResult.length > 0 && totalAmountDueResult[0].totalAmountDue !== null) {
            totalAmountDue = parseFloat(totalAmountDueResult[0].totalAmountDue);
        }

        // 4. Respond with the total amount due
        res.status(200).json({ success: true, totalAmountDue: totalAmountDue });

    } catch (error) {
        console.error("Error fetching total amount due in /admin/total-amount-due:", error);
        res.status(500).json({ success: false, message: "Failed to fetch total amount due." });
    }
});




router.get('/fetch_credit_data', async (req, res) => {
    try {
        const query = 'SELECT * FROM credit_limit'; // Query to select all columns and rows
        const result = await executeQuery(query);

        if (result.length > 0) {
            // Data found in the credit_limit table
            return res.status(200).json({ creditData: result });
        } else {
            // No data found in the credit_limit table (table might be empty)
            return res.status(200).json({ creditData: [], message: "No credit limit data found in the table." });
            // Or, if you want to indicate "no data" as a 404 Not Found (less common for fetching all data, empty result is usually valid):
            // return res.status(404).json({ message: "No credit limit data found in the table." });
        }

    } catch (error) {
        console.error("Error fetching all credit limit data:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message }); // Include error details for debugging
    }
});


router.put('/update_credit_limit', async (req, res) => {
    try {
        const { customerId, creditLimit } = req.body; // Expecting customerId and creditLimit in the request body

        // Validate input
        if (!customerId) {
            return res.status(400).json({ message: "Customer ID is required in the request body" });
        }
        if (creditLimit === undefined || creditLimit === null || isNaN(Number(creditLimit))) {
            return res.status(400).json({ message: "Valid credit limit is required in the request body" });
        }

        const query = 'UPDATE credit_limit SET credit_limit = ? WHERE customer_id = ?';
        const values = [creditLimit, customerId];

        const result = await executeQuery(query, values);

        if (result.affectedRows > 0) {
            return res.status(200).json({ message: "Credit limit updated successfully" });
        } else {
            return res.status(404).json({ message: "Customer ID not found or credit limit update failed" });
        }

    } catch (error) {
        console.error("Error updating credit limit:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

module.exports = router;


  


