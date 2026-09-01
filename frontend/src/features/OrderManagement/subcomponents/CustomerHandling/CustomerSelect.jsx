import { useState, useCallback } from "react";

import { Form, Select, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";

import { useGetCustomersInfiniteQuery } from "../../../CustomerManagement/customerApiSlice.js";

import useDebounce from "../../../../hooks/useDebounce.js";

const { Text } = Typography;

const CustomerSelect = ({ initial_selected_customer }) => {
	const [customerPhone, setCustomerPhone] = useState("");
	const debouncedPhone = useDebounce(customerPhone, 500);

	const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useGetCustomersInfiniteQuery({
			customer_phone: debouncedPhone.trim(),
			limit: 20,
		});

	const allCustomers = data?.pages.flatMap((page) => page.results) || [];

	const handlePopupScroll = useCallback(
		(e) => {
			const { target } = e;
			const isAtBottom =
				target.scrollTop + target.clientHeight >=
				target.scrollHeight - 10;

			if (isAtBottom && hasNextPage && !isFetchingNextPage) {
				fetchNextPage();
			}
		},
		[hasNextPage, isFetchingNextPage, fetchNextPage],
	);

	const fetchedOptions = allCustomers.map((customer) => ({
		label: customer.customer_name, // What shows in the box after selection
		value: customer.customer_id,
		// Custom data for the dropdown list rendering
		customer_name: customer.customer_name,
		phone: customer.customer_phone,
	}));

	const finalOptions = [...fetchedOptions];
	if (
		initial_selected_customer &&
		!finalOptions.find((opt) => opt.value === initial_selected_customer.id)
	) {
		finalOptions.unshift({
			label: initial_selected_customer.name || "Unknown",
			value: initial_selected_customer.id,
			customer_name: initial_selected_customer.name || "Unknown",
			phone: initial_selected_customer.phone || "Unknown",
		});
	}

	return (
		<div>
			<Form.Item
				label="Search Customer"
				name="customer_id"
				rules={[
					{ required: true, message: "Please select a customer!" },
				]}
			>
				<Select
					placeholder="Search by phone number..."
					loading={isLoading}
					options={finalOptions}
					optionLabelProp="label"
					virtual={false}
					searchValue={customerPhone}
					showSearch
					onSearch={(value) => setCustomerPhone(value)}
					onPopupScroll={handlePopupScroll}
					filterOption={false}
					onClear={() => setCustomerPhone("")}
					allowClear
					optionRender={(option) => (
						<div className="flex flex-col py-1">
							<div className="flex items-center gap-2">
								<UserOutlined className="text-lg text-indigo-500" />
								<Text className="font-semibold">
									{option.data.customer_name}
								</Text>
							</div>
							<Text
								type="secondary"
								className="ml-5"
							>
								{option.data.phone}
							</Text>
						</div>
					)}
					// Styling the dropdown menu container
					dropdownStyle={{ borderRadius: "8px", padding: "8px" }}
				/>
			</Form.Item>
		</div>
	);
};
export default CustomerSelect;
