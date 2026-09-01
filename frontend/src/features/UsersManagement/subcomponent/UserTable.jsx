import { useCallback, useEffect, useRef } from 'react';

import { Table, Button, Space, Tag, Badge, Typography } from 'antd';
import {
	EditOutlined,
	DeleteOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const UsersTable = ({ data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, debouncedName, debouncedPhone,
	setSelectedUser, setEditModalVisible, setDeleteModalVisible }) => {

	const allUsers = data?.pages.flatMap(page => page.results) || [];
	const tableRef = useRef(null);

	const handleScroll = useCallback((e) => {
		const { scrollTop, scrollHeight, clientHeight } = e.target;

		if (scrollHeight - scrollTop <= clientHeight + 50) {
			if (hasNextPage && !isFetchingNextPage) {
				fetchNextPage();
			}
		}
	}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

	useEffect(() => {
		const tableBody = tableRef.current?.querySelector('.ant-table-body');
		if (tableBody) {
			tableBody.addEventListener('scroll', handleScroll);
			return () => tableBody.removeEventListener('scroll', handleScroll);
		}
	}, [handleScroll]);

	useEffect(() => {
		// Reset scroll to top whenever filters change
		const tableBody = tableRef.current?.querySelector('.ant-table-body');
		if (tableBody) {
			tableBody.scrollTop = 0;
		}
	}, [debouncedName, debouncedPhone]);

	// UI states ///////////////////////////////////////////////////////////////////////////////
	const columns = [
		{
			title: <Text strong className="text-slate-400 text-[11px] uppercase">Name</Text>,
			dataIndex: 'user_name',
			width: 200,
			render: (text) => <Text className="font-semibold text-slate-700">{text}</Text>
		},
		{
			title: <Text strong className="text-slate-400 text-[11px] uppercase">Phone</Text>,
			dataIndex: 'user_phone',
			width: 150,
			render: (text) => <Text className="text-slate-500">{text}</Text>
		},
		{
			title: <Text strong className="text-slate-400 text-[11px] uppercase">Role</Text>,
			dataIndex: 'user_role',
			width: 120,
			render: (role) => {
				const colors = { admin: 'purple', manager: 'blue', employee: 'default' };
				return (
					<Tag color={colors[role]} className="rounded-full px-3 uppercase text-[10px] font-bold border-none">
						{role}
					</Tag>
				);
			}
		},
		{
			title: <Text strong className="text-slate-400 text-[11px] uppercase">Status</Text>,
			dataIndex: 'user_status',
			width: 120,
			render: (status) => (
				<Badge
					status={status === 'active' ? 'success' : 'error'}
					text={<span className={`text-xs font-medium ${status === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>
						{status.charAt(0).toUpperCase() + status.slice(1)}
					</span>}
				/>
			)
		},
		{
			title: <Text strong className="text-slate-400 text-[11px] uppercase">Actions</Text>,
			key: 'action',
			fixed: 'right',
			width: 120,
			render: (_, record) => (
				<Space size="small">
					<Button
						type="text"
						className="flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"
						icon={<EditOutlined />}
						onClick={() => {
							setSelectedUser(record);
							setEditModalVisible(true);
						}}
					/>
					<Button
						type="text"
						danger
						className="flex items-center justify-center hover:bg-rose-50 rounded-lg"
						icon={<DeleteOutlined />}
						onClick={() => {
							setSelectedUser(record);
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
				dataSource={allUsers}
				rowKey="user_id"
				loading={isLoading || isFetchingNextPage}
				pagination={false}
				scroll={{ y: '40vh' }}
				rowClassName="group hover:bg-slate-50/80 transition-all cursor-default"
			/>
			{isFetchingNextPage && (
				<div className="py-4 text-center bg-slate-50/50 border-t border-slate-100">
					<Space>
						<Badge status="processing" />
						<Text className="text-slate-400 text-xs">Loading more users...</Text>
					</Space>
				</div>
			)}
		</div>

	);
};

export default UsersTable;