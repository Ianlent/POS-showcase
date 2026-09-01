import { createSlice } from "@reduxjs/toolkit";

const orderSlice = createSlice({
	name: "orders",
	initialState: {
		filters: {
			handler_id: undefined,
			customer_id: undefined,
			order_status: undefined,
			date: [undefined, undefined],
		},
	},
	reducers: {
		setFilters: (state, action) => {
			state.filters = { ...state.filters, ...action.payload };
		},
	},
});

export const { setFilters } = orderSlice.actions;
export const selectOrdersFilters = (state) => state.orders.filters;
export default orderSlice.reducer;
