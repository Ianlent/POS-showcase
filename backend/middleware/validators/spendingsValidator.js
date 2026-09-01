import { body, query, param } from "express-validator";

export const getTicketsValidation = [
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
];
export const createTicketValidation = [
	body("amount")
		.exists()
		.isInt({ gt: 0 })
		.withMessage("Amount must be a positive integer"),

	body("is_expense")
		.exists()
		.isBoolean()
		.withMessage("is_expense must be a boolean"),

	body("reason")
		.trim()
		.optional()
		.isString()
		.withMessage("Reason must be a string")
		.isLength({ min: 1, max: 50 })
		.withMessage("Reason can't be longer than 50 characters")
		.escape(),

	body("ticket_date")
		.optional()
		.isISO8601()
		.withMessage("Expense date must be a valid ISO 8601 date")
		.toDate(),
];

export const updateTicketValidation = [
	param("id")
		.isUUID()
		.withMessage("Invalid unique identifier format for expense ID"),

	body("amount")
		.optional()
		.isInt({ gt: 0 })
		.withMessage("Amount must be a positive integer"),

	body("ticket_date")
		.optional()
		.isISO8601()
		.toDate()
		.withMessage("Expense date must be a valid ISO 8601 date"),

	body("is_expense")
		.optional()
		.isBoolean()
		.withMessage("is_expense must be a boolean"),

	body("reason")
		.optional()
		.trim()
		.isString()
		.withMessage("Description must be a string")
		.isLength({ max: 50 })
		.withMessage("Description can't be longer than 50 characters")
		.escape(),
];

export const deleteTicketValidation = [
	param("id")
		.isUUID()
		.withMessage("Invalid unique identifier format for expense ID"),
];
