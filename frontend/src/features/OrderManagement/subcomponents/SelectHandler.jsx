import { useState, useCallback } from "react";

import { Form, Select, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";

import { useGetUsersInfiniteQuery } from "../../UsersManagement/usersApiSlice.js";

import useDebounce from "../../../hooks/useDebounce.js";

const { Text } = Typography;

const SelectHandler = ({ initial_selected_handler }) => {
	const [handlerPhone, setHandlerPhone] = useState("");
	const debouncedPhone = useDebounce(handlerPhone, 500);

	const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useGetUsersInfiniteQuery({
			user_phone: debouncedPhone.trim(),
			limit: 20,
		});

	const allUsers = data?.pages.flatMap((page) => page.results) || [];

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

	const fetchedOptions = allUsers.map((user) => ({
		label: user.user_name, // What shows in the box after selection
		value: user.user_id,
		// Custom data for the dropdown list rendering
		user_name: user.user_name,
		phone: user.user_phone,
	}));

	const finalOptions = [...fetchedOptions];
	if (
		initial_selected_handler &&
		!finalOptions.find((opt) => opt.value === initial_selected_handler.id)
	) {
		finalOptions.unshift({
			label: initial_selected_handler.name || "Unknown",
			value: initial_selected_handler.id,
			user_name: initial_selected_handler.name || "Unknown",
			phone: initial_selected_handler.phone || "Unknown",
		});
	}

	return (
		<div>
			<Form.Item
				label="Search Handler"
				name="handler_id"
				rules={[
					{ required: true, message: "Please select a handler!" },
				]}
			>
				<Select
					placeholder="Search by phone number..."
					loading={isLoading}
					options={finalOptions}
					optionLabelProp="label"
					virtual={false}
					searchValue={handlerPhone}
					showSearch
					onSearch={(value) => setHandlerPhone(value)}
					onPopupScroll={handlePopupScroll}
					filterOption={false}
					onClear={() => setHandlerPhone("")}
					allowClear
					optionRender={(option) => (
						<div className="flex flex-col py-1">
							<div className="flex items-center gap-2">
								<UserOutlined className="text-indigo-500" />
								<Text className="font-semibold text-lg">
									{option.data.user_name}
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

export default SelectHandler;
