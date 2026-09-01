import { apiSlice } from "../api/apiSlice.js";

export const customerApiSlice = apiSlice.injectEndpoints({
	endpoints: (builder) => ({
		getCustomers: builder.infiniteQuery({
			infiniteQueryOptions: {
				initialPageParam: null,
				getNextPageParam: (lastPage) =>
					lastPage?.next_page ?? undefined, // Ensure undefined to stop
			},
			query: ({ queryArg, pageParam }) => ({
				url: `/api/customers`,
				params: {
					customer_name: queryArg.customer_name,
					customer_phone: queryArg.customer_phone,
					limit: queryArg.limit || 50,
					...(pageParam && { next_page: pageParam }),
				},
			}),
			providesTags: (result, error, arg) => {
				if (!result.pages) return [{ type: "Customer", id: "LIST" }];

				const customerTags = result.pages.flatMap((page) =>
					page.results.flatMap((customer) => [
						{ type: "Customer", id: customer.customer_id },
					]),
				);

				return [{ type: "Customer", id: "LIST" }, ...customerTags];
			},
		}),

		updateCustomer: builder.mutation({
			query: ({ customer_id, headers, ...data }) => ({
				url: `/api/customers/${customer_id}`,
				method: "PATCH",
				body: data,
				headers: {
					"Idempotency-Key": headers["Idempotency-Key"],
				},
			}),
			invalidatesTags: (result, error, arg) => [
				{ type: "Customer", id: arg.customer_id },
			],
		}),

		createCustomer: builder.mutation({
			query: ({ headers, ...data }) => ({
				url: `/api/customers`,
				method: "POST",
				body: data,
				headers: {
					"Idempotency-Key": headers["Idempotency-Key"],
				},
			}),
			invalidatesTags: [{ type: "Customer", id: "LIST" }],
		}),

		deleteCustomer: builder.mutation({
			query: ({ customer_id }) => ({
				url: `/api/customers/${customer_id}`,
				method: "DELETE",
			}),
			invalidatesTags: (result, error, arg) => [
				{ type: "Customer", id: arg.customer_id },
			],
		}),
	}),
});

export const {
	useGetCustomersInfiniteQuery,
	useUpdateCustomerMutation,
	useCreateCustomerMutation,
	useDeleteCustomerMutation,
} = customerApiSlice;
