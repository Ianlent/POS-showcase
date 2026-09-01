import { useEffect } from "react";
import {
	Modal,
	Form,
	Space,
	Badge,
	Input,
	Button,
	message,
	InputNumber,
	DatePicker,
	Select,
	Typography,
} from "antd";
import { PlusCircleOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs";

dayjs.extend(utc);

const { Text } = Typography;

const ExpenseModal = ({
	editingExpense,
	visible,
	onCancel,
	onSave,
	isUpdating,
}) => {
	const [form] = Form.useForm();

	useEffect(() => {
		if (visible) {
			if (editingExpense) {
				form.setFieldsValue({
					...editingExpense,
					ticket_date: dayjs(editingExpense.ticket_date),
				});
			} else {
				form.resetFields();
				form.setFieldsValue({ ticket_date: dayjs() });
			}
		}
	}, [visible, editingExpense, form]);

	const handleOk = async () => {
		try {
			const values = await form.validateFields();
			const transformedValues = {
				...values,
				ticket_date: values.ticket_date.toISOString(),
			};
			if (editingExpense) {
				handleEdit(transformedValues);
			} else {
				handleAdd(transformedValues);
			}
		} catch (error) {
			message.error(
				error.message ||
					"Please fill in all required fields correctly.",
			);
		}
	};

	const handleEdit = (values) => {
		let patchDiff = {};
		for (const [key, value] of Object.entries(values)) {
			// Check if the value has changed
			if (editingExpense[key] !== value) {
				patchDiff[key] = value;
			}
		}

		if (Object.keys(patchDiff).length === 0) {
			throw new Error("No new changes detected");
		}
		onSave(patchDiff);
	};

	const handleAdd = (values) => {
		onSave(values);
	};
	return (
		<Modal
			centered
			title={
				<Space size="middle">
					<div
						className={`p-2 rounded-lg ${editingExpense ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}
					>
						{editingExpense ? (
							<EditOutlined />
						) : (
							<PlusCircleOutlined />
						)}
					</div>
					<div className="flex flex-col">
						<span className="text-base font-bold text-slate-800">
							{editingExpense
								? "Update Transaction"
								: "New Financial Entry"}
						</span>
						<Text className="text-slate-400 font-normal">
							{editingExpense
								? `Ticket #${editingExpense.ticket_id.slice(-6).toUpperCase()}`
								: "Record business cash flow"}
						</Text>
					</div>
				</Space>
			}
			open={visible}
			onCancel={onCancel}
			width={500}
			footer={
				<div className="flex justify-end gap-2 pb-2">
					<Button
						onClick={onCancel}
						className="rounded-xl border-slate-200 px-6"
					>
						Cancel
					</Button>
					<Button
						type="primary"
						onClick={handleOk}
						loading={isUpdating}
						className="bg-indigo-600 rounded-xl px-10 shadow-lg shadow-indigo-100 h-10"
					>
						{editingExpense ? "Save Changes" : "Create Entry"}
					</Button>
				</div>
			}
		>
			<Form
				form={form}
				layout="vertical"
				name="expense_form"
				className="pt-4"
			>
				{/* Transaction Type Toggle - High Visibility */}
				<Form.Item
					name="is_expense"
					label={
						<Text
							strong
							className="uppercase text-slate-500"
						>
							Transaction Type
						</Text>
					}
					initialValue={true}
				>
					<Select
						size="large"
						className="rounded-xl"
						popupClassName="rounded-xl"
					>
						<Select.Option value={true}>
							<Space>
								<Badge status="error" />
								<span className="text-rose-600 font-medium">
									Expense
								</span>
							</Space>
						</Select.Option>
						<Select.Option value={false}>
							<Space>
								<Badge status="success" />
								<span className="text-emerald-600 font-medium">
									Income
								</span>
							</Space>
						</Select.Option>
					</Select>
				</Form.Item>

				{/* Amount Input - The "Hero" of this form */}
				<div className="bg-slate-50 px-2 py-3 rounded-2xl border border-slate-100 mb-6">
					<Form.Item
						name="amount"
						label={
							<Text
								strong
								className="uppercase text-indigo-500"
							>
								Amount
							</Text>
						}
						rules={[
							{ required: true, message: "Amount is required" },
							{
								type: "number",
								min: 1,
								message: "Must be positive",
							},
						]}
						className="mb-0"
					>
						<InputNumber
							precision={0}
							min={1}
							prefix={
								<span className="text-slate-400 mr-1">₫</span>
							}
							suffix={
								<span className="text-slate-400 font-bold">
									.000
								</span>
							}
							formatter={(value) =>
								`${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
							}
							parser={(value) => value?.replace(/\./g, "")}
							className="w-full rounded-xl text-lg font-bold"
							size="large"
						/>
					</Form.Item>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Form.Item
						name="ticket_date"
						label={
							<Text
								strong
								className="uppercase text-slate-500"
							>
								Transaction Date
							</Text>
						}
						rules={[
							{ required: true, message: "Date is required" },
						]}
					>
						<DatePicker
							className="w-full rounded-xl h-10"
							format="YYYY-MM-DD, HH:mm"
							maxDate={dayjs()}
							showTime
						/>
					</Form.Item>

					<Form.Item
						name="reason"
						label={
							<Text
								strong
								className="uppercase text-slate-500"
							>
								Reason / Description
							</Text>
						}
					>
						<Input
							placeholder="Lunch, Electricity, etc."
							className="rounded-xl h-10"
						/>
					</Form.Item>
				</div>

				{editingExpense && (
					<div className="mt-4 p-3 bg-slate-100/50 rounded-lg flex justify-between items-center">
						<Text className="text-xs uppercase text-slate-400 font-bold">
							Internal Reference
						</Text>
						<Text
							copyable
							className="text-xs font-mono text-slate-500"
						>
							{editingExpense.ticket_id}
						</Text>
					</div>
				)}
			</Form>
		</Modal>
	);
};

export default ExpenseModal;
