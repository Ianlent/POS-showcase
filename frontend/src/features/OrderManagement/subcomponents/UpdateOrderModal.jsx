import { useState, useEffect } from "react";
import {
	Modal,
	DatePicker,
	Form,
	Button,
	Select,
	InputNumber,
	Divider,
	Input,
	Space,
	Typography,
	Radio,
	message,
} from "antd";
import {
	UserOutlined,
	SettingOutlined,
	WalletOutlined,
	EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import CustomerSelect from "./CustomerHandling/CustomerSelect.jsx";
import CreateCustomer from "./CustomerHandling/CreateCustomer.jsx";
import SelectHandler from "./SelectHandler.jsx";
import OrderStatusSelect from "./SelectStatus.jsx";

const { Option } = Select;
const { Text, Title } = Typography;

const UpdateOrderModal = ({
	selectedOrder,
	visible,
	onCancel,
	isUpdating,
	isLoading,
	onSuccess,
}) => {
	const [form] = Form.useForm();
	const [customerType, setCustomerType] = useState("existing");

	// Watch order_status field to dynamically toggle conditional inputs
	const orderStatus = Form.useWatch("order_status", form);

	useEffect(() => {
		if (visible && selectedOrder) {
			form.setFieldsValue({
				...selectedOrder,
				planned_pickup_date: selectedOrder?.planned_pickup_date
					? dayjs(selectedOrder.planned_pickup_date)
					: undefined,
				owed_due_date: selectedOrder?.owed_due_date
					? dayjs(selectedOrder.owed_due_date)
					: undefined,
				handler_id: selectedOrder?.handler?.id,
				customer_id: selectedOrder?.customer?.id,
				discount_type: selectedOrder?.discount_type || "percentage",
			});
		}
	}, [visible, selectedOrder, form]);

	const handleOk = async () => {
		try {
			const values = await form.validateFields();
			const targetStatus =
				values.order_status || selectedOrder?.order_status;

			// Base fields matching backend validator schema
			const patchPayload = {
				handler_id:
					values.handler_id === selectedOrder?.handler?.id
						? undefined
						: values.handler_id,

				order_start_date: values.order_start_date
					? dayjs(values.order_start_date).toISOString()
					: undefined,

				order_status:
					values.order_status === selectedOrder?.order_status
						? undefined
						: values.order_status,

				extra_cost:
					values.extra_cost === selectedOrder?.extra_cost
						? undefined
						: (values.extra_cost ?? 0),

				discount:
					values.discount === selectedOrder?.discount
						? undefined
						: (values.discount ?? 0),

				discount_type:
					values.discount_type === selectedOrder?.discount_type
						? undefined
						: values.discount_type,

				order_note:
					values.order_note === selectedOrder?.order_note
						? undefined
						: values.order_note,

				payment_method:
					values.payment_method === selectedOrder?.payment_method
						? undefined
						: values.payment_method,
			};

			// Handle conditional status fields (owed_due_date & closed_by)
			if (targetStatus === "owed") {
				patchPayload.owed_due_date = values.owed_due_date
					? values.owed_due_date.toISOString()
					: null;
			} else if (values.order_status !== undefined) {
				// Backend validator requires owed_due_date to be strictly null if status is modified and NOT 'owed'
				patchPayload.owed_due_date = null;
			}

			if (targetStatus === "delivered") {
				patchPayload.closed_by = values.closed_by || undefined;
			} else if (values.order_status !== undefined) {
				// Backend validator requires closed_by to be null when status is not 'delivered'
				patchPayload.closed_by = null;
			}

			// Handle Customer payload structure
			if (customerType === "new") {
				patchPayload.customerInfo = {
					customer_name: values.customerInfo?.customer_name,
					customer_phone: values.customerInfo?.customer_phone,
					customer_address:
						values.customerInfo?.customer_address || null,
					points: values.customerInfo?.points ?? 0,
				};
			} else {
				patchPayload.customer_id =
					values.customer_id === selectedOrder?.customer?.id
						? undefined
						: values.customer_id;
			}

			// Clean payload of undefined properties so checkExact doesn't reject them
			Object.keys(patchPayload).forEach((key) => {
				if (patchPayload[key] === undefined) {
					delete patchPayload[key];
				}
			});

			// Prevent empty requests
			if (Object.keys(patchPayload).length === 0) {
				throw new Error("No new changes detected");
			}

			console.log("Validated Patch Payload:", patchPayload);
			onSuccess(patchPayload);
		} catch (error) {
			message.error(
				error.message ||
					error?.errorFields?.[0]?.errors?.[0] ||
					"Please fill in all required fields correctly.",
			);
			console.error(error);
		}
	};

	// Condition: Render payment_method ONLY when is_prepaid is false AND target status is "delivered"
	const activeStatus = orderStatus || selectedOrder?.order_status;
	const shouldShowPaymentMethod =
		!selectedOrder?.is_prepaid && activeStatus === "delivered";

	return (
		<Modal
			title={
				<Space>
					<EditOutlined className="text-indigo-500" />
					<span>
						Edit Order #
						{selectedOrder?.order_id?.slice(-6).toUpperCase()}
					</span>
				</Space>
			}
			open={visible}
			onCancel={onCancel}
			footer={null}
			width={850}
			centered
			className="premium-modal"
			loading={isLoading}
			destroyOnClose
		>
			<Form
				form={form}
				layout="vertical"
				className="py-2"
			>
				{/* --- Section: Order Status & Options --- */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
					<Form.Item
						label="Scheduled Date & Time"
						name="planned_pickup_date"
					>
						<DatePicker
							showTime
							format="YYYY-MM-DD HH:mm"
							className="w-full rounded-xl"
							size="large"
						/>
					</Form.Item>

					<Form.Item
						label={
							<Text
								strong
								className="uppercase text-slate-500"
							>
								Update Order Status
							</Text>
						}
						name="order_status"
					>
						<OrderStatusSelect
							currentStatus={selectedOrder?.order_status}
							isPrepaid={selectedOrder?.is_prepaid}
						/>
					</Form.Item>
				</div>

				{/* Dynamic Status Conditional Fields */}
				{activeStatus === "owed" && (
					<div className="mb-6 p-4 bg-rose-50 rounded-xl border border-rose-100">
						<Form.Item
							label="Owed Due Date"
							name="owed_due_date"
							rules={[
								{
									required: true,
									message:
										"Due date is required when order is marked as Owed",
								},
							]}
						>
							<DatePicker
								showTime
								format="YYYY-MM-DD HH:mm"
								className="w-full rounded-xl"
								size="large"
							/>
						</Form.Item>
					</div>
				)}

				{/* Payment Method - Rendered ONLY if not prepaid AND status is delivered */}
				{shouldShowPaymentMethod && (
					<div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
						<Form.Item
							label="Payment Method"
							name="payment_method"
							rules={[
								{
									required: true,
									message:
										"Please select a payment method upon delivery",
								},
							]}
						>
							<Select
								size="large"
								placeholder="Select payment method"
							>
								<Option value="cash">Cash</Option>
								<Option value="bank_transfer">
									Bank Transfer
								</Option>
							</Select>
						</Form.Item>
					</div>
				)}

				<Divider />

				{/* --- Section 1: Customer --- */}
				<div className="mb-8">
					<div className="flex items-center gap-2 mb-4">
						<UserOutlined className="p-2 bg-indigo-50 text-indigo-500 rounded-lg" />
						<Title
							level={5}
							className="!m-0 text-slate-700"
						>
							Customer Identity
						</Title>
					</div>
					<Form.Item
						label="Selection Mode"
						className="mb-4"
					>
						<Select
							size="large"
							value={customerType}
							onChange={(value) => setCustomerType(value)}
							className="w-full md:w-1/3"
						>
							<Option value="existing">Existing Customer</Option>
							<Option value="new">Register New Customer</Option>
						</Select>
					</Form.Item>

					{customerType === "existing" ? (
						<CustomerSelect
							initial_selected_customer={selectedOrder?.customer}
						/>
					) : (
						<CreateCustomer />
					)}
				</div>

				{/* --- Section 2: Handler --- */}
				<div className="mb-8">
					<div className="flex items-center gap-2 mb-4">
						<SettingOutlined className="p-2 bg-amber-50 text-amber-500 rounded-lg" />
						<Title
							level={5}
							className="!m-0 text-slate-700"
						>
							Handler Assignment
						</Title>
					</div>
					<SelectHandler
						initial_selected_handler={selectedOrder?.handler}
					/>
				</div>

				{/* --- Section 3: Financials --- */}
				<div className="mb-8">
					<div className="flex items-center gap-2 mb-4">
						<WalletOutlined className="p-2 bg-rose-50 text-rose-500 rounded-lg" />
						<Title
							level={5}
							className="!m-0 text-slate-700"
						>
							Financial Adjustments
						</Title>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
						<Form.Item
							label={
								<Text
									strong
									className="uppercase text-rose-400"
								>
									Extra Cost
								</Text>
							}
							name="extra_cost"
						>
							<InputNumber
								precision={0}
								min={0}
								prefix="₫"
								suffix=".000"
								formatter={(value) =>
									`${value}`.replace(
										/\B(?=(\d{3})+(?!\d))/g,
										".",
									)
								}
								parser={(value) => value?.replace(/\./g, "")}
								className="w-full rounded-xl"
								size="large"
							/>
						</Form.Item>

						<div className="flex flex-col">
							<div className="flex justify-between items-center mb-2">
								<Text
									strong
									className="uppercase text-emerald-500"
								>
									Discount
								</Text>
								<Form.Item
									name="discount_type"
									noStyle
									initialValue="percentage"
								>
									<Radio.Group
										size="small"
										optionType="button"
										buttonStyle="solid"
										className="scale-90 origin-right"
									>
										<Radio.Button value="fixed">
											₫
										</Radio.Button>
										<Radio.Button value="percentage">
											%
										</Radio.Button>
									</Radio.Group>
								</Form.Item>
							</div>

							<Form.Item
								noStyle
								shouldUpdate={(prev, curr) =>
									prev.discount_type !== curr.discount_type
								}
							>
								{({ getFieldValue }) => {
									const isPct =
										getFieldValue("discount_type") ===
										"percentage";
									return (
										<Form.Item
											name="discount"
											noStyle
											initialValue={0}
										>
											<InputNumber
												precision={0}
												min={0}
												max={isPct ? 100 : undefined}
												prefix={isPct ? "" : "₫"}
												suffix={isPct ? "%" : ".000"}
												formatter={(value) =>
													isPct
														? value
														: `${value}`.replace(
																/\B(?=(\d{3})+(?!\d))/g,
																".",
															)
												}
												parser={(value) =>
													value
														?.replace(/\./g, "")
														.replace("%", "")
												}
												className="w-full"
												size="large"
											/>
										</Form.Item>
									);
								}}
							</Form.Item>
						</div>
					</div>
				</div>

				{/* --- Section 4: Notes --- */}
				<Form.Item
					label={
						<Title
							level={5}
							className="!m-0 text-slate-700"
						>
							Order Notes
						</Title>
					}
					name="order_note"
					rules={[
						{
							max: 1000,
							message: "Note cannot exceed 1000 characters",
						},
					]}
				>
					<Input.TextArea
						placeholder="Update instructions..."
						autoSize={{ minRows: 3, maxRows: 6 }}
						className="rounded-xl border-slate-200"
					/>
				</Form.Item>

				{/* --- Section 5: Summary & Grand Total --- */}
				<div className="bg-slate-900 p-6 rounded-2xl mt-8 flex justify-between items-center shadow-xl">
					<div>
						<Text className="text-slate-400 block text-sm uppercase font-black tracking-widest">
							Payable Amount
						</Text>
						<Form.Item
							noStyle
							shouldUpdate={(prevValues, currentValues) =>
								prevValues.extra_cost !==
									currentValues.extra_cost ||
								prevValues.discount !==
									currentValues.discount ||
								prevValues.discount_type !==
									currentValues.discount_type
							}
						>
							{({ getFieldValue }) => {
								const service_cost =
									selectedOrder?.total_service_cost || 0;
								const extra = getFieldValue("extra_cost") || 0;
								const discount = getFieldValue("discount") || 0;
								const discountType =
									getFieldValue("discount_type") ||
									"percentage";

								let calculatedDiscountUnits = 0;
								if (discountType === "percentage") {
									calculatedDiscountUnits =
										(service_cost + extra) *
										(discount / 100);
								} else {
									calculatedDiscountUnits = discount;
								}

								const totalUnits = Math.round(
									service_cost +
										extra -
										calculatedDiscountUnits,
								);
								const finalAmount = Math.max(
									0,
									totalUnits * 1000,
								);

								return (
									<Title
										level={2}
										className="!m-0 !text-white font-mono"
									>
										{finalAmount.toLocaleString("vi-VN")} ₫
									</Title>
								);
							}}
						</Form.Item>
					</div>

					<div className="text-right hidden md:block">
						<Text className="text-slate-100 italic">
							* Rounded to nearest 1,000 ₫
						</Text>
					</div>
				</div>

				{/* --- Action Bar --- */}
				<div className="flex justify-end gap-3 mt-8">
					<Button
						onClick={onCancel}
						size="large"
						className="rounded-xl px-6"
					>
						Discard Changes
					</Button>
					<Button
						type="primary"
						size="large"
						onClick={handleOk}
						loading={isUpdating}
						className="bg-indigo-600 rounded-xl px-10 shadow-lg shadow-indigo-100"
					>
						Save Updates
					</Button>
				</div>
			</Form>
		</Modal>
	);
};

export default UpdateOrderModal;
