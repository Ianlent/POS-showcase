import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import { apiSlice } from "../features/api/apiSlice.js";
import authReducer, {
	logout,
	setCredentials,
} from "../features/auth/authSlice.js";
import customerReducer from "../features/CustomerManagement/customerSlice.js";
import usersReducer from "../features/UsersManagement/usersSlice.js";
import serviceReducer from "../features/ServiceManagement/serviceSlice.js";
import spendingReducer from "../features/FinancialManagement/spendingsSlice.js";
import orderReducer from "../features/OrderManagement/ordersSlice.js";
import orderTabsReducer from "../features/OrderManagement/orderTabsSlice.js";

// Create the listener middleware
const listenerMiddleware = createListenerMiddleware();

// Add the listener
listenerMiddleware.startListening({
	actionCreator: logout,
	effect: () => {
		// This is where you trigger your global navigate
		// Assuming you have a router object accessible globally
		localStorage.clear();
		sessionStorage.clear();
	},
});

listenerMiddleware.startListening({
	actionCreator: setCredentials,
	effect: (action) => {
		const { user, token, clientId } = action.payload;
		localStorage.setItem("user", JSON.stringify(user));
		//turn into cookie later
		localStorage.setItem("token", token);
		localStorage.setItem("clientId", JSON.stringify(clientId));
	},
});

export const store = configureStore({
	reducer: {
		auth: authReducer,
		customer: customerReducer,
		users: usersReducer,
		services: serviceReducer,
		spendings: spendingReducer,
		orders: orderReducer,
		orderTabs: orderTabsReducer,
		[apiSlice.reducerPath]: apiSlice.reducer,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware()
			.prepend(listenerMiddleware.middleware)
			.concat(apiSlice.middleware),
});
