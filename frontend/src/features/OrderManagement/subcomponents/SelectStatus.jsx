import { Select, Space, Badge, Typography } from "antd";

const { Text } = Typography;

const OrderStatusSelect = ({ value, onChange, currentStatus, isPrepaid }) => {
	// Match your backend ALLOWED_FULFILLMENT_TRANSITIONS object
	const ALLOWED_FULFILLMENT_TRANSITIONS = {
		pending: ["working", "completed"],
		working: ["pending", "completed"],
		completed: ["delivered", "owed", "pending", "working"],
		delivered: ["completed"],
		owed: ["delivered", "completed"],
	};

	// Get allowed list or default to empty array if status is unknown
	const allowedNextStatuses =
		ALLOWED_FULFILLMENT_TRANSITIONS[currentStatus] || [];

	// Helper to check if an option should be disabled
	const isOptionDisabled = (statusValue) => {
		if (statusValue === currentStatus) return false;
		if (statusValue === "owed" && isPrepaid) return true;
		return !allowedNextStatuses.includes(statusValue);
	};

	// Helper style to force visual graying out if AntD default is overridden
	const getOptionStyle = (statusValue) => {
		return isOptionDisabled(statusValue)
			? {
					opacity: 0.4,
					cursor: "not-allowed",
					backgroundColor: "#f8fafc",
				}
			: {};
	};

	return (
		<Select
			size="large"
			value={value}
			onChange={onChange}
			className="w-full rounded-xl premium-select"
			popupClassName="rounded-xl shadow-xl border-slate-100"
		>
			<Select.Option
				value="pending"
				disabled={isOptionDisabled("pending")}
				style={getOptionStyle("pending")}
			>
				<Space>
					<Badge
						color={
							isOptionDisabled("pending") ? "#cbd5e1" : "#f59e0b"
						}
					/>
					<div className="flex flex-col">
						<Text
							className={
								isOptionDisabled("pending")
									? "text-slate-400 font-medium"
									: "text-slate-700 font-medium"
							}
						>
							Pending
						</Text>
						<Text className="text-slate-400">
							Awaiting processing
						</Text>
					</div>
				</Space>
			</Select.Option>

			<Select.Option
				value="working"
				disabled={isOptionDisabled("working")}
				style={getOptionStyle("working")}
			>
				<Space>
					<Badge
						color={
							isOptionDisabled("working") ? "#cbd5e1" : "#3b82f6"
						}
					/>
					<div className="flex flex-col">
						<Text
							className={
								isOptionDisabled("working")
									? "text-slate-400 font-medium"
									: "text-slate-700 font-medium"
							}
						>
							Working
						</Text>
						<Text className="text-slate-400">
							Laundry in progress
						</Text>
					</div>
				</Space>
			</Select.Option>

			<Select.Option
				value="completed"
				disabled={isOptionDisabled("completed")}
				style={getOptionStyle("completed")}
			>
				<Space>
					<Badge
						color={
							isOptionDisabled("completed")
								? "#cbd5e1"
								: "#10b981"
						}
					/>
					<div className="flex flex-col">
						<Text
							className={
								isOptionDisabled("completed")
									? "text-slate-400 font-medium"
									: "text-slate-700 font-medium"
							}
						>
							Completed
						</Text>
						<Text className="text-slate-400">
							Ready for pickup/delivery
						</Text>
					</div>
				</Space>
			</Select.Option>

			<Select.Option
				value="delivered"
				disabled={isOptionDisabled("delivered")}
				style={getOptionStyle("delivered")}
			>
				<Space>
					<Badge
						color={
							isOptionDisabled("delivered")
								? "#cbd5e1"
								: "#6366f1"
						}
					/>
					<div className="flex flex-col">
						<Text
							className={
								isOptionDisabled("delivered")
									? "text-slate-400 font-medium"
									: "text-slate-700 font-medium"
							}
						>
							Delivered
						</Text>
						<Text className="text-slate-400">
							Item reached customer
						</Text>
					</div>
				</Space>
			</Select.Option>

			<Select.Option
				value="owed"
				disabled={isOptionDisabled("owed")}
				style={getOptionStyle("owed")}
			>
				<Space>
					<Badge
						color={isOptionDisabled("owed") ? "#cbd5e1" : "#ef4444"}
					/>
					<div className="flex flex-col">
						<Text
							className={
								isOptionDisabled("owed")
									? "text-slate-400 font-medium"
									: "text-rose-600 font-bold"
							}
						>
							Owed / Debt
						</Text>
						<Text className="text-slate-400 italic">
							Payment not yet cleared
						</Text>
					</div>
				</Space>
			</Select.Option>
		</Select>
	);
};

export default OrderStatusSelect;
