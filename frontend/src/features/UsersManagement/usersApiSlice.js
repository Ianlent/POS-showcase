import { apiSlice } from "../api/apiSlice.js";

export const UserApiSlice = apiSlice.injectEndpoints({
	endpoints: (builder) => ({
		getUsers: builder.infiniteQuery({
			infiniteQueryOptions: {
				initialPageParam: null,
				getNextPageParam: (lastPage) =>
					lastPage?.next_page ?? undefined, // Ensure undefined to stop
			},
			query: ({ queryArg, pageParam }) => ({
				url: `/api/users`,
				params: {
					user_name: queryArg.user_name,
					user_phone: queryArg.user_phone,
					limit: queryArg.limit || 50,
					...(pageParam && { next_page: pageParam }),
				},
			}),
			providesTags: (result, error, arg) => {
				if (!result.pages) return [{ type: "User", id: "LIST" }];

				const userTags = result.pages.flatMap((page) =>
					page.results.flatMap((user) => [
						{ type: "User", id: user.user_id },
					]),
				);

				return [{ type: "User", id: "LIST" }, ...userTags];
			},
		}),

		updateUser: builder.mutation({
			query: ({ user_id, ...data }) => ({
				url: `/api/users/${user_id}`,
				method: "PATCH",
				body: data,
				headers: {
					"Idempotency-Key": data.headers["Idempotency-Key"],
				},
			}),
			invalidatesTags: (result, error, arg) => [
				{ type: "User", id: arg.user_id },
			],
		}),

		createUser: builder.mutation({
			query: ({ headers, ...data }) => ({
				url: `/api/users`,
				method: "POST",
				body: data,
				headers: {
					"Idempotency-Key": headers["Idempotency-Key"],
				},
			}),
			invalidatesTags: [{ type: "User", id: "LIST" }],
		}),

		deleteUser: builder.mutation({
			query: ({ user_id }) => ({
				url: `/api/users/${user_id}`,
				method: "DELETE",
			}),
			invalidatesTags: (result, error, arg) => [
				{ type: "User", id: arg.user_id },
			],
		}),
	}),
});

export const {
	useGetUsersInfiniteQuery,
	useUpdateUserMutation,
	useCreateUserMutation,
	useDeleteUserMutation,
} = UserApiSlice;
