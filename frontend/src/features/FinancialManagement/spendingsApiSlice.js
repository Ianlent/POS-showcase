import { apiSlice } from "../api/apiSlice.js";

export const SpendingApiSlice = apiSlice.injectEndpoints({
	endpoints: (builder) => ({
		getSpendings: builder.infiniteQuery({
			infiniteQueryOptions: {
				initialPageParam: null,
				getNextPageParam: (lastPage) =>
					lastPage?.next_page ?? undefined, // Ensure undefined to stop
			},
			query: ({ queryArg, pageParam }) => ({
				url: `/api/spendings`,
				params: {
					creator_id: queryArg.creator_id,
					is_expense: queryArg.is_expense,
					start: queryArg.date[0],
					end: queryArg.date[1],
					limit: queryArg.limit || 50,
					...(pageParam && { next_page: pageParam }),
				},
			}),
			providesTags: (result, error, arg) => {
				if (!result.pages) return [{ type: "Spending", id: "LIST" }];

				const spendingsTags = result.pages.flatMap((page) =>
					page.results.flatMap((tickets) => [
						{ type: "Spending", id: tickets.ticket_id },
					]),
				);

				return [{ type: "Spending", id: "LIST" }, ...spendingsTags];
			},
		}),

		updateSpending: builder.mutation({
			query: ({ ticket_id, headers, ...data }) => ({
				url: `/api/spendings/${ticket_id}`,
				method: "PATCH",
				body: data,
				headers: {
					"Idempotency-Key": headers["Idempotency-Key"],
				},
			}),
			invalidatesTags: (result, error, arg) => [
				{ type: "Spending", id: arg.ticket_id },
			],
		}),

		createSpending: builder.mutation({
			query: ({ headers, ...data }) => ({
				url: `/api/spendings`,
				method: "POST",
				body: data,
				headers: {
					"Idempotency-Key": headers["Idempotency-Key"],
				},
			}),
			invalidatesTags: [{ type: "Spending", id: "LIST" }],
		}),

		deleteSpending: builder.mutation({
			query: ({ spendings_id }) => ({
				url: `/api/spendings/${spendings_id}`,
				method: "DELETE",
			}),
			invalidatesTags: (result, error, arg) => [
				{ type: "Spending", id: arg.spendings_id },
			],
		}),
	}),
});

export const {
	useGetSpendingsInfiniteQuery,
	useUpdateSpendingMutation,
	useCreateSpendingMutation,
	useDeleteSpendingMutation,
} = SpendingApiSlice;
