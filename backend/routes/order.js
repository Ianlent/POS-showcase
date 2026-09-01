import express from "express";
import { handleValidationErrors } from "../middleware/handleValidationErrors.js";

import {
	getAllOrders,
	getActiveOrders,
	getOrderDetailsById,
	createOrder,
	updateOrderStatus,
	updateOrderByID,
	deleteOrder,
} from "../controller/orderController.js";

// Middleware ////////////////////////////////////////////////////////
import authorizeRoles from "../middleware/auth/authorizeRoles.js";
import { handleIdempotency } from "../middleware/handleIdempotency.js";
// Validators ////////////////////////////////////////////////////////
import {
	getOrdersValidation,
	createOrderValidation,
	updateOrderStatusValidation,
	updateOrderValidation,
	deleteOrderValidation,
} from "../middleware/validators/orderValidator.js";

const router = express.Router();

//employee routes
// GET
router.get(
	"/active",
	getOrdersValidation,
	handleValidationErrors,
	getActiveOrders,
);

// router.get("/owed", getOrdersValidation, handleValidationErrors, getOwedOrders);

router.get("/:id", getOrderDetailsById);

router.patch(
	"/:id/status",
	updateOrderStatusValidation,
	handleValidationErrors,
	updateOrderStatus,
);

// POST
// Create order
router.post(
	"/",
	handleIdempotency,
	createOrderValidation,
	handleValidationErrors,
	createOrder,
);

// DELETE
router.delete(
	"/:id",
	deleteOrderValidation,
	handleValidationErrors,
	deleteOrder,
);

// Admin or staff only
router.use(authorizeRoles(["admin", "manager"]));
router.get("/", getOrdersValidation, handleValidationErrors, getAllOrders); // ?start=2025-04-01&end=2025-04-30&page={uuid value or seek method}&limit=5(default)& (optional filters)
router.patch(
	"/:id",
	handleIdempotency,
	updateOrderValidation,
	handleValidationErrors,
	updateOrderByID,
); // update who handles the order, discount, extra cost and track order's status in all cases

export default router;
