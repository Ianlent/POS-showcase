import { apiSlice } from "../api/apiSlice.js";

export const OrderApiSlice = apiSlice.injectEndpoints({
	endpoints: (builder) => ({
		getOrders: builder.infiniteQuery({
			infiniteQueryOptions: {
				initialPageParam: null,
				getNextPageParam: (lastPage) =>
					lastPage?.next_page ?? undefined, // Ensure undefined to stop
			},
			query: ({ queryArg, pageParam }) => ({
				url: `/api/orders`,
				params: {
					handler_id: queryArg.handler_id,
					customer_id: queryArg.customer_id,
					order_status: queryArg.order_status,
					start: queryArg.date[0],
					end: queryArg.date[1],
					limit: queryArg.limit || 50,
					...(pageParam && { next_page: pageParam }),
				},
			}),
			providesTags: (result, error, arg) => {
				if (!result.pages) return [{ type: "Order", id: "LIST" }];

				const possibleStatus = [
					"pending",
					"working",
					"completed",
					"delivered",
					"owed",
				];

				let OrderTags = result.pages.flatMap((page) =>
					page.results.flatMap((order) => [
						{ type: "Order", id: order.order_id },
						{ type: "Customer", id: order.customer_id },
						{ type: "User", id: order.handler_id },
					]),
				);

				if (arg.order_status) {
					for (const stat of arg.order_status) {
						OrderTags.push({ type: "Order", id: `LIST.${stat}` });
					}
				} else {
					for (const stat of possibleStatus) {
						OrderTags.push({ type: "Order", id: `LIST.${stat}` });
					}
				}

				return OrderTags;
			},
		}),
		getOrderDetails: builder.query({
			query: ({ order_id }) => ({
				url: `/api/orders/${order_id}`,
			}),
			providesTags: (result, error, arg) => {
				const customerTag = {
					type: "Customer",
					id: result.customer.id,
				};
				const handlerTag = { type: "User", id: result.handler.id };
				return [
					{ type: "Order", id: arg.order_id },
					customerTag,
					handlerTag,
				];
			},
		}),

		createOrder: builder.mutation({
			query: ({ headers, ...data }) => ({
				url: `/api/orders`,
				method: "POST",
				body: data,
				headers: {
					"Idempotency-Key": headers["Idempotency-Key"],
				},
			}),
			invalidatesTags: (result, error, arg) => [
				{ type: "Order", id: `LIST.pending` },
			],
		}),

		updateOrder: builder.mutation({
			query: ({ order_id, headers, ...data }) => ({
				url: `/api/orders/${order_id}`,
				method: "PATCH",
				body: data,
				headers: {
					"Idempotency-Key": headers["Idempotency-Key"],
				},
			}),
			invalidatesTags: (result, error, arg) => {
				console.log(arg);
				return [
					{ type: "Order", id: `LIST.${arg.order_status}` },
					{ type: "Order", id: arg.order_id },
				];
			},
		}),

		deleteOrder: builder.mutation({
			query: ({ order_id }) => ({
				url: `/api/orders/${order_id}`,
				method: "DELETE",
			}),
			invalidatesTags: (result, error, arg) => [
				{ type: "Order", id: arg.order_id },
			],
		}),
	}),
});

export const {
	useGetOrdersInfiniteQuery,
	useGetOrderDetailsQuery,
	useCreateOrderMutation,
	useUpdateOrderMutation,
	useDeleteOrderMutation,
} = OrderApiSlice;
