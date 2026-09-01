import { IdempotencyRepository } from "../repositories/idempotencyRepository.js";
const responseSuccess = (res, statusCode, data) => {
	res.status(statusCode).json({
		success: true,
		data: data,
	});
};

const responseError = (req, res, statusCode, message, errorDetails = null) => {
	const responseBody = {
		success: false,
		message: message,
	};
	// Only include 'error' key if details are provided
	if (errorDetails) {
		responseBody.error = errorDetails;
	}

	if (req.idempotencyKey) {
		IdempotencyRepository.updateFailed({
			key: req.idempotencyKey,
			userId: req.user.user_id,
			code: statusCode,
			body: responseBody,
		});
	}

	res.status(statusCode).json(responseBody);
};

// --- Success Helpers ---
const ok = (res, data) => responseSuccess(res, 200, data);
const created = (res, data) => responseSuccess(res, 201, data);
const noContent = (res) => responseSuccess(res, 204, null);

// --- Error Helpers (Now using the new responseError helper) ---
// Fixed: Renamed to serverError to avoid confusion, and accepts actual error details
const serverError = (req, res, details = null) =>
	responseError(req, res, 500, "Oops! Something went wrong", details);

const badRequest = (req, res, message, errors) =>
	responseError(req, res, 400, message, errors);

const unauthorized = (req, res, message) =>
	responseError(req, res, 401, message || "Unauthorized");

const forbidden = (req, res, message) =>
	responseError(req, res, 403, message || "Forbidden");

const notFound = (req, res, message) => {
	// This is your specifically identified function, now correctly fixed.
	responseError(req, res, 404, message || "Resource not found");
};

const conflict = (req, res, message) =>
	responseError(req, res, 409, message || "Conflict with existing resource");

const unprocessable = (req, res, message, errors) =>
	responseError(req, res, 422, message, errors);

export default {
	error: serverError, // Export the fixed server error function under 'error'
	badRequest,
	ok,
	created,
	noContent,
	unauthorized,
	notFound,
	forbidden,
	conflict,
	unprocessable,
};
