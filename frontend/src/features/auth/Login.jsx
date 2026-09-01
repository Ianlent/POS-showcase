import { Form, Input, Button, Card, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useLoginMutation } from "./authApiSlice"; // Your injected hook

const { Title, Text } = Typography;

const LoginPage = () => {
	const navigate = useNavigate();
	const [login, { isLoading }] = useLoginMutation();
	const [messageApi, contextHolder] = message.useMessage();

	const onFinish = async (values) => {
		try {
			// RTK Query returns the result directly
			const userData = await login(values).unwrap();

			messageApi.success("Login successful!");

			// Redirect based on role
			if (userData.user.user_role === "admin") {
				navigate(`/admin/${userData.user.user_id}/dashboard`, {
					replace: true,
				});
			} else {
				navigate(`/employee/${userData.user.user_id}/dashboard`, {
					replace: true,
				});
			}
		} catch (err) {
			// Handle error (RTK Query provides the error object)
			messageApi.error(err?.message || "Login failed");
		}
	};

	return (
		<div
			className="min-h-screen flex items-center justify-center p-4"
			style={{
				backgroundImage: "url(/background.jpg)",
				backgroundSize: "cover",
			}}
		>
			{contextHolder}
			<div className="w-full max-w-lg min-h-md max-h-lg shadow-lg rounded-lg">
				<Card className="w-full h-full py-1 px-2">
					`{" "}
					<div className="text-center mb-6">
						<Title
							level={1}
							className="text-gray-800"
						>
							Welcome Back!
						</Title>
						<Text className="text-gray-500">
							Sign in to your account to continue.
						</Text>
					</div>
					`
					<Form
						name="login"
						onFinish={onFinish}
						layout="vertical"
						autoComplete="off"
					>
						<Form.Item
							label="Phone Number"
							name="user_phone"
							rules={[
								{
									required: true,
									message: "Please input your phone number!",
								},
								{
									pattern: /^0[3|5|7|8|9]\d{8}$/,
									message:
										"Please enter a valid Vietnamese phone number!",
								},
							]}
							className="mb-6"
						>
							<Input
								size="large"
								placeholder="Enter your phone number"
								className="rounded-md"
							/>
						</Form.Item>

						<Form.Item
							label="Password"
							name="password"
							rules={[
								{
									required: true,
									message: "Please input your password!",
								},
							]}
							className="mb-8"
						>
							<Input.Password
								size="large"
								placeholder="Enter your password"
								className="rounded-md"
							/>
						</Form.Item>
						<Form.Item>
							<Button
								type="primary"
								htmlType="submit"
								loading={isLoading}
								className="w-full rounded-md mt-4 mb-5 p-[1.5rem] text-lg font-semibold text-center"
							>
								Log in
							</Button>
						</Form.Item>
					</Form>
				</Card>
			</div>
		</div>
	);
};

export default LoginPage;
