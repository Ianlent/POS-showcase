import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectOrdersFilters, setFilters } from "../ordersSlice.js";

import { message } from "antd";

import UpdateOrderModal from "../subcomponents/UpdateOrderModal.jsx";
import DeleteConfirmationModal from "../../../assets/components/DeleteConfirmationModal.jsx";

import OrdersTable from "../subcomponents/OrdersTable/OrdersMainTable.jsx";
import OrderStatusFilter from "../subcomponents/OrderStatusFilter.jsx";
import DateSelection from "../../../assets/components/DateSelector.jsx";

import {
	useGetOrdersInfiniteQuery,
	useGetOrderDetailsQuery,
	useUpdateOrderMutation,
	useDeleteOrderMutation,
} from "../ordersApiSlice.js";
import { handleApiError } from "../../../utils/errorHandler.js";
import useDebounce from "../../../hooks/useDebounce.js";

const OrderHistory = () => {
	// UI states //////////////////////////////////////////////////////////////////////
	const [updateOrderModalVisible, setUpdateOrderModalVisible] =
		useState(false);
	const [deleteOrderModalVisible, setDeleteModalVisible] = useState(false);

	const [messageApi, contextHolder] = message.useMessage();

	// Data states ///////////////////////////////////////////////////////////////////////
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [edittingOrderID, setEdittingOrderID] = useState(null);
	const dispatch = useDispatch();

	const getPersistedKey = (orderId) => {
		const storagekey = `idemp_edit_order_${orderId}`;
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

	// Handle search
	const { handler_id, customer_id, order_status, date } =
		useSelector(selectOrdersFilters);
	const debouncedStatus = useDebounce(order_status, 200);
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useGetOrdersInfiniteQuery({
			handler_id,
			customer_id,
			order_status: debouncedStatus,
			date,
			limit: 20,
		});

	const onSearchChange = (field, value) => {
		dispatch(setFilters({ [field]: value }));
	};

	// Handle getDetails
	const { data: orderDetails, isLoading: isLoadingDetails } =
		useGetOrderDetailsQuery(
			{ order_id: edittingOrderID },
			{ skip: !edittingOrderID },
		);

	// Handle update ///////////////////////////
	const [updateOrder, { isLoading: isUpdating }] = useUpdateOrderMutation();

	const handleUpdateOrder = async (id, patchData, idempotencyKey) => {
		await updateOrder({
			order_id: id,
			...patchData,
			headers: {
				"Idempotency-Key": idempotencyKey,
			},
		}).unwrap();
		messageApi.success("Order updated successfully!");
	};

	// Handle delete
	const [deleteOrder, { isLoading: isDeleting }] = useDeleteOrderMutation();

	const handleDeleteOrder = async (id) => {
		await deleteOrder({
			order_id: id,
		}).unwrap();
		messageApi.success("Order deleted successfully!");
	};

	return (
		<div className="p-6 mx-auto">
			{contextHolder}
			<div className="my-3 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
				<div className="flex flex-col">
					<span className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1.5">
						Filter by Status
					</span>
					<OrderStatusFilter onSearchChange={onSearchChange} />
				</div>

				<div className="flex flex-col">
					<span className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1.5">
						Date Range
					</span>
					<DateSelection
						onSearchChange={onSearchChange}
						value={date}
					/>
				</div>
			</div>
			<OrdersTable
				data={data}
				setSelectedOrder={setSelectedOrder}
				setEdittingOrder={setEdittingOrderID}
				setEditModalVisible={setUpdateOrderModalVisible}
				setDeleteModalVisible={setDeleteModalVisible}
				isFetchingNextPage={isFetchingNextPage}
				fetchNextPage={fetchNextPage}
				hasNextPage={hasNextPage}
				isLoading={isLoading}
				handler_id={handler_id}
				customer_id={customer_id}
				order_status={debouncedStatus}
				date={date}
			/>
			<DeleteConfirmationModal
				onConfirm={async () => {
					if (isDeleting) return;
					try {
						await handleDeleteOrder(selectedOrder?.order_id);

						// SUCCESS: Transaction committed on BE, close modal
						setDeleteModalVisible(false);
					} catch (error) {
						handleApiError(error);
					}
				}}
				visible={deleteOrderModalVisible}
				item={selectedOrder?.order_id}
				onCancel={() => setDeleteModalVisible(false)}
				processing={isDeleting}
			/>

			<UpdateOrderModal
				visible={updateOrderModalVisible}
				isUpdating={isUpdating}
				isLoading={isLoadingDetails}
				selectedOrder={orderDetails}
				onCancel={() => setUpdateOrderModalVisible(false)}
				onSuccess={async (patchData) => {
					const { key, clear } = getPersistedKey(edittingOrderID);
					try {
						await handleUpdateOrder(
							edittingOrderID,
							patchData,
							key,
						);
						message.success("Order updated successfully!");
						clear();
						setUpdateOrderModalVisible(false);
					} catch (err) {
						handleApiError(err, clear);
					}
				}}
			/>
		</div>
	);
};

export default OrderHistory;
