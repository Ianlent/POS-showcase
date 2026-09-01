import { body, checkExact, param, query, oneOf } from "express-validator";

export const getOrdersValidation = [
	query("start")
		.optional()
		.isISO8601()
		.toDate()
		.withMessage("Start date must be a valid ISO 8601 timestamp"),

	query("end")
		.optional()
		.isISO8601()
		.toDate()
		.withMessage("End date must be a valid ISO 8601 timestamp"),

	query("limit")
		.optional()
		.isInt({ gt: 0, max: 100 })
		.withMessage("Limit must be a positive integer")
		.toInt(),

	query("order_status")
		.optional()
		.customSanitizer((value) => {
			if (typeof value === "string") {
				return value.split(",");
			}
			return value;
		})
		.isArray({ min: 1 })
		.withMessage("order_status must be a non=empty array")
		.custom((statuses) => {
			const allowed = [
				"pending",
				"working",
				"completed",
				"delivered",
				"owed",
			];
			const isValid = statuses.every((status) =>
				allowed.includes(status),
			);
			if (!isValid) {
				throw new Error(`Status must be one of: ${allowed.join(", ")}`);
			}
			return true;
		}),
	query("customer_id")
		.optional()
		.isUUID()
		.withMessage("Customer ID must be a valid UUID string"),

	query("handler_id")
		.optional()
		.isUUID()
		.withMessage("Handler ID must be a valid UUID string"),
];

export const getOrderDetailsValidation = [
	param("id")
		.exists()
		.withMessage("Order ID is required")
		.isUUID()
		.withMessage("Invalid unique identifier format for order ID"),
];

// Validator for creating a new order
export const createOrderValidation = [
	body("handler_id")
		.optional()
		.isUUID()
		.withMessage("Handler ID must be a valid UUID string"),

	body("customer_id")
		.optional()
		.isUUID()
		.withMessage("Customer ID must be a valid UUID string"),

	// Customer Info Object Validation
	body("customerInfo")
		.optional()
		.isObject()
		.withMessage("Customer info must be an object"),

	body("customerInfo.customer_name")
		.if(body("customerInfo").exists())
		.exists()
		.withMessage("Customer name is required")
		.trim()
		.isString()
		.withMessage("Customer name must be a string")
		.isLength({ min: 2, max: 50 })
		.withMessage("Customer name must be between 2 and 50 characters")
		.escape(),

	body("customerInfo.customer_phone")
		.if(body("customerInfo").exists())
		.exists()
		.withMessage("Phone number is required")
		.isMobilePhone("vi-VN")
		.withMessage("Invalid phone number"),

	body("customerInfo.customer_address")
		.if(body("customerInfo").exists())
		.optional({ values: "null" })
		.trim()
		.isString()
		.withMessage("Address must be a string")
		.isLength({ min: 5, max: 100 })
		.withMessage(
			"Address must be between 5 and 100 characters if is a string",
		)
		.escape(),

	body("customerInfo.points")
		.if(body("customerInfo").exists())
		.optional()
		.isInt({ min: 0 })
		.withMessage("Points must be a non-negative integer")
		.toInt(),

	oneOf(
		[
			body("customer_id").exists().isUUID(),
			body("customerInfo").exists().isObject(),
		],
		{
			message:
				"Either a valid Customer ID or Customer Information must be provided",
		},
	),

	body("order_start_date")
		.exists()
		.isISO8601()
		.withMessage("Order date must be a valid ISO 8601 date")
		.toDate(),

	body("planned_pickup_date")
		.exists()
		.isISO8601()
		.withMessage("Planned pickup date must be a valid ISO 8601 date")
		.toDate()
		.custom((pickupDate, { req }) => {
			// Comparison: endDate must be greater than startDate
			if (pickupDate <= req.body.order_start_date) {
				throw new Error(
					"Planned pickup date must be later than order start date",
				);
			}
			return true;
		}),

	body("is_prepaid")
		.exists()
		.withMessage("is_prepaid is required")
		.isBoolean()
		.withMessage("is_prepaid must be a boolean value")
		.toBoolean(),

	body("payment_method")
		.custom((value, { req }) => {
			const isPrepaid = req.body.is_prepaid;

			// Case 1: If is_prepaid is true, payment_method MUST be 'cash' or 'bank_transfer'
			if (isPrepaid === true) {
				if (!value) {
					throw new Error(
						"Payment method is required when is_prepaid is true",
					);
				}
				if (!["cash", "bank_transfer"].includes(value)) {
					throw new Error(
						"Payment method must be one of the following: 'cash', 'bank_transfer'",
					);
				}
			}

			// Case 2: If is_prepaid is false, payment_method MUST be null (or undefined/empty)
			else if (isPrepaid === false) {
				if (value !== null && value !== undefined && value !== "") {
					throw new Error(
						"Payment method must be null when is_prepaid is false",
					);
				}
			}

			return true;
		})
		// Optional: Force the value to strictly be null in your sanitized output if it's false
		.customSanitizer((value, { req }) => {
			return req.body.is_prepaid ? value : null;
		}),

	body("extra_cost")
		.optional()
		.isInt({ min: 0 })
		.withMessage("Extra cost must be a non-negative integer")
		.toInt(),

	body("discount")
		.optional()
		.isInt({ min: 0 })
		.withMessage("Discount must be a non-negative integer")
		.if(body("discount_type").equals("percent"))
		.isInt({ max: 100 })
		.withMessage("Percentage discount must be between 0 and 100")
		.toInt(),

	body("discount_type")
		.optional()
		.isString()
		.withMessage("Discount type must be a string")
		.isIn(["percent", "fixed"])
		.withMessage("Discount type must be 'percent' or 'fixed'"),

	body("order_note")
		.optional({ values: "null" })
		.trim()
		.isString()
		.withMessage("Order note must be a string")
		.isLength({ max: 1000 })
		.withMessage("Order note must be 1-1000 characters long")
		.escape(),

	body("points_used")
		.optional()
		.isInt({ min: 0 })
		.withMessage("Points used must be a non-negative integer")
		.toInt(),

	body("points_earned")
		.optional()
		.isInt({ min: 0 })
		.withMessage("Points earned must be a non-negative integer")
		.toInt(),

	// Array of object: [{ service_id: uuid, number_of_unit: int }]
	body("services")
		.exists()
		.withMessage("Services is required")
		.isArray({ min: 1 })
		.withMessage("Services must be an array with at least one object"),

	body("services.*.service_id")
		.isUUID()
		.withMessage("Each service_id must be a valid UUID"),

	body("services.*.service_price_per_unit")
		.isInt({ gt: 0 })
		.withMessage("Price per unit must be a positive integer")
		.toInt(),

	body("services.*.number_of_unit")
		.isInt({ min: 1 })
		.withMessage("Units must be an integer of 1 or more")
		.toInt(),
];

// Validators for updating an order
export const updateOrderStatusValidation = [
	body("order_status")
		.exists()
		.withMessage("Order status is required")
		.isIn(["pending", "working", "completed", "delivered", "owed"])
		.withMessage(
			"Order status must be one of the following: 'pending', 'working', 'completed', 'delivered', 'owed'",
		),

	body("owed_due_date")
		.custom((value, { req }) => {
			const status = req.body.order_status;
			if (status === "owed") {
				if (!value) {
					throw new Error(
						"Due date is required when order status is 'owed'",
					);
				}
			} else {
				if (value !== null && value !== undefined) {
					throw new Error(
						"Due date must be null unless order status is 'owed'",
					);
				}
			}
			return true;
		})
		// 3. Date format validation (only runs if status is 'owed')
		.if((value, { req }) => req.body.order_status === "owed")
		.isISO8601()
		.withMessage("Due date must be a valid ISO 8601 date string")
		.toDate(),

	body("payment_method")
		.optional()
		.isIn(["cash", "bank_transfer"])
		.withMessage(
			"Payment method must be one of the following: 'cash', 'bank_transfer'",
		),
];

export const updateOrderValidation = [
	param("id").isUUID().withMessage("Invalid identifier format for order ID"),

	body("customer_id")
		.optional()
		.isUUID()
		.withMessage("Customer ID must be a valid UUID string"),

	// Customer Info Object Validation
	body("customerInfo")
		.optional()
		.isObject()
		.withMessage("Customer info must be an object"),

	body("customerInfo.customer_name")
		.if(body("customerInfo").exists())
		.exists()
		.withMessage("Customer name is required")
		.trim()
		.isString()
		.withMessage("Customer name must be a string")
		.isLength({ min: 2, max: 50 })
		.withMessage("Customer name must be between 2 and 50 characters")
		.escape(),

	body("customerInfo.customer_phone")
		.if(body("customerInfo").exists())
		.exists()
		.withMessage("Phone number is required")
		.isMobilePhone("vi-VN")
		.withMessage("Invalid phone number"),

	body("customerInfo.customer_address")
		.if(body("customerInfo").exists())
		.optional({ values: "null" })
		.trim()
		.isString()
		.withMessage("Address must be a string")
		.isLength({ min: 5, max: 100 })
		.withMessage(
			"Address must be between 5 and 100 characters if is a string",
		)
		.escape(),

	body("customerInfo.points")
		.if(body("customerInfo").exists())
		.optional()
		.isInt({ min: 0 })
		.withMessage("Points must be a non-negative integer")
		.toInt(),

	body("handler_id")
		.optional()
		.isUUID()
		.withMessage("Handler ID must be a valid UUID string"),

	body("order_status")
		.optional()
		.isIn(["pending", "working", "completed", "delivered", "owed"])
		.withMessage(
			"Order status must be one of the following: 'pending', 'working', 'completed', 'delivered', 'owed'",
		),

	body("closed_by")
		.custom((value, { req }) => {
			const status = req.body.order_status;

			if (status !== "delivered") {
				// If status is NOT delivered, closed_by MUST be null or undefined
				if (value !== null && value !== undefined) {
					throw new Error(
						"closed_by must be null for this order status",
					);
				}
			}
			// If status IS delivered, we allow 'value' to be missing (undefined/null)
			// because your controller will fall back to the current user's ID.

			return true;
		})
		// Only run UUID validation if the status is 'delivered' AND the client actually provided a value
		.if(body("order_status").equals("delivered"))
		.if(body("closed_by").exists({ values: "falsy" }))
		.isUUID()
		.withMessage("closed_by must be a valid UUID string"),

	body("owed_due_date")
		.if((value, { req }) => req.body.order_status !== undefined)

		// 2. If it exists, force it to exist ONLY if order_status is 'owed'
		.custom((value, { req }) => {
			const status = req.body.order_status;
			if (status === "owed") {
				if (!value) {
					throw new Error(
						"Due date is required when order status is 'owed'",
					);
				}
			} else {
				if (value !== null && value !== undefined) {
					throw new Error(
						"Due date must be null unless order status is 'owed'",
					);
				}
			}
			return true;
		})
		// 3. Date format validation (only runs if status is 'owed')
		.if((value, { req }) => req.body.order_status === "owed")
		.isISO8601()
		.withMessage("Due date must be a valid ISO 8601 date string")
		.toDate(),

	body("payment_method")
		// Only run validation if order_status exists in the request
		.if((value, { req }) => req.body.order_status !== undefined)
		.optional()
		.isIn(["cash", "bank_transfer"])
		.withMessage(
			"Payment method must be one of the following: 'cash', 'bank_transfer'",
		),

	body("order_start_date")
		.optional()
		.isISO8601()
		.withMessage("Order date must be a valid ISO 8601 timestamp")
		.toDate(),

	body("extra_cost")
		.optional()
		.isInt({ min: 0 })
		.withMessage("Extra cost must be a non-negative integer")
		.toInt(),

	body("discount")
		.optional()
		.isInt({ min: 0 })
		.withMessage("Discount must be a non-negative integer")
		.if(body("discount_type").equals("percent"))
		.isInt({ max: 100 })
		.withMessage("Percentage discount must be between 0 and 100")
		.toInt(),

	body("discount_type")
		.optional()
		.isString()
		.withMessage("Discount type must be a string")
		.isIn(["percentage", "fixed"])
		.withMessage("Discount type must be 'percent' or 'fixed'"),

	body("order_note")
		.trim()
		.optional({ values: "undefined" })
		.isString()
		.withMessage("Order note must be a string")
		.isLength({ max: 1000 })
		.withMessage("Order note must be 1-200 characters long")
		.escape(),

	checkExact(),
];

export const deleteOrderValidation = [
	param("id")
		.isUUID()
		.withMessage(
			"Invalid identifier format for order ID, must be a valid UUID string",
		),
];
