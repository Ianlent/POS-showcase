import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectServicesFilters, setFilters } from "./serviceSlice.js";

import { Input, Card, Space, Button, Typography, message } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";

import ServicesTable from "./subcomponent/ServiceTable.jsx";
import ServiceModal from "./subcomponent/ServiceModal.jsx";
import DeleteConfirmationModal from "../../assets/components/DeleteConfirmationModal.jsx";

import {
	useGetServicesInfiniteQuery,
	useUpdateServiceMutation,
	useCreateServiceMutation,
	useDeleteServiceMutation,
} from "./serviceApiSlice.js";
import useDebounce from "../../hooks/useDebounce.js";

import { handleApiError } from "../../utils/errorHandler.js";

const { Title, Text } = Typography;
const ServiceManagementPage = () => {
	// UI states //////////////////////////////////////////////////////////////////////
	const [messageApi, contextHolder] = message.useMessage();

	const [entryModalVisible, setEntryModalVisible] = useState(false);
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);

	// Data states ///////////////////////////////////////////////////////////////////////
	const [selectedService, setSelectedService] = useState(null);
	const dispatch = useDispatch();

	const getPersistedKey = (serviceId) => {
		const storagekey = serviceId
			? `idemp_edit_service_${serviceId}`
			: `idemp_create_service`;
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
	const { service_name } = useSelector(selectServicesFilters);

	const debouncedName = useDebounce(service_name, 500);

	const onSearchChange = (field, value) => {
		dispatch(setFilters({ [field]: value }));
	};

	// Handle fetch ////////////////////////////
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useGetServicesInfiniteQuery({
			service_name: debouncedName.trim(),
			limit: 20,
		});

	// Handle update ///////////////////////////
	const [updateService, { isLoading: isUpdating }] =
		useUpdateServiceMutation();

	const handleUpdateService = async (id, patchData, idempotencyKey) => {
		await updateService({
			service_id: id,
			...patchData,
			headers: {
				"Idempotency-Key": idempotencyKey,
			},
		}).unwrap();
		messageApi.success("Service updated successfully!");
	};

	// Handle create //////////////////////////
	const [createService, { isLoading: isCreating }] =
		useCreateServiceMutation();

	const handleCreateService = async (serviceData, idempotencyKey) => {
		await createService({
			...serviceData,
			headers: {
				"Idempotency-Key": idempotencyKey,
			},
		}).unwrap();
		messageApi.success("Service created successfully!");
	};

	// Handle delete //////////////////////////
	const [deleteService, { isLoading: isDeleting }] =
		useDeleteServiceMutation();

	const handleDeleteService = async (id) => {
		await deleteService({
			service_id: id,
		}).unwrap();
		messageApi.success("Service deleted successfully!");
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
							Service Catalog
						</Title>
						<Text className="text-slate-400 font-medium">
							Manage available offerings, units, and base pricing
						</Text>
					</div>

					<Button
						type="primary"
						icon={<PlusOutlined />}
						size="large"
						className="bg-indigo-600 hover:bg-indigo-700 h-11 px-8 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center font-semibold border-none"
						onClick={() => {
							setSelectedService(null);
							setEntryModalVisible(true);
						}}
					>
						New Service
					</Button>
				</div>

				{/* --- Main Content Card --- */}
				<Card
					className="shadow-sm border-slate-100 rounded-2xl overflow-hidden"
					styles={{ body: { padding: "0" } }}
				>
					{/* Filter Toolbar */}
					<div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
						<div className="flex flex-col gap-1 w-full max-w-md">
							<Text
								strong
								className="uppercase text-indigo-500 ml-1"
							>
								Search Catalog
							</Text>
							<Input
								placeholder="Search service name..."
								prefix={
									<SearchOutlined className="text-slate-400" />
								}
								value={service_name}
								onChange={(e) =>
									onSearchChange(
										"service_name",
										e.target.value,
									)
								}
								className="rounded-xl h-10 border-slate-200 shadow-sm focus:border-indigo-400 hover:border-indigo-300"
								allowClear
							/>
						</div>
						<div className="flex items-center gap-2 text-slate-400 text-sm bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
							<div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
							<span className="font-medium text-slate-500">
								Live Database
							</span>
						</div>
					</div>

					{/* Table Area */}
					<div className="p-2">
						<ServicesTable
							data={data}
							fetchNextPage={fetchNextPage}
							hasNextPage={hasNextPage}
							isFetchingNextPage={isFetchingNextPage}
							isLoading={isLoading}
							debouncedName={debouncedName}
							setSelectedService={setSelectedService}
							setEditModalVisible={setEntryModalVisible}
							setDeleteModalVisible={setDeleteModalVisible}
						/>
					</div>
				</Card>
			</div>
			<ServiceModal
				visible={entryModalVisible}
				onCancel={() => setEntryModalVisible(false)}
				onSave={async (values) => {
					if (isUpdating || isCreating) return;
					const { key, clear } = getPersistedKey(
						selectedService?.service_id,
					);
					try {
						if (selectedService) {
							await handleUpdateService(
								selectedService?.service_id,
								values,
							);
						} else {
							await handleCreateService(values, key);
						}

						// SUCCESS: Transaction committed on BE. Clear storage.
						clear();
						setEntryModalVisible(false);
					} catch (error) {
						handleApiError(error, clear);
					}
				}}
				editingService={selectedService}
				isUpdating={isUpdating || isCreating}
			/>
			<DeleteConfirmationModal
				visible={deleteModalVisible}
				onConfirm={async () => {
					if (isDeleting) return;
					try {
						await handleDeleteService(selectedService?.service_id);

						// SUCCESS: Transaction committed on BE, close modal
						setDeleteModalVisible(false);
					} catch (error) {
						handleApiError(error);
					}
				}}
				onCancel={() => setDeleteModalVisible(false)}
				item={selectedService?.service_name}
				processing={isDeleting}
			/>
		</div>
	);
};

export default ServiceManagementPage;
