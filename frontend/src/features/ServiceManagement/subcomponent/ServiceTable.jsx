import { useCallback, useEffect, useRef } from "react";

import { Table, Button, Space, Tag, Typography } from "antd";
import {
	EditOutlined,
	DeleteOutlined,
	AppstoreOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
const ServiceTable = ({
	data,
	fetchNextPage,
	hasNextPage,
	isFetchingNextPage,
	isLoading,
	debouncedName,
	setSelectedService,
	setEditModalVisible,
	setDeleteModalVisible,
}) => {
	const allServices = data?.pages.flatMap((page) => page.results) || [];
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
	}, [debouncedName]);

	// UI states ///////////////////////////////////////////////////////////////////////////////
	const columns = [
		{
			title: (
				<Text
					strong
					className="text-slate-400 uppercase"
				>
					Service Offering
				</Text>
			),
			dataIndex: "service_name",
			width: 250,
			render: (text) => (
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
						<AppstoreOutlined className="text-indigo-500 text-xs" />
					</div>
					<Text className="font-bold text-slate-700">{text}</Text>
				</div>
			),
		},
		{
			title: (
				<Text
					strong
					className="text-slate-400 uppercase"
				>
					Billing Unit
				</Text>
			),
			dataIndex: "service_unit",
			width: 150,
			render: (unit) => (
				<Tag className="rounded-md px-2 py-0.5 bg-slate-100 border-slate-200 text-slate-600 font-medium lowercase">
					{unit}
				</Tag>
			),
		},
		{
			title: (
				<Text
					strong
					className="text-slate-400 uppercase"
				>
					Price/Unit
				</Text>
			),
			dataIndex: "service_price_per_unit",
			width: 180,
			render: (price) => (
				<Text className="font-mono font-bold text-indigo-600 text-base">
					{new Intl.NumberFormat("vi-VN", {
						style: "currency",
						currency: "VND",
					}).format(price * 1000)}
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
			key: "action",
			fixed: "right",
			width: 120,
			render: (_, record) => (
				<Space size="small">
					<Button
						type="text"
						className="hover:bg-amber-50 hover:text-amber-600 rounded-lg"
						icon={<EditOutlined />}
						onClick={() => {
							setSelectedService(record);
							setEditModalVisible(true);
						}}
					/>
					<Button
						type="text"
						danger
						className="hover:bg-rose-50 rounded-lg"
						icon={<DeleteOutlined />}
						onClick={() => {
							setSelectedService(record);
							setDeleteModalVisible(true);
						}}
					/>
				</Space>
			),
		},
	];

	return (
		<div
			ref={tableRef}
			className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
		>
			<Table
				columns={columns}
				dataSource={allServices}
				rowKey="service_id"
				loading={isLoading || isFetchingNextPage}
				pagination={false}
				scroll={{ y: "40vh" }}
				// Add a clean hover state to the entire row
				rowClassName="group transition-all hover:bg-slate-50/50"
			/>

			{/* Footer indicator if you have infinite scroll active here too */}
			{isFetchingNextPage && (
				<div className="py-3 text-center bg-slate-50/30 border-t border-slate-100">
					<Text className="text-slate-400 animate-pulse uppercase tracking-widest font-bold">
						Refreshing Catalog...
					</Text>
				</div>
			)}
		</div>
	);
};

export default ServiceTable;
