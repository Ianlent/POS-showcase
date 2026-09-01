import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithRetry } from "./baseQuery.js";

export const apiSlice = createApi({
	reducerPath: "api",
	baseQuery: baseQueryWithRetry,
	tagTypes: ["Customer", "User", "Service", "Order", "Spending"],
	endpoints: (builder) => ({
		// Your endpoints...
	}),
});
