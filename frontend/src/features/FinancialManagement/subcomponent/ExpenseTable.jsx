import { useCallback, useEffect, useRef } from "react";
import { Table, Button, Space, Tag, Typography, Badge } from "antd";
import dayjs from "dayjs";

import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

const { Text } = Typography;
const ExpenseTable = ({
	data,
	fetchNextPage,
	hasNextPage,
	isFetchingNextPage,
	isLoading,
	creatorId,
	isExpense,
	debouncedDate,
	setSelectedTicket,
	setEditModalVisible,
	setDeleteModalVisible,
}) => {
	const allTickets = data?.pages.flatMap((page) => page.results) || [];
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
		// Reset scroll to top whenever filters change
		const tableBody = tableRef.current?.querySelector(".ant-table-body");
		if (tableBody) {
			tableBody.scrollTop = 0;
		}
	}, [isExpense, debouncedDate, creatorId]);

	// UI states ///////////////////////////////////////////////////////////////////////////////
	const columns = [
		{
			title: (
				<Text
					strong
					className="text-slate-400 uppercase"
				>
					Reason
				</Text>
			),
			dataIndex: "reason",
			width: 220,
			render: (text) => (
				<Text
					className="font-semibold text-slate-700 block truncate text-xl"
					title={text}
				>
					{text || "No reason provided"}
				</Text>
			),
		},
		{
			title: (
				<Text
					strong
					className="text-slate-400 uppercase"
				>
					Date & Time
				</Text>
			),
			dataIndex: "ticket_date",
			width: 180,
			render: (date) => (
				<div className="flex flex-col">
					<Text className="text-slate-600 text-xl">
						{dayjs(date).format("DD/MM/YYYY")}
					</Text>
					<Text className="text-slate-400 text-lg">
						{dayjs(date).format("HH:mm:ss")}
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
					Logged By
				</Text>
			),
			dataIndex: "user_name",
			width: 150,
			render: (name, record) => (
				<div className="flex flex-col">
					<Text className="text-slate-600 font-medium text-xl">
						{name}
					</Text>
					<Text className="text-slate-400 text-lg">
						{record.user_phone}
					</Text>
				</div>
			),
		},
		{
			title: (
				<Text
					strong
					className="text-slate-400 uppercase ml-auto text-right"
				>
					Amount
				</Text>
			),
			dataIndex: "amount",
			width: 160,
			align: "right",
			render: (amount, record) => (
				<div
					className={`px-3 py-1 rounded-lg inline-block font-mono font-bold ${
						record.is_expense
							? "bg-rose-50 text-rose-600"
							: "bg-emerald-50 text-emerald-600"
					}`}
				>
					{record.is_expense ? "↓" : "↑"}{" "}
					{new Intl.NumberFormat("vi-VN", {
						style: "currency",
						currency: "VND",
					}).format(amount * 1000)}
				</div>
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
			key: "action",
			fixed: "right",
			width: 100,
			render: (_, record) => (
				<Space size="small">
					<Button
						type="text"
						size="middle"
						className="hover:bg-indigo-50 hover:text-indigo-600 rounded-md"
						icon={<EditOutlined className="text-base" />}
						onClick={() => {
							setSelectedTicket(record);
							setEditModalVisible(true);
						}}
					/>
					<Button
						type="text"
						danger
						size="middle"
						className="hover:bg-rose-50 rounded-md"
						icon={<DeleteOutlined className="text-base" />}
						onClick={() => {
							setSelectedTicket(record);
							setDeleteModalVisible(true);
						}}
					/>
				</Space>
			),
		},
	];

	return (
		<div ref={tableRef}>
			<Table
				columns={columns}
				dataSource={allTickets}
				rowKey="ticket_id"
				loading={isLoading || isFetchingNextPage}
				pagination={false}
				scroll={{ y: "40vh" }}
				bordered
				rowClassName={(record, index) =>
					`group transition-colors ${index % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`
				}
			/>
			{isFetchingNextPage && (
				<div className="p-4 flex justify-center items-center gap-3 bg-slate-50/50">
					<div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
					<Text className="text-slate-400 text-xs">
						Syncing ledger records...
					</Text>
				</div>
			)}
		</div>
	);
};

export default ExpenseTable;
