import { useCallback, useEffect, useRef } from "react";

import { Table, Button, Typography } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

const { Text } = Typography;

const CustomerTable = ({
	data,
	fetchNextPage,
	hasNextPage,
	isFetchingNextPage,
	isLoading,
	debouncedName,
	debouncedPhone,
	setSelectedCustomer,
	setEditModalVisible,
	setDeleteModalVisible,
}) => {
	const allCustomers = data?.pages.flatMap((page) => page.results) || [];
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
	}, [debouncedName, debouncedPhone]);

	// UI states ///////////////////////////////////////////////////////////////////////////////
	const columns = [
		{
			title: (
				<span className="text-slate-400 uppercase tracking-wider font-bold">
					Name
				</span>
			),
			dataIndex: "customer_name",
			width: 200,
			render: (text) => (
				<div className="flex flex-col">
					<Text
						strong
						className="text-slate-700"
					>
						{text}
					</Text>
					<Text className="text-slate-400 md:hidden italic">
						Customer
					</Text>
				</div>
			),
		},
		{
			title: (
				<span className="text-slate-400 uppercase tracking-wider font-bold">
					Phone
				</span>
			),
			dataIndex: "customer_phone",
			width: 150,
			render: (text) => (
				<span className="font-mono text-slate-600">{text}</span>
			),
		},
		{
			title: (
				<span className="text-slate-400 uppercase tracking-wider font-bold">
					Address
				</span>
			),
			dataIndex: "customer_address",
			ellipsis: true,
			render: (text) => (
				<span className="text-slate-500 truncate block">{text}</span>
			),
		},
		{
			title: (
				<span className="text-slate-400 uppercase tracking-wider font-bold text-center block">
					Points
				</span>
			),
			dataIndex: "points",
			width: 120,
			align: "center",
			render: (points) => (
				<div
					className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full font-medium border
        ${
			points > 0
				? "bg-amber-50 text-amber-700 border-amber-100"
				: "bg-slate-50 text-slate-400 border-slate-100"
		}
      `}
				>
					{points.toLocaleString()} pts
				</div>
			),
		},
		{
			title: (
				<span className="text-slate-400 uppercase tracking-wider font-bold text-center block">
					Action
				</span>
			),
			key: "action",
			fixed: "right",
			width: 100,
			render: (_, record) => (
				<div className="flex items-center justify-center gap-1">
					<Button
						type="text"
						size="small"
						className="hover:!bg-indigo-50 hover:!text-indigo-600 text-slate-400 transition-colors"
						icon={<EditOutlined className="text-base" />}
						onClick={() => {
							setSelectedCustomer(record);
							setEditModalVisible(true);
						}}
					/>
					<Button
						type="text"
						size="small"
						className="hover:!bg-rose-50 hover:!text-rose-500 text-slate-400 transition-colors"
						icon={<DeleteOutlined className="text-base" />}
						onClick={() => {
							setSelectedCustomer(record);
							setDeleteModalVisible(true);
						}}
					/>
				</div>
			),
		},
	];

	return (
		<div
			ref={tableRef}
			className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm"
		>
			<Table
				columns={columns}
				dataSource={allCustomers}
				rowKey="customer_id"
				loading={isLoading || isFetchingNextPage}
				pagination={false}
				scroll={{ y: "40vh", x: 700 }}
				className="premium-table"
				// This makes the table body clean and minimal
				rowClassName="group hover:bg-slate-50 transition-colors cursor-default"
			/>
		</div>
	);
};

export default CustomerTable;
