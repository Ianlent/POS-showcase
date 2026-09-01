import { useEffect } from "react";
import {
	Modal,
	Form,
	Input,
	Button,
	message,
	InputNumber,
	Space,
	Typography,
} from "antd";
import {
	AppstoreAddOutlined,
	DollarCircleOutlined,
	InfoCircleOutlined,
	EditOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
const ServiceModal = ({
	visible,
	onCancel,
	onSave,
	editingService,
	isUpdating,
}) => {
	const [form] = Form.useForm();

	useEffect(() => {
		if (visible) {
			if (editingService) {
				form.setFieldsValue({
					...editingService,
				});
			} else {
				form.resetFields();
			}
		}
	}, [visible, editingService, form]);

	const handleOk = async () => {
		try {
			const values = await form.validateFields();
			if (editingService) {
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

	const handleEdit = (values) => {
		delete values.confirm;
		let patchDiff = {};
		for (const [key, value] of Object.entries(values)) {
			// Check if the value has changed
			if (editingService[key] !== value) {
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
						className={`p-2 rounded-lg ${editingService ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"}`}
					>
						{editingService ? (
							<EditOutlined />
						) : (
							<AppstoreAddOutlined />
						)}
					</div>
					<div className="flex flex-col">
						<span className="text-lg font-bold text-slate-800">
							{editingService
								? "Update Service Definition"
								: "Add to Catalog"}
						</span>
						<Text className="text-sm text-slate-400 font-normal uppercase tracking-wider">
							{editingService
								? `Service SKU: ${editingService.service_id.slice(-8)}`
								: "Define new offering & pricing"}
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
						className="rounded-xl border-slate-200 px-6 h-10"
					>
						Cancel
					</Button>
					<Button
						type="primary"
						onClick={handleOk}
						loading={isUpdating}
						className="bg-indigo-600 rounded-xl px-10 shadow-lg shadow-indigo-100 h-10 font-semibold"
					>
						{editingService ? "Save Changes" : "Register Service"}
					</Button>
				</div>
			}
		>
			<Form
				form={form}
				layout="vertical"
				name="service_form"
				className="pt-4"
				requiredMark={false}
			>
				{/* --- Identity Section --- */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="md:col-span-2">
						<Form.Item
							name="service_name"
							label={
								<Text
									strong
									className="uppercase text-slate-500"
								>
									Service Display Name
								</Text>
							}
							rules={[
								{
									required: true,
									message: "Please input service name!",
								},
								{
									min: 1,
									max: 50,
									message: "1-50 characters long",
								},
							]}
						>
							<Input
								placeholder="e.g. Giặt khô"
								className="rounded-xl h-10 border-slate-200"
							/>
						</Form.Item>
					</div>

					<Form.Item
						name="service_unit"
						label={
							<Text
								strong
								className="uppercase text-slate-500"
							>
								Unit
							</Text>
						}
						rules={[
							{ required: true, message: "Unit required!" },
							{ min: 1, max: 20, message: "Too long" },
						]}
					>
						<Input
							placeholder="kg, lượt, cái..."
							className="rounded-xl h-10 border-slate-200 text-center"
						/>
					</Form.Item>
				</div>

				{/* --- Pricing Hero Section --- */}
				<div className="bg-slate-50 px-1 rounded-2xl border border-slate-100 mt-2 mb-4">
					<div className="flex items-center gap-2 mb-3">
						<DollarCircleOutlined className="text-indigo-500" />
						<Text
							strong
							className="text-lg text-slate-700"
						>
							Pricing Configuration
						</Text>
					</div>

					<Form.Item
						name="service_price_per_unit"
						label={
							<Text className="text-slate-500">
								Rate per Unit (x1.000)
							</Text>
						}
						rules={[
							{ required: true, message: "Please enter a price" },
							{
								type: "number",
								min: 1,
								message: "Price must be positive",
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
							className="w-full rounded-xl text-lg font-mono font-bold border-slate-200"
							size="large"
						/>
					</Form.Item>
					<div className="mt-2 flex items-center gap-1">
						<InfoCircleOutlined className="text-slate-400" />
						<Text className="text-sm text-slate-400">
							This price will be applied to all new orders.
						</Text>
					</div>
				</div>

				{/* --- Metadata (Only for Edit) --- */}
				{editingService && (
					<div className="p-3 bg-slate-100/50 rounded-lg flex justify-between items-center border border-dashed border-slate-200">
						<Text className="text-sm uppercase text-slate-400 font-bold">
							Internal UUID
						</Text>
						<Text
							className="text-xs font-mono text-slate-400 italic"
							copyable
						>
							{editingService.service_id}
						</Text>
					</div>
				)}
			</Form>
		</Modal>
	);
};

export default ServiceModal;
