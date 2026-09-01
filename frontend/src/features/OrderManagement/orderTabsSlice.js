import { createSlice } from "@reduxjs/toolkit";

const initialState = {
	activeKey: "1",
	tabs: [{ id: "1", label: "Order #1" }],
	orderData: {
		1: {
			customerType: "existing",
			priceMap: {},
			formValues: {},
		},
	},
	nextTabIndex: 1,
};

const orderTabsSlice = createSlice({
	name: "orderTabs",
	initialState,
	reducers: {
		setActiveKey: (state, action) => {
			state.activeKey = action.payload;
		},
		addTab: (state) => {
			state.nextTabIndex += 1;
			const newId = `${state.nextTabIndex}`;
			state.tabs.push({ id: newId, label: `Order #${newId}` });
			state.orderData[newId] = {
				customerType: "existing",
				priceMap: {},
				formValues: {},
			};
			state.activeKey = newId;
		},
		removeTab: (state, action) => {
			const targetKey = action.payload;
			const targetIndex = state.tabs.findIndex((t) => t.id === targetKey);

			state.tabs = state.tabs.filter((t) => t.id !== targetKey);
			delete state.orderData[targetKey];

			if (state.tabs.length > 0 && state.activeKey === targetKey) {
				const nextIndex = Math.max(0, targetIndex - 1);
				state.activeKey = state.tabs[nextIndex].id;
			} else if (state.tabs.length === 0) {
				state.activeKey = "";
			}
		},
		updateOrderField: (state, action) => {
			const { tabId, field, value } = action.payload;
			if (state.orderData[tabId]) {
				state.orderData[tabId][field] = value;
			}
		},
		updateFormValues: (state, action) => {
			const { tabId, values } = action.payload;
			if (state.orderData[tabId]) {
				state.orderData[tabId].formValues = {
					...state.orderData[tabId].formValues,
					...values,
				};
			}
		},
		resetTabData: (state, action) => {
			const tabId = action.payload;
			if (state.orderData[tabId]) {
				state.orderData[tabId] = {
					customerType: "existing",
					priceMap: {},
					formValues: {},
				};
			}
		},
	},
});

export const {
	setActiveKey,
	addTab,
	removeTab,
	updateOrderField,
	updateFormValues,
	resetTabData,
} = orderTabsSlice.actions;

export default orderTabsSlice.reducer;
