import { useCallback, useEffect, useRef } from "react";
import { Table, Button, Space, Tag, Typography, Tooltip } from "antd";
import {
	EditOutlined,
	DeleteOutlined,
	UserOutlined,
	CalendarOutlined,
	ClockCircleOutlined,
	SyncOutlined,
	CheckCircleOutlined,
	InfoCircleFilled,
	WarningOutlined,
	FlagOutlined,
} from "@ant-design/icons";

import OrderDetailNestedFragment from "./OrderDetailNestedTable.jsx";

const { Text } = Typography;

const OrdersTable = ({
	data,
	fetchNextPage,
	hasNextPage,
	isFetchingNextPage,
	isLoading,
	handler_id,
	customer_id,
	order_status,
	date,
	setSelectedOrder,
	setEdittingOrder,
	setEditModalVisible,
	setDeleteModalVisible,
}) => {
	const allOrders = data?.pages.flatMap((page) => page.results) || [];
	const tableRef = useRef(null);

	const handleScroll = useCallback(
		(e) => {
			const { scrollTop, scrollHeight, clientHeight } = e.target;
			if (scrollHeight - scrollTop <= clientHeight + 50) {
				if (hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			}
		},
		[fetchNextPage, hasNextPage, isFetchingNextPage],
	);

	useEffect(() => {
		const tableBody = tableRef.current?.querySelector(".ant-table-body");
		if (tableBody) {
			tableBody.addEventListener("scroll", handleScroll);
			return () => tableBody.removeEventListener("scroll", handleScroll);
		}
	}, [handleScroll]);

	useEffect(() => {
		const tableBody = tableRef.current?.querySelector(".ant-table-body");
		if (tableBody) {
			tableBody.scrollTop = 0;
		}
	}, [handler_id, customer_id, order_status, date]);

	const formatCurrency = (val) =>
		new Intl.NumberFormat("vi-VN", {
			style: "currency",
			currency: "VND",
		}).format((val || 0) * 1000);

	const formatDate = (text) => {
		if (!text) return null;
		return {
			date: new Date(text).toLocaleDateString("vi-VN"),
			time: new Date(text).toLocaleTimeString("vi-VN", {
				hour: "2-digit",
				minute: "2-digit",
			}),
		};
	};

	const columns = [
		{
			title: (
				<Text
					strong
					className="text-slate-400 uppercase"
				>
					Customer
				</Text>
			),
			dataIndex: "customer_name",
			key: "customer_name",
			width: 210,
			render: (text, record) => (
				<div className="flex flex-col">
					<Text className="text-xl font-semibold text-slate-800">
						{text || "Unknown Customer"}
					</Text>
					<Text
						type="secondary"
						className="text-lg font-mono"
					>
						{record.customer_phone || "No phone"}
					</Text>
				</div>
			),
		},
		{
			title: (
				<Text
					strong
					className="text-slate-400 uppercase"
				>
					Timeline
				</Text>
			),
			key: "timeline",
			width: 250,
			render: (_, record) => {
				const start = formatDate(record.order_start_date);
				const pickup = formatDate(record.planned_pickup_date);
				const end = formatDate(record.order_end_date);

				return (
					<div className="flex flex-col gap-1.5 py-1 text-lg text-slate-700">
						{/* Start Date */}
						<div
							className="flex items-center gap-1.5"
							title="Order Start Date"
						>
							<CalendarOutlined className="text-slate-400 flex-shrink-0 text-sm" />
							<span className="font-medium text-slate-800">
								Start:
							</span>
							{start ? (
								<span className="text-slate-700 font-medium">
									{start.date}{" "}
									<span className="text-slate-400">
										({start.time})
									</span>
								</span>
							) : (
								<span className="text-slate-400">N/A</span>
							)}
						</div>

						{/* Planned Pickup Date */}
						<div
							className="flex items-center gap-1.5"
							title="Planned Pickup Date"
						>
							<FlagOutlined className="text-indigo-400 flex-shrink-0 text-sm" />
							<span className="font-medium text-slate-800">
								Planned Pickup:
							</span>
							{pickup ? (
								<span className="text-slate-700 font-medium">
									{pickup.date}{" "}
									<span className="text-slate-400">
										({pickup.time})
									</span>
								</span>
							) : (
								<span className="text-slate-400">Not set</span>
							)}
						</div>

						{/* Actual End Date */}
						<div
							className="flex items-center gap-1.5"
							title="Actual Order Closing Date"
						>
							<CheckCircleOutlined className="text-emerald-500 flex-shrink-0 text-sm" />
							<span className="font-medium text-slate-800">
								Closed (End):
							</span>
							{end ? (
								<span className="text-slate-700 font-medium">
									{end.date}{" "}
									<span className="text-slate-400">
										({end.time})
									</span>
								</span>
							) : (
								<span className="text-slate-400 italic">
									In progress / Active
								</span>
							)}
						</div>
					</div>
				);
			},
		},
		{
			title: (
				<Text
					strong
					className="text-slate-400 uppercase"
				>
					Handlder
				</Text>
			),
			dataIndex: "handler_name",
			key: "handler_name",
			width: 170,
			render: (text) => (
				<Space size={8}>
					<div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 flex-shrink-0">
						<UserOutlined />
					</div>
					<Text className="text-slate-800 text-lg truncate max-w-[110px]">
						{text || "Unassigned"}
					</Text>
				</Space>
			),
		},
		{
			title: (
				<Text
					strong
					className="text-slate-400 uppercase"
				>
					Finished by
				</Text>
			),
			dataIndex: "closed_by_name",
			key: "closer_name",
			width: 170,
			render: (text) => (
				<Space size={8}>
					<div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 flex-shrink-0">
						<UserOutlined />
					</div>
					<Text className="text-slate-800 text-lg truncate max-w-[110px]">
						{text || "—"}
					</Text>
				</Space>
			),
		},
		{
			title: (
				<Text
					strong
					className="text-slate-400 uppercase"
				>
					Status
				</Text>
			),
			dataIndex: "order_status",
			key: "order_status",
			align: "center",
			width: 150,
			render: (status) => {
				const config = {
					pending: {
						color: "#f59e0b",
						bg: "#fffbeb",
						icon: <ClockCircleOutlined className="text-lg" />,
						label: "Pending",
					},
					working: {
						color: "#3b82f6",
						bg: "#eff6ff",
						icon: (
							<SyncOutlined
								spin
								className="text-lg"
							/>
						),
						label: "In Progress", // Or "Processing" / "Washing"
					},
					completed: {
						color: "#6366f1",
						bg: "#ecfdf5",
						icon: <InfoCircleFilled className="text-lg" />,
						label: "Completed",
					},
					delivered: {
						color: "#10b981",
						bg: "#eef2ff",
						icon: <CheckCircleOutlined className="text-lg" />,
						label: "Delivered",
					},
					owed: {
						color: "#ef4444",
						bg: "#fff1f2",
						icon: <WarningOutlined className="text-lg" />,
						label: "Payment Due", // Or "Unpaid" / "Outstanding"
					},
				};

				const style = config[status] || {
					color: "#64748b",
					bg: "#f8fafc",
					label: status || "Unknown",
				};

				return (
					<Tag
						bordered={false}
						style={{
							color: style.color,
							backgroundColor: style.bg,
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
						}}
						className="uppercase font-bold text-md px-3 py-1 rounded-full tracking-wider shadow-sm"
					>
						{style.icon}
						{style.label}
					</Tag>
				);
			},
		},
		{
			title: (
				<Text
					strong
					className="text-slate-400 uppercase"
				>
					Total Price
				</Text>
			),
			dataIndex: "total_cost",
			key: "total_cost",
			align: "right",
			width: 150,
			render: (val) => (
				<Text className="font-mono font-bold text-slate-900 text-xl">
					{formatCurrency(val)}
				</Text>
			),
		},
		{
			title: (
				<Text
					strong
					className="text-slate-400 uppercase"
				>
					Actions
				</Text>
			),
			key: "actions",
			align: "center",
			width: 100,
			render: (_, record) => (
				<Space size="small">
					<Tooltip title="Edit Order">
						<Button
							type="text"
							size="middle"
							className="text-blue-600 hover:bg-blue-50"
							icon={<EditOutlined className="text-sm" />}
							onClick={(e) => {
								e.stopPropagation();
								setEdittingOrder(record.order_id);
								setEditModalVisible(true);
							}}
						/>
					</Tooltip>
					<Tooltip title="Delete Order">
						<Button
							type="text"
							size="middle"
							danger
							className="hover:bg-red-50"
							icon={<DeleteOutlined className="text-sm" />}
							onClick={(e) => {
								e.stopPropagation();
								setSelectedOrder(record);
								setDeleteModalVisible(true);
							}}
						/>
					</Tooltip>
				</Space>
			),
		},
	];

	return (
		<div
			ref={tableRef}
			className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
		>
			<Table
				columns={columns}
				dataSource={allOrders}
				rowKey="order_id"
				loading={isLoading}
				pagination={false}
				scroll={{ y: "60vh", x: 1050 }}
				className="orders-custom-table"
				expandable={{
					expandedRowRender: (record) => (
						<OrderDetailNestedFragment id={record.order_id} />
					),
					expandRowByClick: true,
					columnWidth: 48,
				}}
				rowClassName={(_, index) =>
					`cursor-pointer transition-colors ${
						index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
					} hover:bg-indigo-50/40`
				}
			/>

			{isFetchingNextPage && (
				<div className="p-4 text-center border-t border-slate-100 bg-slate-50/50">
					<Text
						type="secondary"
						className="text-xs animate-pulse"
					>
						Loading more orders...
					</Text>
				</div>
			)}
		</div>
	);
};

export default OrdersTable;
