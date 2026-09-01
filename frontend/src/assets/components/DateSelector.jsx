import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

const { RangePicker } = DatePicker;

const DateSelection = ({ onSearchChange, value }) => {
	const handleChange = (dates, dateStrings) => {
		if (!dates) {
			onSearchChange('date', [undefined, undefined]);
			return;
		}
		const newStartDate = dates[0].hour(0).minute(0).second(0).millisecond(0);
		const newEndDate = dates[1].hour(23).minute(59).second(59).millisecond(999);
		onSearchChange('date', [newStartDate.utc().format(), newEndDate.utc().format()]);
	};

	const pickerValue =
		value && value.length === 2 && value[0] && value[1]
			? [dayjs(value[0]), dayjs(value[1])]
			: null;

	return (
		<RangePicker
			onChange={handleChange}
			value={pickerValue} // Pass the value prop to RangePicker
			disabledDate={(current) => {
				// Can not select dates after today
				return current && current > dayjs().endOf('day');
			}}
			format="YYYY-MM-DD" // Explicitly set format for consistency
		/>
	);
};

export default DateSelection;