import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import {
	Form,
	Button,
	InputNumber,
	Input,
	Typography,
	Radio,
	Card,
	message,
	Checkbox,
	Select,
} from "antd";
import { UserOutlined, PrinterOutlined, SaveOutlined } from "@ant-design/icons";

import CustomerSelect from "../subcomponents/CustomerHandling/CustomerSelect.jsx";
import CreateCustomer from "../subcomponents/CustomerHandling/CreateCustomer.jsx";
import SelectHandler from "../subcomponents/SelectHandler.jsx";
import SelectServices from "./FormComponents/SelectService/SelectServices.jsx";
import PickupDateSection from "./FormComponents/PickupDateSelection.jsx";

import { useCreateOrderMutation } from "../ordersApiSlice.js";
import { handleApiError } from "../../../utils/errorHandler.js";
import {
	updateOrderField,
	updateFormValues,
	resetTabData,
} from "../orderTabsSlice.js";

const { Option } = Select;
const { Text, Title } = Typography;

dayjs.extend(utc);

const OrderFormWindow = ({ tabId, onClose }) => {
	const [form] = Form.useForm();
	const dispatch = useDispatch();
	const [messageApi, contextHolder] = message.useMessage();

	// Select individual state slice for this tab
	const tabState = useSelector(
		(state) => state.orderTabs.orderData[tabId] || {},
	);
	const {
		customerType = "existing",
		priceMap = {},
		formValues = {},
	} = tabState;

	const [createOrder, { isLoading: isCreating }] = useCreateOrderMutation();

	// Restore form values when component mounts or switches tabs
	useEffect(() => {
		if (formValues && Object.keys(formValues).length > 0) {
			form.setFieldsValue(formValues);
		}
	}, [tabId]);

	const handleValuesChange = (_, allValues) => {
		dispatch(updateFormValues({ tabId, values: allValues }));
	};

	const setCustomerType = (type) => {
		dispatch(
			updateOrderField({ tabId, field: "customerType", value: type }),
		);
	};

	const handleServicePriceDiscovery = (id, price) => {
		const updatedPriceMap = { ...priceMap, [id]: price };
		dispatch(
			updateOrderField({
				tabId,
				field: "priceMap",
				value: updatedPriceMap,
			}),
		);
	};

	const handleSubmitOrder = async (shouldPrint = false) => {
		try {
			const values = await form.validateFields();

			const initialPayload = {
				handler_id: values.handler_id,
				points_earned: values.points_earned || 0,
				points_used: values.points_used || 0,
				extra_cost: values.extra_cost || 0,
				discount: values.discount || 0,
				order_note: values.order_note,
				order_start_date: dayjs().toISOString(),
				planned_pickup_date: dayjs(
					values.planned_pickup_date,
				).toISOString(),
				is_prepaid: values.is_prepaid,
				payment_method: values.is_prepaid
					? values.payment_method
					: null,
				services: (values.services || []).map((s) => ({
					...s,
					service_price_per_unit: priceMap[s.service_id] || 0,
				})),
			};

			const finalPayload =
				customerType === "new"
					? { ...initialPayload, customerInfo: values.customerInfo }
					: { ...initialPayload, customer_id: values.customer_id };

			await createOrder(finalPayload).unwrap();

			messageApi.success(
				shouldPrint
					? "Order created and sent to print!"
					: "Order created successfully!",
			);

			form.resetFields();
			dispatch(resetTabData(tabId));
			if (onClose) onClose();
		} catch (error) {
			if (error.errorFields) {
				messageApi.error("Please complete all required fields.");
			} else {
				console.error(error);
				handleApiError(error);
			}
		}
	};

	return (
		<div className="h-full p-4 font-sans text-slate-800 box-border overflow-y-auto">
			{contextHolder}
			<Form
				form={form}
				layout="vertical"
				className="h-full"
				onValuesChange={handleValuesChange}
			>
				<div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
					{/* Service Catalog */}
					<div className="h-full lg:col-span-6 flex flex-col min-h-0">
						<Card
							className="h-full shadow-sm border-slate-200 rounded-xl"
							styles={{
								body: {
									height: "100%",
									padding: "1.5rem",
									display: "flex",
									flexDirection: "column",
								},
							}}
						>
							<Title
								level={5}
								className="mb-4 text-slate-700 shrink-0"
							>
								Service Catalog
							</Title>
							<div className="flex-1 min-h-0 overflow-auto">
								<SelectServices
									priceMap={priceMap}
									onPriceDiscovered={
										handleServicePriceDiscovery
									}
								/>
							</div>
						</Card>
					</div>

					{/* Customer & Payment Options */}
					<div className="lg:col-span-6 flex flex-col h-full min-h-0">
						<Card
							className="h-full shadow-sm border-slate-200 rounded-xl bg-white overflow-y-auto"
							styles={{ body: { padding: "1.5rem" } }}
						>
							<div className="border-b pb-4 mb-4">
								<div className="flex justify-between items-center mb-2">
									<div className="flex items-center gap-2">
										<UserOutlined className="text-indigo-600" />
										<Text
											strong
											className="text-xl"
										>
											Customer
										</Text>
									</div>
									<Radio.Group
										size="middle"
										value={customerType}
										onChange={(e) =>
											setCustomerType(e.target.value)
										}
										optionType="button"
										buttonStyle="solid"
									>
										<Radio.Button value="existing">
											Existing
										</Radio.Button>
										<Radio.Button value="new">
											New
										</Radio.Button>
									</Radio.Group>
								</div>
								{customerType === "existing" ? (
									<CustomerSelect />
								) : (
									<CreateCustomer />
								)}
							</div>

							<div className="border-b pb-4 mb-4">
								<Form.Item
									label={
										<Text
											strong
											className="text-xl"
										>
											Handler
										</Text>
									}
									name="handler_id"
								>
									<SelectHandler />
								</Form.Item>
							</div>

							<PickupDateSection />

							<div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200 space-y-3">
								<Form.Item
									noStyle
									shouldUpdate={(prev, curr) =>
										prev.services !== curr.services ||
										prev.extra_cost !== curr.extra_cost ||
										prev.discount !== curr.discount ||
										prev.discount_type !==
											curr.discount_type
									}
								>
									{({ getFieldValue }) => {
										const services =
											getFieldValue("services") || [];
										const extra =
											getFieldValue("extra_cost") || 0;
										const discount =
											getFieldValue("discount") || 0;
										const discountType =
											getFieldValue("discount_type") ||
											"fixed";

										const subtotalUnits = services.reduce(
											(acc, curr) => {
												const price =
													priceMap[
														curr?.service_id
													] || 0;
												const qty =
													curr?.number_of_unit || 0;
												return acc + price * qty;
											},
											0,
										);

										let calculatedDiscount = 0;
										if (discountType === "fixed") {
											calculatedDiscount = discount;
										} else {
											calculatedDiscount =
												(subtotalUnits + extra) *
												(discount / 100);
										}

										const totalUnits = Math.round(
											subtotalUnits +
												extra -
												calculatedDiscount,
										);
										const finalAmount = Math.max(
											0,
											totalUnits * 1000,
										);

										return (
											<>
												<div className="flex justify-between items-center">
													<Text className="text-xl font-semibold">
														Subtotal:
													</Text>
													<Text
														strong
														className="text-2xl"
													>
														{(
															subtotalUnits * 1000
														).toLocaleString(
															"en-US",
														)}{" "}
														₫
													</Text>
												</div>

												<div className="flex justify-between items-center">
													<Text className="text-slate-500 text-lg">
														Extra Fee:
													</Text>
													<Form.Item
														name="extra_cost"
														noStyle
														initialValue={0}
													>
														<InputNumber
															min={0}
															size="small"
															suffix=".000"
															className="w-32"
															formatter={(
																value,
															) =>
																`${value}`.replace(
																	/\B(?=(\d{3})+(?!\d))/g,
																	",",
																)
															}
															parser={(value) =>
																value
																	?.replace(
																		/,/g,
																		"",
																	)
																	.replace(
																		".000",
																		"",
																	)
															}
														/>
													</Form.Item>
												</div>

												<div className="flex justify-between items-center">
													<div className="flex items-center gap-1">
														<Text className="text-lg text-slate-500">
															Discount:
														</Text>
														<Form.Item
															name="discount_type"
															noStyle
															initialValue="fixed"
														>
															<Radio.Group
																size="small"
																optionType="button"
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
														name="discount"
														noStyle
														initialValue={0}
													>
														<InputNumber
															min={0}
															max={
																discountType ===
																"percentage"
																	? 100
																	: undefined
															}
															size="small"
															suffix={
																discountType ===
																"fixed"
																	? ".000"
																	: "%"
															}
															className="w-32"
															formatter={(
																value,
															) =>
																discountType ===
																"fixed"
																	? `${value}`.replace(
																			/\B(?=(\d{3})+(?!\d))/g,
																			",",
																		)
																	: value
															}
															parser={(value) =>
																value
																	?.replace(
																		/,/g,
																		"",
																	)
																	.replace(
																		".000",
																		"",
																	)
																	.replace(
																		"%",
																		"",
																	)
															}
														/>
													</Form.Item>
												</div>

												<div className="border-t pt-2 flex justify-between items-center">
													<Text
														strong
														className="text-xl"
													>
														Total:
													</Text>
													<Text
														strong
														className="text-2xl text-indigo-600"
													>
														{finalAmount.toLocaleString(
															"en-US",
														)}{" "}
														₫
													</Text>
												</div>
											</>
										);
									}}
								</Form.Item>
							</div>

							<div className="mb-4">
								<Form.Item
									name="is_prepaid"
									valuePropName="checked"
									initialValue={false}
									className="mb-2"
								>
									<Checkbox>
										<Text
											strong
											className="text-lg text-slate-700"
										>
											Order is prepaid
										</Text>
									</Checkbox>
								</Form.Item>

								<Form.Item
									noStyle
									shouldUpdate={(prev, curr) =>
										prev.is_prepaid !== curr.is_prepaid
									}
								>
									{({ getFieldValue }) => {
										const isPrepaid =
											getFieldValue("is_prepaid");
										if (!isPrepaid) return null;

										return (
											<div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100 transition-all">
												<Form.Item
													label={
														<Text
															strong
															className="text-indigo-900"
														>
															Payment Method
														</Text>
													}
													name="payment_method"
													rules={[
														{
															required: true,
															message:
																"Please select a payment method",
														},
													]}
													className="mb-0"
												>
													<Select
														size="large"
														placeholder="Select payment method"
														className="w-full"
													>
														<Option
															value="cash"
															className="text-xl"
														>
															Cash
														</Option>
														<Option
															value="bank_transfer"
															className="text-xl"
														>
															Bank Transfer
														</Option>
													</Select>
												</Form.Item>
											</div>
										);
									}}
								</Form.Item>
							</div>

							<Form.Item
								name="order_note"
								label={
									<Text className="text-xl">Order Note</Text>
								}
							>
								<Input.TextArea
									rows={2}
									placeholder="Add receipt notes..."
									className="text-lg"
								/>
							</Form.Item>

							<div className="grid grid-cols-2 gap-3 mt-4">
								<Button
									type="default"
									size="large"
									icon={<SaveOutlined />}
									onClick={() => handleSubmitOrder(false)}
									loading={isCreating}
									className="rounded-xl"
								>
									Save Order
								</Button>
								<Button
									type="primary"
									size="large"
									icon={<PrinterOutlined />}
									onClick={() => handleSubmitOrder(true)}
									loading={isCreating}
									className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
								>
									Save & Print
								</Button>
							</div>
						</Card>
					</div>
				</div>
			</Form>
		</div>
	);
};

export default OrderFormWindow;
