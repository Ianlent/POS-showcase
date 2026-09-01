import { apiSlice } from "../api/apiSlice.js";
import { setCredentials } from "./authSlice";

export const authApiSlice = apiSlice.injectEndpoints({
	endpoints: (builder) => ({
		login: builder.mutation({
			query: (credentials) => ({
				url: "/auth/login",
				method: "POST",
				body: credentials,
			}),
			async onQueryStarted(arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					// Sync RTK Query result to Auth Slice
					dispatch(setCredentials(data));
				} catch (error) {
					console.log(error);
				}
			},
		}),
	}),
});

export const { useLoginMutation } = authApiSlice;
