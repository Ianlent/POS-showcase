import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectUsersFilters, setFilters } from "./usersSlice.js";

import { Input, Card, Space, Button, Typography, message } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";

import UsersTable from "./subcomponent/UserTable.jsx";
import UserModal from "./subcomponent/UserModal.jsx";
import DeleteConfirmationModal from "../../assets/components/DeleteConfirmationModal.jsx";

import {
	useGetUsersInfiniteQuery,
	useUpdateUserMutation,
	useCreateUserMutation,
	useDeleteUserMutation,
} from "./usersApiSlice.js";
import useDebounce from "../../hooks/useDebounce.js";

import { handleApiError } from "../../utils/errorHandler.js";

const { Title, Text } = Typography;
const UserManagementPage = () => {
	// UI states //////////////////////////////////////////////////////////////////////
	const [messageApi, contextHolder] = message.useMessage();

	const [entryModalVisible, setEntryModalVisible] = useState(false);
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);

	// Data states ///////////////////////////////////////////////////////////////////////
	const [selectedUser, setSelectedUser] = useState(null);
	const dispatch = useDispatch();

	const getPersistedKey = (userId) => {
		const storagekey = userId
			? `idemp_edit_user_${userId}`
			: `idemp_create_user`;
		let raw = localStorage.getItem(storagekey);
		let keyData = raw ? JSON.parse(raw) : null;

		// Check if key is expired(24 hours)
		const isExpired = keyData && Date.now() - keyData.timestamp > 86400000;

		if (!keyData || isExpired) {
			keyData = {
				key: crypto.randomUUID(),
				timestamp: Date.now(),
			};
			localStorage.setItem(storagekey, JSON.stringify(keyData));
		}

		return {
			key: keyData.key,
			clear: () => localStorage.removeItem(storagekey),
		};
	};

	// Handle search /////////////////////////
	const { user_name, user_phone } = useSelector(selectUsersFilters);

	const debouncedName = useDebounce(user_name, 500);
	const debouncedPhone = useDebounce(user_phone, 500);

	const onSearchChange = (field, value) => {
		dispatch(setFilters({ [field]: value }));
	};

	// Handle fetch ////////////////////////////
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useGetUsersInfiniteQuery({
			user_name: debouncedName.trim(),
			user_phone: debouncedPhone.trim(),
			limit: 20,
		});

	// Handle update ///////////////////////////
	const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

	const handleUpdateUser = async (id, patchData, idempotencyKey) => {
		await updateUser({
			user_id: id,
			...patchData,
			headers: {
				"Idempotency-Key": idempotencyKey,
			},
		}).unwrap();
		messageApi.success("User updated successfully!");
	};

	// Handle create //////////////////////////
	const [createUser, { isLoading: isCreating }] = useCreateUserMutation();

	const handleCreateUser = async (customerData, idempotencyKey) => {
		await createUser({
			...customerData,
			headers: {
				"Idempotency-Key": idempotencyKey,
			},
		}).unwrap();
		messageApi.success("User created successfully!");
	};

	// Handle delete //////////////////////////
	const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

	const handleDeleteUser = async (id) => {
		await deleteUser({
			user_id: id,
		}).unwrap();
		messageApi.success("Customer deleted successfully!");
	};

	return (
		<div className="p-6 mx-auto">
			{contextHolder}

			<div className="flex flex-col gap-6">
				{/* --- Header Section --- */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<Title
							level={2}
							className="!m-0 !font-bold text-slate-800"
						>
							System Handlers
						</Title>
						<Text className="text-slate-400">
							Manage staff members and system access permissions
						</Text>
					</div>

					<Button
						type="primary"
						icon={<PlusOutlined />}
						size="large"
						className="bg-indigo-600 h-11 px-6 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center font-semibold"
						onClick={() => {
							setSelectedUser(null);
							setEntryModalVisible(true);
						}}
					>
						Add New Handler
					</Button>
				</div>

				{/* --- Main Data Table Section --- */}
				<Card
					className="shadow-sm border-slate-100 rounded-2xl overflow-hidden"
					styles={{ body: { padding: 0 } }} // Keep padding tight for the table
				>
					{/* Filter Toolbar */}
					<div className="p-5 border-b border-slate-50 bg-slate-50/50 flex flex-wrap gap-3 items-center justify-between">
						<Space
							size="middle"
							className="flex-wrap"
						>
							<div className="flex flex-col gap-1">
								<Text
									strong
									className="uppercase text-slate-400 ml-1"
								>
									Search by Name
								</Text>
								<Input
									placeholder="Type a name..."
									prefix={
										<SearchOutlined className="text-slate-400" />
									}
									className="w-64 rounded-xl h-10 border-slate-200 hover:border-indigo-300 focus:border-indigo-500 transition-all"
									value={user_name}
									disabled={!!user_phone}
									onChange={(e) =>
										onSearchChange(
											"user_name",
											e.target.value,
										)
									}
								/>
							</div>

							<div className="flex flex-col gap-1">
								<Text
									strong
									className="uppercase text-slate-400 ml-1"
								>
									Search by Phone
								</Text>
								<Input
									placeholder="09xx..."
									prefix={
										<SearchOutlined className="text-slate-400" />
									}
									className="w-64 rounded-xl h-10 border-slate-200 hover:border-indigo-300 focus:border-indigo-500 transition-all"
									value={user_phone}
									onChange={(e) =>
										onSearchChange(
											"user_phone",
											e.target.value,
										)
									}
								/>
							</div>
						</Space>

						<div className="flex items-center gap-2 text-slate-400 text-sm bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
							<div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
							<span className="font-medium text-slate-500">
								Live Database
							</span>
						</div>
					</div>

					{/* Table Content */}
					<div className="p-2">
						<UsersTable
							data={data}
							fetchNextPage={fetchNextPage}
							hasNextPage={hasNextPage}
							isFetchingNextPage={isFetchingNextPage}
							isLoading={isLoading}
							debouncedName={debouncedName}
							debouncedPhone={debouncedPhone}
							setSelectedUser={setSelectedUser}
							setEditModalVisible={setEntryModalVisible}
							setDeleteModalVisible={setDeleteModalVisible}
						/>
					</div>
				</Card>
			</div>

			<UserModal
				visible={entryModalVisible}
				onCancel={() => setEntryModalVisible(false)}
				onSave={async (values) => {
					if (isUpdating || isCreating) return;
					const { key, clear } = getPersistedKey(
						selectedUser?.user_id,
					);
					try {
						if (selectedUser) {
							await handleUpdateUser(
								selectedUser?.user_id,
								values,
							);
						} else {
							await handleCreateUser(values, key);
						}
						clear();
						setEntryModalVisible(false);
					} catch (error) {
						handleApiError(error, clear);
					}
				}}
				editingUser={selectedUser}
				isUpdating={isUpdating || isCreating}
			/>

			<DeleteConfirmationModal
				visible={deleteModalVisible}
				onConfirm={async () => {
					if (isDeleting) return;
					try {
						await handleDeleteUser(selectedUser?.user_id);
						setDeleteModalVisible(false);
					} catch (error) {
						handleApiError(error);
					}
				}}
				onCancel={() => setDeleteModalVisible(false)}
				item={selectedUser?.user_name}
				processing={isDeleting}
			/>
		</div>
	);
};

export default UserManagementPage;
