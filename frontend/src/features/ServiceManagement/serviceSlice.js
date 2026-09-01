import { createSlice } from "@reduxjs/toolkit";

const serviceSlice = createSlice({
	name: "services",
	initialState: {
		filters: {
			service_name: "",
		},
	},
	reducers: {
		setFilters: (state, action) => {
			state.filters = { ...state.filters, ...action.payload };
		},
	},
});

export const { setFilters } = serviceSlice.actions;
export const selectServicesFilters = (state) => state.services.filters;
export default serviceSlice.reducer;
