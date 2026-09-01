import { createSlice } from "@reduxjs/toolkit";

const customerSlice = createSlice({
	name: "customer",
	initialState: {
		filters: {
			customer_name: "",
			customer_phone: "",
		},
	},
	reducers: {
		setFilters: (state, action) => {
			state.filters = { ...state.filters, ...action.payload };
		},
	},
});

export const { setFilters, resetFilters } = customerSlice.actions;
export const selectCustomersFilters = (state) => state.customer.filters;
export default customerSlice.reducer;
