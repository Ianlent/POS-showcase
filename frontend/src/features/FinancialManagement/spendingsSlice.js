import { createSlice } from "@reduxjs/toolkit";

const spendingSlice = createSlice({
	name: "spendings",
	initialState: {
		filters: {
			creator_id: undefined,
			is_expense: undefined,
			date: [undefined, undefined],
		},
	},
	reducers: {
		setFilters: (state, action) => {
			state.filters = { ...state.filters, ...action.payload };
		},
	},
});

export const { setFilters } = spendingSlice.actions;
export const selectSpendingsFilters = (state) => state.spendings.filters;
export default spendingSlice.reducer;
