import { Form, Input, InputNumber, Typography } from "antd";
import {
	UserOutlined,
	PhoneOutlined,
	HomeOutlined,
	StarOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const CreateCustomerComponent = () => {
	return (
		<div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
				{/* Name */}
				<Form.Item
					name={["customerInfo", "customer_name"]}
					label={
						<span className="font-bold text-slate-500 uppercase">
							Customer Name
						</span>
					}
					rules={[
						{ required: true, message: "Required" },
						{ min: 2, message: "Too short" },
						{ max: 32, message: "Too long" },
					]}
				>
					<Input
						prefix={<UserOutlined className="text-slate-400" />}
						placeholder="John Doe"
						size="large"
					/>
				</Form.Item>

				{/* Phone */}
				<Form.Item
					name={["customerInfo", "customer_phone"]}
					label={
						<span className="font-bold text-slate-500 uppercase">
							Phone Number
						</span>
					}
					rules={[
						{ required: true, message: "Required" },
						{
							pattern: /^0[3|5|7|8|9]\d{8}$/,
							message: "Invalid VN format",
						},
					]}
				>
					<Input
						prefix={<PhoneOutlined className="text-slate-400" />}
						placeholder="090..."
						size="large"
					/>
				</Form.Item>
			</div>

			<div className="grid grid-cols-12 gap-x-4">
				{/* Address - Takes up more space */}
				<div className="col-span-12 md:col-span-8">
					<Form.Item
						name={["customerInfo", "customer_address"]}
						label={
							<span className="font-bold text-slate-500 uppercase">
								Address
							</span>
						}
						rules={[
							{ required: true, message: "Required" },
							{ min: 5, message: "Too short" },
						]}
					>
						<Input.TextArea
							prefix={<HomeOutlined />}
							placeholder="Street, District, City..."
							autoSize={{ minRows: 2, maxRows: 3 }}
							className="rounded-lg"
						/>
					</Form.Item>
				</div>

				{/* Points - Tucked into the side */}
				<div className="col-span-12 md:col-span-4">
					<Form.Item
						name={["customerInfo", "points"]}
						initialValue={0}
						label={
							<span className="font-bold text-slate-500 uppercase">
								Starting Points
							</span>
						}
						rules={[
							{ required: true, message: "Required" },
							{ type: "number", min: 0 },
						]}
					>
						<InputNumber
							addonBefore={
								<StarOutlined className="text-amber-400" />
							}
							style={{ width: "100%" }}
							min={0}
							precision={0}
							size="large"
							className="rounded-lg"
						/>
					</Form.Item>
				</div>
			</div>
		</div>
	);
};

export default CreateCustomerComponent;
