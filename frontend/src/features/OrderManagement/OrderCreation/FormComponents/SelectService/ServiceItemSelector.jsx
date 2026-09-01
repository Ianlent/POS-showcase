import { useState, useCallback } from "react";
import { Form, Select, Tag, Typography } from "antd";
import { useGetServicesInfiniteQuery } from "../../../../ServiceManagement/serviceApiSlice.js";
import useDebounce from "../../../../../hooks/useDebounce.js";

const { Text } = Typography;

const ServiceItemSelector = ({
	name,
	restField,
	selectedIds,
	onPriceDiscovered,
}) => {
	const [serviceName, setServiceName] = useState("");
	const debouncedSearch = useDebounce(serviceName, 500);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useGetServicesInfiniteQuery({
			service_name: debouncedSearch.trim(),
			limit: 10,
		});

	const allServices = data?.pages.flatMap((page) => page.results) || [];

	const handlePopupScroll = useCallback(
		(e) => {
			const { target } = e;
			if (
				target.scrollTop + target.clientHeight >=
				target.scrollHeight - 15
			) {
				if (hasNextPage && !isFetchingNextPage) fetchNextPage();
			}
		},
		[hasNextPage, isFetchingNextPage, fetchNextPage],
	);

	const serviceOptions = allServices.map((service) => ({
		value: service.service_id,
		label: service.service_name,
		unit: service.service_unit,
		price_unit: service.service_price_per_unit,
		disabled: selectedIds.includes(service.service_id),
	}));

	const handleChange = (value, option) => {
		if (value) {
			onPriceDiscovered(value, option.price_unit);
		}
	};

	return (
		<Form.Item
			{...restField}
			name={[name, "service_id"]}
			rules={[{ required: true, message: "Required" }]}
			noStyle
		>
			<Select
				showSearch
				size="large"
				placeholder="Search for a service..."
				loading={isLoading}
				options={serviceOptions}
				optionLabelProp="label"
				onChange={handleChange}
				onSearch={setServiceName}
				onPopupScroll={handlePopupScroll}
				filterOption={false}
				allowClear
				className="w-full"
				optionRender={(option) => (
					<div
						className={`flex justify-between items-center w-full ${option.data.disabled ? "opacity-40" : ""}`}
					>
						<div className="text-sm flex flex-col">
							<Text className="font-semibold">
								{option.data.label}
							</Text>
							<Text className="text-xs text-slate-400 uppercase">
								{option.data.unit}
							</Text>
						</div>

						<Tag
							color="green"
							className="text-sm m-0 font-mono"
						>
							{new Intl.NumberFormat("vi-VN", {
								style: "currency",
								currency: "VND",
							}).format(option.data.price_unit * 1000)}
						</Tag>
					</div>
				)}
			/>
		</Form.Item>
	);
};

export default ServiceItemSelector;
