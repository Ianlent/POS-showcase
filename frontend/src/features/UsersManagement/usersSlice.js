import { createSlice } from "@reduxjs/toolkit";

const usersSlice = createSlice({
	name: "users",
	initialState: {
		filters: {
			user_name: "",
			user_phone: "",
		},
	},
	reducers: {
		setFilters: (state, action) => {
			state.filters = { ...state.filters, ...action.payload };
		},
	},
});

export const { setFilters } = usersSlice.actions;
export const selectUsersFilters = (state) => state.users.filters;
export default usersSlice.reducer;
