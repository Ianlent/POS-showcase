import responseHandler from "./response.handler.js";

const DB_ERRORS_MAP = {
	23502: "badRequest", // not_null_violation
	23514: "badRequest", // check_violation
	23000: "badRequest", // generic integrity_constraint_violation
	23505: "conflict", // unique_violation
	23503: "conflict", // foreign_key_violation (or unprocessable)
	23001: "conflict", // restrict_violation
	"23P01": "conflict", // exclusion_violation
};

const HTTP_ERRORS_MAP = {
	BAD_REQUEST: "badRequest",
	UNAUTHORIZED: "unauthorized",
	FORBIDDEN: "forbidden",
	NOT_FOUND: "notFound",
	CONFLICT: "conflict",
	UNPROCESSABLE: "unprocessable",
};
export const globalErrorHandler = (err, req, res, next) => {
	let method = null;
	let clientMessage = err.message;
	let errDetails = err.details;
	console.error(err);

	// 1. Check if it's a database constraint error
	if (err.code && DB_ERRORS_MAP[err.code]) {
		method = DB_ERRORS_MAP[err.code];

		// Clean up messages so database internals aren't leaked
		if (err.code === "23505") {
			clientMessage =
				"The record you are trying to create or update already exists.";
		} else if (err.code === "23502") {
			clientMessage = "A required field was missing from your request.";
		} else {
			clientMessage = "A data validation or conflict error occurred.";
		}
	} else if (err.type && HTTP_ERRORS_MAP[err.type]) {
		method = HTTP_ERRORS_MAP[err.type];
	} else {
		method = "error";
	}
	if (method === "error") {
		console.error("CRITICAL ERROR:", err);
		// Override message for production 500s so users don't see stack traces
		clientMessage = "An unexpected internal server error occurred.";
	}

	if (errDetails) {
		return responseHandler[method](req, res, clientMessage, err.details);
	} else {
		return responseHandler[method](req, res, clientMessage);
	}
};

export default globalErrorHandler;
