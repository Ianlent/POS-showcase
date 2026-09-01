export const db_order_error_handle = (err) => {
	switch (err.constraint) {
		case "check_min_extra_cost":
			throw {
				type: "UNPROCESSABLE",
				message: "Extra cost must be greater than or equal 0",
			};
			break;

		case "check_total_service_cost":
			throw {
				type: "UNPROCESSABLE",
				message: "Total service cost must be greater than 0",
			};
			break;

		case "check_discount_bounds":
			throw {
				type: "UNPROCESSABLE",
				message: "Illegal value for chosen discount",
			};
			break;

		case "check_order_prepaid":
			throw {
				type: "UNPROCESSABLE",
				message: "Prepaid order must already be paid",
			};
			break;

		case "check_order_status":
			throw {
				type: "UNPROCESSABLE",
				message: "Illegal order status change",
			};
			break;

		case "check_date_order":
			throw {
				type: "UNPROCESSABLE",
				message: "Order end date must be after order start date",
			};
			break;

		case "check_date_pickup":
			throw {
				type: "UNPROCESSABLE",
				message: "Planned pickup date must be in the future",
			};
			break;

		case "check_date_owed":
			throw {
				type: "UNPROCESSABLE",
				message: "Owed date must be after order start date",
			};
			break;

		case "check_positive_total":
			throw {
				type: "UNPROCESSABLE",
				message: "Total cost must be greater than 0",
			};
			break;

		default:
			throw err;
	}
};
