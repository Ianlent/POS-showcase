import { apiSlice } from "../api/apiSlice.js";

export const ServiceApiSlice = apiSlice.injectEndpoints({
	endpoints: (builder) => ({
		getServices: builder.infiniteQuery({
			infiniteQueryOptions: {
				initialPageParam: null,
				getNextPageParam: (lastPage) =>
					lastPage?.next_page ?? undefined,
			},
			query: ({ queryArg, pageParam }) => ({
				url: `/api/services`,
				params: {
					service_name: queryArg.service_name,
					limit: queryArg.limit || 50,
					...(pageParam && { next_page: pageParam }),
				},
			}),
			providesTags: (result, error, arg) => {
				if (!result.pages) return [{ type: "Service", id: "LIST" }];

				const serviceTags = result.pages.flatMap((page) =>
					page.results.flatMap((service) => [
						{ type: "Service", id: service.service_id },
					]),
				);

				return [{ type: "Service", id: "LIST" }, ...serviceTags];
			},
		}),

		updateService: builder.mutation({
			query: ({ service_id, ...data }) => ({
				url: `/api/services/${service_id}`,
				method: "PATCH",
				body: data,
				headers: {
					"Idempotency-Key": data.headers["Idempotency-Key"],
				},
			}),
			invalidatesTags: (result, error, arg) => [
				{ type: "Service", id: arg.service_id },
			],
		}),

		createService: builder.mutation({
			query: ({ headers, ...data }) => ({
				url: `/api/services`,
				method: "POST",
				body: data,
				headers: {
					"Idempotency-Key": headers["Idempotency-Key"],
				},
			}),
			invalidatesTags: [{ type: "Service", id: "LIST" }],
		}),

		deleteService: builder.mutation({
			query: ({ service_id }) => ({
				url: `/api/services/${service_id}`,
				method: "DELETE",
			}),
			invalidatesTags: (result, error, arg) => [
				{ type: "Service", id: arg.service_id },
			],
		}),
	}),
});

export const {
	useGetServicesInfiniteQuery,
	useUpdateServiceMutation,
	useCreateServiceMutation,
	useDeleteServiceMutation,
} = ServiceApiSlice;
