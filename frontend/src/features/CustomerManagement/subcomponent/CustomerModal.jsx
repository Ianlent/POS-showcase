import { useEffect } from "react";
import {
	Modal,
	Form,
	Input,
	message,
	InputNumber,
	Button,
	Space,
	Divider,
	Typography,
} from "antd";
import { UserAddOutlined, EditOutlined, StarOutlined } from "@ant-design/icons";

const { Text } = Typography;
const CustomerModal = ({
	visible,
	onCancel,
	onSave,
	editingCustomer,
	isUpdating,
}) => {
	const [form] = Form.useForm();

	useEffect(() => {
		if (visible) {
			if (editingCustomer) {
				// When editing, set form fields with existing customer data
				// Ensure points is a number, even if it might come as string from some source
				form.setFieldsValue({
					...editingCustomer,
					points:
						typeof editingCustomer.points === "string"
							? parseInt(editingCustomer.points, 10) || 0
							: editingCustomer.points || 0,
					added_points: 0,
				});
			} else {
				// When creating, reset form and set default values
				form.resetFields();
				form.setFieldsValue({ points: 0 }); // Default points for new customer
			}
		}
	}, [visible, editingCustomer, form]);

	const handleEdit = (values) => {
		let patchDiff = {};
		for (const [key, value] of Object.entries(values)) {
			if (key === "added_points" && value === 0) {
				continue;
			}
			// Check if the value has changed
			if (editingCustomer[key] !== value) {
				patchDiff[key] = value;
			}
		}
		console.log(patchDiff);
		if (Object.keys(patchDiff).length === 0) {
			throw new Error("No new changes detected");
		}
		onSave(patchDiff);
	};

	const handleAdd = (values) => {
		console.log({ ...values, points: values.starting_points });
		onSave({ ...values, points: values.starting_points });
	};

	const handleOk = async () => {
		try {
			const values = await form.validateFields();
			if (editingCustomer) {
				handleEdit(values);
			} else {
				handleAdd(values);
			}
		} catch (error) {
			message.error(
				error.message ||
					"Please fill in all required fields correctly.",
			);
		}
	};

	return (
		<Modal
			centered
			title={
				<Space size="middle">
					<div
						className={`p-2 rounded-lg ${editingCustomer ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}
					>
						{editingCustomer ? (
							<EditOutlined />
						) : (
							<UserAddOutlined />
						)}
					</div>
					<div className="flex flex-col">
						<span className="text-base font-bold text-slate-800">
							{editingCustomer
								? "Update Customer Profile"
								: "Register New Customer"}
						</span>
						<Text className="text-slate-400 font-normal">
							{editingCustomer
								? `Customer ID: ${editingCustomer.customer_id.slice(-8).toUpperCase()}`
								: "Create a new profile for loyalty tracking and orders"}
						</Text>
					</div>
				</Space>
			}
			open={visible}
			onCancel={onCancel}
			width={600}
			footer={
				<div className="flex justify-end gap-2 pb-2">
					<Button
						onClick={onCancel}
						className="rounded-xl border-slate-200 px-6"
					>
						Cancel
					</Button>
					<Button
						key="submit"
						type="primary"
						onClick={handleOk}
						loading={isUpdating}
						className={`bg-indigo-600 rounded-xl px-8 shadow-lg h-10 border-none`}
					>
						{editingCustomer ? "Save Changes" : "Create Customer"}
					</Button>
				</div>
			}
		>
			<Form
				form={form}
				layout="vertical"
				name="customer_form"
				autoComplete="off"
				className="pt-4"
			>
				{/* Basic Identification Section */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
					<Form.Item
						name="customer_name"
						label={
							<Text
								strong
								className="uppercase text-slate-500 tracking-wider"
							>
								Full Name
							</Text>
						}
						rules={[
							{
								required: true,
								message: "Please input customer name!",
							},
							{
								max: 50,
								message: "Name cannot exceed 50 characters.",
							},
						]}
					>
						<Input
							placeholder="e.g. Tran Thi B"
							className="rounded-xl h-10"
						/>
					</Form.Item>

					<Form.Item
						name="customer_phone"
						label={
							<Text
								strong
								className="uppercase text-slate-500 tracking-wider"
							>
								Phone Number
							</Text>
						}
						rules={[
							{ required: true, message: "Required" },
							{
								pattern: /^0[3|5|7|8|9]\d{8}$/,
								message: "Invalid VN phone format",
							},
						]}
					>
						<Input
							placeholder="09xxxxxxxx"
							className="rounded-xl h-10"
						/>
					</Form.Item>
				</div>

				<Form.Item
					name="customer_address"
					label={
						<Text
							strong
							className="uppercase text-slate-500 tracking-wider"
						>
							Delivery Address
						</Text>
					}
					rules={[
						{
							required: true,
							message: "Please input the address!",
						},
						{ min: 5, message: "Address is too short" },
					]}
				>
					<Input.TextArea
						placeholder="Street name, Ward, District..."
						className="rounded-xl"
						autoSize={{ minRows: 2, maxRows: 4 }}
					/>
				</Form.Item>

				<Divider className="my-4" />

				{/* Loyalty & Points Section */}
				<div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
					<div className="flex items-center gap-2 mb-4">
						<div className="p-1.5 bg-white rounded-md border border-slate-100 shadow-sm">
							<StarOutlined className="text-amber-500" />
						</div>
						<Text
							strong
							className="text-slate-700"
						>
							Loyalty Program
						</Text>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
						<Form.Item
							name="points"
							initialValue={0}
							label={
								<Text className="text-slate-500">
									Current Points balance
								</Text>
							}
						>
							<InputNumber
								className="w-full rounded-xl h-10 flex items-center bg-slate-100/50"
								min={0}
								precision={0}
								disabled
							/>
						</Form.Item>

						{editingCustomer ? (
							<Form.Item
								name="added_points"
								initialValue={0}
								label={
									<Text className="text-slate-500 font-bold text-indigo-600">
										Adjustment (+/-)
									</Text>
								}
								rules={[
									{ required: true, message: "Required" },
									{
										type: "number",
										min: -editingCustomer.points,
										message: "Subtraction exceeds balance",
									},
								]}
							>
								<InputNumber
									placeholder="e.g. 50 or -20"
									className="w-full rounded-xl h-10 flex items-center border-indigo-200"
									precision={0}
								/>
							</Form.Item>
						) : (
							<Form.Item
								name="starting_points"
								initialValue={0}
								label={
									<Text className="text-slate-500">
										Starting Points
									</Text>
								}
							>
								<InputNumber
									className="w-full rounded-xl h-10 flex items-center"
									min={0}
									precision={0}
								/>
							</Form.Item>
						)}
					</div>

					{editingCustomer && (
						<div className="mt-2 px-1">
							<Text className="text-slate-400 italic">
								* To deduct points, enter a negative number
								(e.g., -50)
							</Text>
						</div>
					)}
				</div>
			</Form>
		</Modal>
	);
};

export default CustomerModal;
