import { Row, Col, Form, DatePicker } from "antd";
import dayjs from "dayjs";

const PickupDateSection = () => {
	const range = (start, end) => {
		const result = [];
		for (let i = start; i < end; i++) {
			result.push(i);
		}
		return result;
	};

	const getMinTime = () => dayjs().add(15, "minute");

	const disabledTime = (currentDate) => {
		const minTime = getMinTime();

		// If no date is selected or it is a future day, do not disable any times
		if (!currentDate || !currentDate.isSame(minTime, "day")) {
			return {};
		}

		const minHour = minTime.hour();
		const minMinute = minTime.minute();

		return {
			// Disable all hours before the buffer hour
			disabledHours: () => range(0, minHour),

			// Restrict minutes only if the selected hour matches the buffer hour
			disabledMinutes: (selectedHour) => {
				if (selectedHour === minHour) {
					return range(0, minMinute);
				}
				return [];
			},
		};
	};

	return (
		<div className="border-b pb-4 mb-4">
			<Row gutter={8}>
				{/* --- Date Picker --- */}
				<Col span={12}>
					<Form.Item
						label="Ngày hẹn"
						name="planned_pickup_date"
						rules={[
							{
								required: true,
								message: "Please select a pickup date!",
							},
							({ getFieldValue }) => ({
								validator(_, value) {
									if (
										!value ||
										value.isAfter(dayjs().startOf("day")) ||
										value.isSame(
											dayjs().startOf("day"),
											"day",
										)
									) {
										return Promise.resolve();
									}
									return Promise.reject(
										new Error(
											"Date cannot be in the past!",
										),
									);
								},
							}),
						]}
					>
						<DatePicker
							className="w-full"
							format="YYYY-MM-DD HH:mm"
							showTime={{ format: "HH:mm" }}
							minDate={getMinTime()}
							disabledTime={disabledTime}
						/>
					</Form.Item>
				</Col>
			</Row>
		</div>
	);
};

export default PickupDateSection;
