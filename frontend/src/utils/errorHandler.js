import { message } from "antd";

export const handleApiError = (error, clearIdempotencyKey) => {
	const { status, message: msg, details } = error;

	if (status === 409 && msg === "Request in progress or key locked.") {
		message.loading(
			"Current request still in progress. Please wait and retry...",
			3,
		);
		return;
	}

	switch (status) {
		case 400:
		case 422:
			message.warning(`${msg}. Please retry.` || "Validation error.");
			clearIdempotencyKey?.();
			break;
		case 401:
		case 403:
			message.error(msg || "Access denied.");
			clearIdempotencyKey?.();
			break;
		case 404:
			message.error(msg || "Resource not found.");
			break;
		case 409:
			message.warning(`${msg}. Please retry.` || "Conflict detected.");
			clearIdempotencyKey?.();
			break;
		case 500:
		default:
			message.error(
				msg ||
					"Network error. Please check your connection and try again.",
			);
			break;
	}
};
