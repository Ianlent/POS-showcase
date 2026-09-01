import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectCustomersFilters, setFilters } from "./customerSlice.js";

import { Input, Card, Space, Button, Typography, message } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";

import CustomerTable from "./subcomponent/CustomerTable.jsx";
import CustomerModal from "./subcomponent/CustomerModal.jsx";
import DeleteConfirmationModal from "../../assets/components/DeleteConfirmationModal.jsx";

import {
	useGetCustomersInfiniteQuery,
	useUpdateCustomerMutation,
	useCreateCustomerMutation,
	useDeleteCustomerMutation,
} from "./customerApiSlice.js";
import useDebounce from "../../hooks/useDebounce.js";

import { handleApiError } from "../../utils/errorHandler.js";

const { Title, Text } = Typography;

const CustomerManagementPage = () => {
	// UI states //////////////////////////////////////////////////////////////////////
	const [messageApi, contextHolder] = message.useMessage();

	const [entryModalVisible, setEntryModalVisible] = useState(false);
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
	const [selectedCustomer, setSelectedCustomer] = useState(null);

	const dispatch = useDispatch();

	// Data states ///////////////////////////////////////////////////////////////////////
	const getPersistedKey = (customerId) => {
		const storagekey = customerId
			? `idemp_edit_customer_${customerId}`
			: "idemp_create_customer";
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
	const { customer_name, customer_phone } = useSelector(
		selectCustomersFilters,
	);

	const debouncedName = useDebounce(customer_name, 500);
	const debouncedPhone = useDebounce(customer_phone, 500);

	const onSearchChange = (field, value) => {
		dispatch(setFilters({ [field]: value }));
	};

	// Handle fetch ////////////////////////////
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useGetCustomersInfiniteQuery({
			customer_name: debouncedName.trim(),
			customer_phone: debouncedPhone.trim(),
			limit: 20,
		});

	// Handle update ///////////////////////////
	const [updateCustomer, { isLoading: isUpdating }] =
		useUpdateCustomerMutation();

	const handleUpdateCustomer = async (id, patchData, idempotencyKey) => {
		await updateCustomer({
			customer_id: id,
			...patchData,
			headers: {
				"Idempotency-Key": idempotencyKey,
			},
		}).unwrap();
		messageApi.success("Customer updated successfully!");
	};

	// Handle create //////////////////////////
	const [createCustomer, { isLoading: isCreating }] =
		useCreateCustomerMutation();

	const handleCreateCustomer = async (customerData, idempotencyKey) => {
		await createCustomer({
			...customerData,
			headers: {
				"Idempotency-Key": idempotencyKey,
			},
		}).unwrap();
		messageApi.success("Customer created successfully!");
	};

	// Handle delete //////////////////////////
	const [deleteCustomer, { isLoading: isDeleting }] =
		useDeleteCustomerMutation();

	const handleDeleteCustomer = async (id) => {
		await deleteCustomer({
			customer_id: id,
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
							level={1}
							className="!m-0 !font-bold text-slate-800"
						>
							Customer Directory
						</Title>
						<Text className="text-xl  text-slate-400">
							View customer loyalty history, contact details, and
							account preferences
						</Text>
					</div>

					<Button
						type="primary"
						icon={<PlusOutlined />}
						size="large"
						className="bg-indigo-600 h-11 px-8 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center font-semibold"
						onClick={() => {
							setSelectedCustomer(null);
							setEntryModalVisible(true);
						}}
					>
						Add New Customer
					</Button>
				</div>

				{/* --- Main Data Section --- */}
				<Card
					className="shadow-sm border-slate-100 rounded-2xl overflow-hidden"
					styles={{ body: { padding: 0 } }}
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
									className="uppercase text-slate-400 ml-1 tracking-wider"
								>
									Customer Name
								</Text>
								<Input
									placeholder="Search names..."
									prefix={
										<SearchOutlined className="text-slate-400" />
									}
									className="w-64 rounded-xl h-10 border-slate-200 hover:border-indigo-300 focus:border-indigo-500 transition-all"
									value={customer_name}
									disabled={!!customer_phone}
									onChange={(e) =>
										onSearchChange(
											"customer_name",
											e.target.value,
										)
									}
								/>
							</div>

							<div className="flex flex-col gap-1">
								<Text
									strong
									className="uppercase text-slate-400 ml-1 tracking-wider"
								>
									Phone Number
								</Text>
								<Input
									placeholder="09xx..."
									prefix={
										<SearchOutlined className="text-slate-400" />
									}
									className="w-64 rounded-xl h-10 border-slate-200 hover:border-indigo-300 focus:border-indigo-500 transition-all"
									value={customer_phone}
									onChange={(e) =>
										onSearchChange(
											"customer_phone",
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
						<CustomerTable
							data={data}
							fetchNextPage={fetchNextPage}
							hasNextPage={hasNextPage}
							isFetchingNextPage={isFetchingNextPage}
							isLoading={isLoading}
							debouncedName={debouncedName}
							debouncedPhone={debouncedPhone}
							setSelectedCustomer={setSelectedCustomer}
							setEditModalVisible={setEntryModalVisible}
							setDeleteModalVisible={setDeleteModalVisible}
						/>
					</div>
				</Card>
			</div>

			{/* --- Modals --- */}
			<CustomerModal
				visible={entryModalVisible}
				onCancel={() => setEntryModalVisible(false)}
				onSave={async (values) => {
					if (isUpdating || isCreating) return;
					const { key, clear } = getPersistedKey(
						selectedCustomer?.customer_id,
					);
					try {
						if (selectedCustomer) {
							await handleUpdateCustomer(
								selectedCustomer?.customer_id,
								values,
								key,
							);
						} else {
							await handleCreateCustomer(values, key);
						}
						clear();
						setEntryModalVisible(false);
					} catch (error) {
						handleApiError(error, clear);
					}
				}}
				editingCustomer={selectedCustomer}
				isUpdating={isUpdating || isCreating}
			/>

			<DeleteConfirmationModal
				visible={deleteModalVisible}
				onConfirm={async () => {
					if (isDeleting) return;
					try {
						await handleDeleteCustomer(
							selectedCustomer?.customer_id,
						);
						setDeleteModalVisible(false);
					} catch (error) {
						handleApiError(error);
					}
				}}
				onCancel={() => setDeleteModalVisible(false)}
				item={selectedCustomer?.customer_name}
				processing={isDeleting}
			/>
		</div>
	);
};

export default CustomerManagementPage;
