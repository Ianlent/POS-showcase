import { fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";
import { logout } from "../auth/authSlice.js";

const RETRYABLE_STATUS_CODES = [
	408, // Request Timeout
	429, // Too Many Requests (Rate Limiting)
	500, // Internal Server Error
	502, // Bad Gateway
	503, // Service Unavailable
	504, // Gateway Timeout
];

const baseQuery = fetchBaseQuery({
	baseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
	prepareHeaders: (headers, { getState }) => {
		const token = localStorage.getItem("token");
		const clientId = getState().auth.clientId;
		if (token) {
			headers.set("Authorization", `Bearer ${token}`);
		}
		if (clientId) {
			headers.set("X-Client-Id", clientId);
		}
		return headers;
	},
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
	let result = await baseQuery(args, api, extraOptions);

	if (result.data) {
		// Strip the { success: true, data: ... } wrapper
		result.data = result.data.data;
	}

	if (result.error) {
		// Normalize the error object structure
		result.error = {
			status: result.error.status,
			message:
				result.error.data?.message || "An unexpected error occurred",
			details: result.error.data?.error || null,
		};

		// 3. Handle 401 Reauth
		if (result.error.status === 401 && args.url !== "/auth/login") {
			api.dispatch(logout());
			window.location.href = "/login";
		}
	}

	return result;
};

export const baseQueryWithRetry = retry(baseQueryWithReauth, {
	maxRetries: 3,
	retryCondition: (error) => {
		const status = error.status;

		// Always retry on Network Errors (no status code)
		if (!status || status === "FETCH_ERROR") return true;

		// Explicitly check if the status is in our "Retry-able" list
		return RETRYABLE_STATUS_CODES.includes(status);
	},
});
