import { body, query, param } from "express-validator";

export const getCustomersValidation = [
	query("limit")
		.optional()
		.isInt({ gt: 0, max: 100 })
		.withMessage("Limit must be a positive integer no greater than 100")
		.toInt(),
];

export const createCustomerValidation = [
	body("customer_name")
		.exists()
		.withMessage("Customer name is required")
		.trim()
		.isString()
		.withMessage("Customer name must be a string")
		.isLength({ min: 1, max: 50 })
		.withMessage("Customer name must be between 1 and 50 characters")
		.escape(),

	body("customer_phone")
		.exists()
		.withMessage("Phone number is required")
		.isMobilePhone("vi-VN")
		.withMessage("Invalid phone number"),

	body("customer_address")
		.optional({ values: "null" })
		.trim()
		.isString()
		.withMessage("Address must be a string")
		.isLength({ min: 5, max: 100 })
		.withMessage(
			"Address must be between 5 and 100 characters if is a string",
		)
		.escape(),

	body("points")
		.optional()
		.isInt({ min: 0 })
		.withMessage("Points must be a non-negative integer")
		.toInt(),
];

export const updateCustomerValidation = [
	param("id")
		.isUUID()
		.withMessage("Invalid unique identifier format for customer ID"),

	body("customer_name")
		.optional()
		.trim()
		.isString()
		.withMessage("Customer name must be a string")
		.isLength({ min: 1, max: 50 })
		.withMessage("Customer name must be between 1 and 50 characters")
		.escape(),

	body("customer_phone")
		.optional()
		.trim()
		.isMobilePhone("vi-VN")
		.withMessage("Invalid phone number"),

	body("customer_address")
		.optional({ values: "null" })
		.trim()
		.isString()
		.withMessage("Address must be a string")
		.isLength({ min: 5, max: 100 })
		.withMessage(
			"Address must be between 5 and 100 characters if is a string",
		)
		.escape(),

	body("added_points")
		.optional()
		.trim()
		.isInt()
		.withMessage("Points must be an integer"),
];

export const deleteCustomerValidation = [
	param("id")
		.isUUID()
		.withMessage("Invalid unique identifier format for customer ID"),
];
