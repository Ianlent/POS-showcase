import { useState, useEffect, useMemo } from "react";
import { Select, Space, Tag } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import useDebounce from "../../../hooks/useDebounce.js";

// 1. Move static options OUTSIDE to avoid re-allocation on every render
const STATUS_OPTIONS = [
	{ value: "pending", label: "Pending" },
	{ value: "working", label: "Working" },
	{ value: "completed", label: "Completed" },
	{ value: "delivered", label: "Delivered" },
	{ value: "owed", label: "Owed" },
];
const ALL_OPTIONS = [{ value: 0, label: "All" }, ...STATUS_OPTIONS];

const OrderStatusFilter = ({ onSearchChange }) => {
	const [selectedValues, setSelectedValues] = useState([0]);

	const handleChange = (newValues) => {
		// Immediate check: if user cleared everything, reset to [0]
		if (newValues.length === 0) {
			setSelectedValues([0]);
			return;
		}

		const previouslySelectedAll = selectedValues.includes(0);
		const nowHasAll = newValues.includes(0);

		// Logic A: "All" was just selected (it wasn't there before) -> reset to [0]
		if (nowHasAll && !previouslySelectedAll) {
			setSelectedValues([0]);
			return;
		}

		// Logic B: A specific item was selected while "All" was active -> remove "All"
		let final = nowHasAll ? newValues.filter((v) => v !== 0) : newValues;

		// Logic C: If user manually selected every single specific option -> reset to [0]
		if (final.length === STATUS_OPTIONS.length) {
			setSelectedValues([0]);
		} else {
			setSelectedValues(final);
		}
	};

	const debouncedValue = useDebounce(selectedValues, 500);

	useEffect(() => {
		// Only send undefined if [0] is the only value
		const passedValue =
			debouncedValue.length === 1 && debouncedValue[0] === 0
				? undefined
				: debouncedValue;

		onSearchChange("order_status", passedValue);
	}, [debouncedValue]);

	return (
		<Space wrap>
			<Select
				mode="multiple"
				placeholder={
					<span className="text-slate-400">
						<FilterOutlined className="mr-2" /> All Statuses
					</span>
				}
				value={selectedValues}
				style={{ width: 400 }}
				onChange={handleChange}
				options={ALL_OPTIONS}
				maxTagCount="responsive"
				size="large"
				className="custom-select-styling"
				// Custom tag rendering to match our dashboard theme
				tagRender={(props) => {
					const { label, closable, onClose } = props;
					return (
						<Tag
							color="blue"
							closable={closable}
							onClose={onClose}
							className="flex items-center gap-1 font-medium rounded-md border-none bg-indigo-50 text-indigo-600"
						>
							{label}
						</Tag>
					);
				}}
			/>
		</Space>
	);
};

export default OrderStatusFilter;
