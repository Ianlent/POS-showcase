import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
	name: "auth",
	initialState: {
		user: JSON.parse(localStorage.getItem("user")) || null,
		isAuthenticated: !!localStorage.getItem("token"),
	},
	reducers: {
		// Called by authApiSlice when login succeeds
		setCredentials: (state, action) => {
			const { user, clientId } = action.payload;
			state.user = user;
			state.isAuthenticated = true;
		},
		logout: (state) => {
			state.user = null;
			state.isAuthenticated = false;
		},
	},
});

export const { setClientId, setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
