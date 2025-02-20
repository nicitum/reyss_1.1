const moment = require("moment/moment");
const {
  isUserExists,
  getOrdersByCustomerId,
  getOrder,
  getProductById,
  getProducts,
  createOrder,
  addOrderProducts,
  createTransactionForCOD,
  getProductss,
  checkExistingOrder,
  toggleDeliveryStatus,
} = require("./dbUtility");
const { executeQuery } = require("../dbUtils/db");

const placeOrderService = async (
  customerId,
  { products, orderType, totalAmount, orderDate }
) => {
  try {
    // Create the order entry
   

    const placedOn = orderDate;
    const currentEpoch = Math.floor(Date.now() / 1000);
    const createdAt = currentEpoch;
    const updatedAt = currentEpoch;

    const orderId = await createOrder(
      customerId,
      totalAmount,
      orderType,
      placedOn,
      createdAt,
      updatedAt
    );

   


    // Add products to the order
    await addOrderProducts(orderId, products);

    // Create a transaction for COD orders
    await createTransactionForCOD(orderId, customerId, totalAmount);

    // Return the result (Order placed successfully)
    return {
      statusCode: 200,
      response: {
        status: true,
        message: "Order placed successfully.",
        data: {
          orderId,
          customerId,
          orderType,
          totalAmount,
          placedOn,
          products,
        },
      },
    };
  } catch (error) {
    console.error("Error in placeOrderService:", error);
    throw new Error("Failed to place the order.");
  }
};

const checkOrderService = async (customerId, orderType, products, orderDate) => {
  try {
    // Check if the user exists
    const isUser = await isUserExists(customerId);
    if (!isUser) {
      return {
        statusCode: 400,
        response: { status: false, message: "User doesn't exist." },
      };
    }

    // Check if an order for the same type and date already exists for this customer
    const existingOrder = await checkExistingOrder(customerId, orderDate, orderType);
    if (existingOrder) {
      return {
        statusCode: 400,
        response: { status: false, message: `Order already exists for ${orderType} on this date.` },
      };
    }

    // Validate products and calculate total amount
    let totalAmount = 0;
    const invalidProducts = [];
    const dbProducts = await getProductss();

    for (const product of products) {
      console.log(`🪵 → Received product:`, product);

      // Ensure we extract a valid product ID
      const productId = product.product_id ?? product.id; // Handles both cases
      const { quantity } = product;

      if (!productId) {
        console.warn(`🚨 Missing product ID for item:`, product);
        invalidProducts.push("(Missing ID)");
        continue;
      }

      const productData = dbProducts.find((p) => p.id === Number(productId));
      if (!productData) {
        console.warn(`🚨 Product not found in DB:`, productId);
        invalidProducts.push(productId);
        continue;
      }

      const parsedQuantity = parseInt(quantity, 10);
      if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
        console.warn(`🚨 Invalid quantity (${quantity}) for product ID: ${productId}`);
        invalidProducts.push(productId);
        continue;
      }

      totalAmount += productData.price * parsedQuantity;
    }

    // If there are any invalid products, return an error
    if (invalidProducts.length > 0) {
      console.error(`🚨 Invalid products found: ${invalidProducts.join(", ")}`);
      return {
        statusCode: 400,
        response: { status: false, message: `Invalid products found: ${invalidProducts.join(", ")}` },
      };
    }

    // Return valid order data
    return {
      statusCode: 200,
      response: { status: true, message: "Valid order, can proceed further.", data: { customerId, orderType, products, totalAmount } },
    };
  } catch (error) {
    console.error("❌ Error in checkOrderService:", error);
    return {
      statusCode: 500,
      response: { status: false, message: "Internal server error." },
    };
  }
};


const orderHistoryService = async (customerId) => {
  try {
    const orders = await getOrdersByCustomerId(customerId);

    const getStartOfDayTimestamp = (date) => {
      const dateObj = new Date(date * 1000);
      dateObj.setUTCHours(0, 0, 0, 0);
      return Math.floor(dateObj.getTime() / 1000);
    };

    const groupOrdersByDateAndType = (orders) => {
      const result = {};

      orders.forEach((order) => {
        const orderDateTimestamp = getStartOfDayTimestamp(order.placedOn);
        const orderType = order.orderType;

        if (!result[orderDateTimestamp]) {
          result[orderDateTimestamp] = {};
        }

        if (!result[orderDateTimestamp][orderType]) {
          result[orderDateTimestamp][orderType] = {
            quantity: 0,
            totalAmount: 0,
            route: order.route,
            orderId: order.orderId,
          };
        }

        result[orderDateTimestamp][orderType].quantity += order.quantity;
        result[orderDateTimestamp][orderType].totalAmount = order.totalAmount;
      });

      console.log(`🪵 → result:`, result);
      return result;
    };

    const groupedOrders = groupOrdersByDateAndType(orders);

    return groupedOrders;
  } catch (error) {
    console.error("Error in orderHistoryService:", error.message);
    throw new Error("Failed to fetch order history.");
  }
};

const getOrderService = async (customerId, orderId) => {
  try {
    // Fetch the order details from the orders table
    const orderQuery = `
      SELECT * 
      FROM orders 
      WHERE customer_id = ? AND id = ?
    `;
    const [order] = await executeQuery(orderQuery, [customerId, orderId]);

    if (!order) {
      throw new Error(
        `Order with ID ${orderId} not found for customer ${customerId}`
      );
    }

    // Fetch the related products for the order from the order_products table
    const orderProductsQuery = `
      SELECT op.product_id, op.quantity, op.price, p.name, p.category 
      FROM order_products op
      JOIN products p ON op.product_id = p.id
      WHERE op.order_id = ?
    `;
    const products = await executeQuery(orderProductsQuery, [orderId]);

    return {
      order,
      products,
    };
  } catch (error) {
    console.error("Error in getOrderService:", error);
    throw error;
  }
};

const getAllOrdersService = async (customerId) => {
  try {
    // Fetch all the orders from the orders table
    const ordersQuery = `
      SELECT * 
      FROM orders where customer_id = ?
    `;
    const orders = await executeQuery(ordersQuery, [customerId]);

    if (!orders.length) {
      throw new Error("No orders found");
    }

    // For each order, fetch the related products from the order_products table
    const ordersWithProducts = await Promise.all(
      orders.map(async (order) => {
        const orderProductsQuery = `
          SELECT op.product_id, op.quantity, op.price, p.name, p.category
          FROM order_products op
          JOIN products p ON op.product_id = p.id
          WHERE op.order_id = ?
        `;
        const products = await executeQuery(orderProductsQuery, [order.id]);

        return {
          order,
          products,
        };
      })
    );

    return ordersWithProducts;
  } catch (error) {
    console.error("Error in getAllOrdersService:", error);
    throw error;
  }
};

const toggleDeliverySatusService = async (customerId, orderId) => {
  try {
    const userExists = await isUserExists(customerId);
    const orderExists = await getOrder(customerId, orderId);

    if (
      !userExists ||
      !orderExists.length ||
      orderExists[0].delivery_status == "delivered"
    ) {
      throw new Error("No order found.");
    }

    const updateResponse = await toggleDeliveryStatus(customerId, orderId);
    return updateResponse;
  } catch (error) {
    console.error("Error in toggleDeliverySatusService:", error);
    throw error;
  }
};

const reportDefectService = async (customerId, orderId, defectiveProducts) => {
  try {
    const orderExists = await getOrder(customerId, orderId);
    if (!orderExists.length || orderExists[0].delivery_status == "delivered") {
      throw new Error("No order found.");
    }
    for (let i = 0; i < defectiveProducts.length; i++) {
      const { productId, quantity, reportDescription } = defectiveProducts[i];

      const validateOrderProductQuery = `
        SELECT * 
        FROM order_products op
        JOIN orders o ON op.order_id = o.id
        WHERE op.order_id = ? AND op.product_id = ? AND o.customer_id = ?
      `;
      const [orderProduct] = await executeQuery(validateOrderProductQuery, [
        orderId,
        productId,
        customerId,
      ]);

      if (!orderProduct) {
        return {
          message: `Product with ID ${productId} not found in the given order for customer ${customerId}`,
        };
      }

      // Insert the defect report for each defective product into the product_defects table
      const insertDefectQuery = `
        INSERT INTO product_defects (order_id, product_id, customer_id, report_description, quantity)
        VALUES (?, ?, ?, ?, ?)
      `;
      await executeQuery(insertDefectQuery, [
        orderId,
        productId,
        customerId,
        reportDescription,
        quantity,
      ]);
    }

    return {
      message: "Defect(s) reported successfully",
    };
  } catch (error) {
    console.error("Error in reportDefectService:", error);
    throw error;
  }
};

module.exports = {
  placeOrderService,
  orderHistoryService,
  checkOrderService,
  getOrderService,
  getAllOrdersService,
  toggleDeliverySatusService,
  reportDefectService,
};