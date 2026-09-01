import { useEffect } from "react";
import { Modal, Space, Form, Input, Select, Button, Typography, Divider, message } from "antd";
import { UserAddOutlined, EditOutlined, SafetyCertificateOutlined } from "@ant-design/icons"
const { Option } = Select;

const { Text } = Typography;
const UserModal = ({ visible, onCancel, onSave, editingUser, isUpdating }) => {
	const [form] = Form.useForm();

	useEffect(() => {
		if (visible) {
			if (editingUser) {
				// When editing, set existing user data.
				// Clear password fields as they are optional for update.
				form.setFieldsValue({
					...editingUser,
					password: "", // Explicitly clear password field
					confirm: "",   // Explicitly clear confirm password field
				});
			} else {
				form.resetFields();
				form.setFieldsValue({ user_role: "employee", user_status: "active" });
			}
		}
	}, [visible, editingUser, form]);

	const handleOk = async () => {
		try {
			const values = await form.validateFields();
			if (editingUser) {
				handleEdit(values);
			} else {
				handleAdd(values);
			}
		} catch (error) {
			message.error(error.message || "Please fill in all required fields correctly.");
		}
	};

	const handleEdit = (values) => {
		delete values.confirm;
		let patchDiff = {};
		for (const [key, value] of Object.entries(values)) {
			if (key === "password" && value === "") {
				continue;
			}
			// Check if the value has changed
			if (editingUser[key] !== value) {
				patchDiff[key] = value;
			}
		}

		if (Object.keys(patchDiff).length === 0) {
			throw new Error("No new changes detected");
		}

		onSave(patchDiff);
	}

	const handleAdd = (values) => {
		delete values.confirm;
		onSave(values);
	}

	return (
		<Modal
			centered
			title={
				<Space size="middle">
					<div className={`p-2 rounded-lg ${editingUser ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
						{editingUser ? <EditOutlined /> : <UserAddOutlined />}
					</div>
					<div className="flex flex-col">
						<span className="text-base font-bold text-slate-800">
							{editingUser ? "Update Handler Details" : "Register New Handler"}
						</span>
						<Text className="text-[11px] text-slate-400 font-normal">
							{editingUser ? `Editing ID: ${editingUser.user_id.slice(-8).toUpperCase()}` : "Assign credentials and system roles"}
						</Text>
					</div>
				</Space>
			}
			open={visible}
			onCancel={onCancel}
			width={550}
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
						className="bg-indigo-600 rounded-xl px-8 shadow-lg shadow-indigo-100 h-10"
					>
						{editingUser ? "Update Profile" : "Create Account"}
					</Button>
				</div>
			}
		>
			<Form form={form}
				layout="vertical"
				name="user_form"
				autoComplete="off"
				className="pt-4"
			>
				{/* Basic Information Row */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
					<Form.Item
						name="user_name"
						label={<Text strong className="text-[11px] uppercase text-slate-500">Full Name</Text>}
						rules={[
							{
								required: !editingUser, // Required for create, optional for update
								message: "Username is required",
							},
							{ min: 3, max: 50, message: "Must be between 3 and 50 characters" },
						]}
					>
						<Input placeholder="e.g. Nguyen Van A" className="rounded-xl h-10" />
					</Form.Item>

					<Form.Item
						name="user_phone"
						label={<Text strong className="text-[11px] uppercase text-slate-500">Phone Number</Text>}
						rules={[
							{ required: true, message: "Please input customer phone number!" },
							{
								pattern: /^0[3|5|7|8|9]\d{8}$/,
								message: 'Please enter a valid Vietnamese phone number!',
							},
						]}
					>
						<Input placeholder="09xxxxxxx" className="rounded-xl h-10" />
					</Form.Item>
				</div>

				{/* Access Control Row */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
					<Form.Item
						name="user_role"
						label={<Text strong className="text-[11px] uppercase text-slate-500">System Role</Text>}
						rules={[
							{
								required: !editingUser, // Required for create, optional for update
								message: "User role is required",
							},
						]}
					>
						<Select placeholder="Select a role" className="rounded-xl h-10" size="large">
							<Option value="admin">Admin</Option>
							<Option value="manager">Manager</Option>
							<Option value="employee">Employee</Option>
						</Select>
					</Form.Item>

					<Form.Item
						name="user_status"
						label={<Text strong className="text-[11px] uppercase text-slate-500">Account Status</Text>}
						rules={[
							{
								required: true,
								message: "Please select a status!",
							},
						]}
					>
						<Select placeholder="Select a status" className="rounded-xl h-10" size="large">
							<Option value="active">Active</Option>
							<Option value="suspended">Suspended</Option>
						</Select>
					</Form.Item>
				</div>

				<Divider className="my-4" />

				{/* Security Section */}
				<div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
					<div className="flex items-center gap-2 mb-4">
						<SafetyCertificateOutlined className="text-indigo-500" />
						<Text strong className="text-slate-700">Security Credentials</Text>
					</div>
					<Form.Item
						name="password"
						label={<Text className="text-[11px] text-slate-500">Password</Text>}
						rules={[
							{ required: !editingUser, message: "Password is required" },
							({ getFieldValue }) => ({
								validator(_, value) {
									if (!value && editingUser) return Promise.resolve();
									if (value && value.length < 8) return Promise.reject("At least 8 characters");
									if (value && !/[A-Z]/.test(value)) return Promise.reject("One uppercase letter required");
									if (value && !/[0-9]/.test(value)) return Promise.reject("One number required");
									return Promise.resolve();
								},
							}),
						]}
						hasFeedback
					>
						<Input.Password
							placeholder={editingUser ? "Leave blank to keep current" : "••••••••"}
							className="rounded-xl h-10"
						/>
					</Form.Item>

					<Form.Item
						name="confirm"
						label={<Text className="text-[11px] text-slate-500">Confirm Password</Text>}
						dependencies={["password"]}
						hasFeedback
						rules={[
							// Required if password field has a value
							({ getFieldValue }) => ({
								required: !!getFieldValue("password"),
								message: "The two passwords that you entered do not match!",
								validator(_, value) {
									if (!getFieldValue("password") && !value) { // Both empty, valid if password field is optional
										return Promise.resolve();
									}
									if (getFieldValue("password") === value) {
										return Promise.resolve();
									}
									return Promise.reject(
										new Error("The two passwords that you entered do not match!")
									);
								},
							}),
						]}
					>
						<Input.Password placeholder={editingUser ? "Confirm new password" : "••••••••"}
							className="rounded-xl h-10"
						/>
					</Form.Item>
				</div>

			</Form>
		</Modal>
	);
};

export default UserModal;