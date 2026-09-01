import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectSpendingsFilters, setFilters } from "./spendingsSlice.js";

import { Card, Space, Button, message, Typography } from "antd";
import { PlusOutlined, SafetyOutlined } from "@ant-design/icons";

import DateSelection from "../../assets/components/DateSelector.jsx";
import TicketTypeSelector from "./subcomponent/TicketTypeSelector.jsx";
import ExpenseTable from "./subcomponent/ExpenseTable.jsx";
import ExpenseModal from "./subcomponent/ExpenseModal.jsx";
import DeleteConfirmationModal from "../../assets/components/DeleteConfirmationModal.jsx";

import {
	useGetSpendingsInfiniteQuery,
	useUpdateSpendingMutation,
	useCreateSpendingMutation,
	useDeleteSpendingMutation,
} from "./spendingsApiSlice.js";

import { handleApiError } from "../../utils/errorHandler.js";

const { Title, Text } = Typography;
const FinancialManagementPage = () => {
	// UI states //////////////////////////////////////////////////////////////////////
	const [messageApi, contextHolder] = message.useMessage();

	const [entryModalVisible, setEntryModalVisible] = useState(false);
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);

	// Data states ///////////////////////////////////////////////////////////////////////
	const [selectedTicket, setSelectedTicket] = useState(null);
	const dispatch = useDispatch();

	const getPersistedKey = (ticketId) => {
		const storagekey = ticketId
			? `idemp_edit_spending_${ticketId}`
			: `idemp_create_spending`;
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
	const { creator_id, is_expense, date } = useSelector(
		selectSpendingsFilters,
	);

	const onSearchChange = (field, value) => {
		dispatch(setFilters({ [field]: value }));
	};

	// Handle fetch ////////////////////////////
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useGetSpendingsInfiniteQuery({
			creator_id,
			is_expense,
			date,
			limit: 50,
		});

	// Handle update ///////////////////////////
	const [updateSpending, { isLoading: isUpdating }] =
		useUpdateSpendingMutation();

	const handleUpdateSpending = async (id, patchData, idempotencyKey) => {
		await updateSpending({
			ticket_id: id,
			...patchData,
			headers: {
				"Idempotency-Key": idempotencyKey,
			},
		}).unwrap();
		messageApi.success("Ticket updated successfully!");
	};

	// Handle create //////////////////////////
	const [createSpending, { isLoading: isCreating }] =
		useCreateSpendingMutation();

	const handleCreateSpending = async (spendingsData, idempotencyKey) => {
		await createSpending({
			...spendingsData,
			headers: {
				"Idempotency-Key": idempotencyKey,
			},
		}).unwrap();
		messageApi.success("Service created successfully!");
	};

	// Handle delete //////////////////////////
	const [deleteSpending, { isLoading: isDeleting }] =
		useDeleteSpendingMutation();

	const handleDeleteSpending = async (id) => {
		await deleteSpending({
			spendings_id: id,
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
							Financial Ledger
						</Title>
						<Text className="text-slate-400 font-medium">
							Tracking business expenses and daily income
						</Text>
					</div>

					<Button
						type="primary"
						icon={<PlusOutlined />}
						size="large"
						className="bg-emerald-600 hover:bg-emerald-700 h-11 px-8 rounded-xl shadow-lg shadow-emerald-100 flex items-center justify-center font-semibold border-none"
						onClick={() => {
							setSelectedTicket(null);
							setEntryModalVisible(true);
						}}
					>
						Add Ticket
					</Button>
				</div>

				{/* --- Table Card --- */}
				<Card
					className="shadow-sm border-slate-100 rounded-2xl overflow-hidden"
					styles={{ body: { padding: "0" } }}
				>
					{/* Control Bar */}
					<div className="p-5 border-b border-slate-50 bg-slate-50/50 flex flex-wrap gap-8 items-center justify-between">
						<Space
							size="large"
							className="flex-wrap"
						>
							<div className="flex flex-col gap-1">
								<Text
									strong
									className="uppercase text-indigo-500 ml-1"
								>
									Filter by Date
								</Text>
								<DateSelection
									onSearchChange={onSearchChange}
									value={date}
								/>
							</div>

							<div className="flex flex-col gap-1">
								<Text
									strong
									className="uppercase text-indigo-500 ml-1"
								>
									Transaction Category
								</Text>
								<TicketTypeSelector
									onSearchChange={onSearchChange}
								/>
							</div>
						</Space>

						{/* Optional: Summary stat for the view */}
						<div className="flex items-center gap-2 text-slate-400 text-sm bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
							<div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
							<span className="font-medium text-slate-500">
								Live Database
							</span>
						</div>
					</div>

					<div className="p-2">
						<ExpenseTable
							data={data}
							fetchNextPage={fetchNextPage}
							hasNextPage={hasNextPage}
							isFetchingNextPage={isFetchingNextPage}
							isLoading={isLoading}
							debouncedDate={date}
							isExpense={is_expense}
							setSelectedTicket={setSelectedTicket}
							setEditModalVisible={setEntryModalVisible}
							setDeleteModalVisible={setDeleteModalVisible}
						/>
					</div>
				</Card>
			</div>
			<ExpenseModal
				visible={entryModalVisible}
				onCancel={() => setEntryModalVisible(false)}
				onSave={async (values) => {
					if (isUpdating || isCreating) return;
					const { key, clear } = getPersistedKey(
						selectedTicket?.service_id,
					);
					try {
						if (selectedTicket) {
							await handleUpdateSpending(
								selectedTicket?.ticket_id,
								values,
							);
						} else {
							await handleCreateSpending(values, key);
						}

						// SUCCESS: Transaction committed on BE. Clear storage.
						clear();
						setEntryModalVisible(false);
					} catch (error) {
						handleApiError(error, clear);
					}
				}}
				editingExpense={selectedTicket}
				isUpdating={isUpdating || isCreating}
			/>
			<DeleteConfirmationModal
				visible={deleteModalVisible}
				onConfirm={async () => {
					if (isDeleting) return;
					try {
						await handleDeleteSpending(selectedTicket?.ticket_id);

						// SUCCESS: Transaction committed on BE, close modal
						setDeleteModalVisible(false);
					} catch (error) {
						handleApiError(error);
					}
				}}
				onCancel={() => setDeleteModalVisible(false)}
				item={selectedTicket?.ticket_id}
				processing={isDeleting}
			/>
		</div>
	);
};

export default FinancialManagementPage;
