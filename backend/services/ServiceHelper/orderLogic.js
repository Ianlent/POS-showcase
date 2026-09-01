import { CustomerRepository } from "../../repositories/customerRepository.js";
import { UserRepository } from "../../repositories/userRepository.js";
import { ServiceRepository } from "../../repositories/serviceRepository.js";
import { OrderRepository } from "../../repositories/orders/orderRepository.js";

const updateOrderStatusHelper = {
	preventIllegalStateChange(originalStatus, targetStatus) {
		const ALLOWED_FULFILLMENT_TRANSITIONS = {
			pending: ["working", "completed"],
			working: ["pending", "completed"],
			completed: ["delivered", "owed", "pending", "working"],
			delivered: ["completed"],
			owed: ["delivered", "completed"],
		};

		if (
			!ALLOWED_FULFILLMENT_TRANSITIONS[originalStatus]?.includes(
				targetStatus,
			)
		) {
			throw {
				type: "UNPROCESSABLE",
				message: `Illegal state transition: "${originalStatus}" => "${targetStatus}"`,
			};
		}
	},

	handleStateChangesFromCompleted(
		updatePayload,
		newStatus,
		isPrepaid,
		due_date,
		updater,
		paymentMethod,
	) {
		switch (newStatus) {
			case "delivered":
				if (!isPrepaid) {
					if (!paymentMethod) {
						throw {
							type: "UNPROCESSABLE",
							message:
								"Order not prepaid must have a specified payment method",
						};
					}
					updatePayload.paid_at = "now()";
					updatePayload.payment_method = paymentMethod;
				}
				updatePayload.closed_by = updater.user_id;
				updatePayload.order_end_date = "now()";
				break;

			case "owed":
				if (isPrepaid) {
					throw {
						type: "UNPROCESSABLE",
						message: "Prepaid order cannot be set to owed",
					};
				}
				updatePayload.owed_due_date = due_date;
				break;

			// Changing from completed to pending or working doesn't require metadata changes
			default:
				break;
		}

		return updatePayload;
	},

	handleDeliveredOrderRollback(updatePayload, userRole, isPrepaid) {
		if (userRole === "employee") {
			throw {
				type: "FORBIDDEN",
				message: "Only privileged users can rollback delivered orders",
			};
		}
		if (!isPrepaid) {
			updatePayload.paid_at = null;
			updatePayload.payment_method = null;
		}
		updatePayload.closed_by = null;
		updatePayload.order_end_date = null;

		return updatePayload;
	},

	handleStateChangesFromOwed(
		updatePayload,
		newStatus,
		updater,
		paymentMethod,
	) {
		switch (newStatus) {
			//continue to next state
			case "delivered":
				if (!paymentMethod) {
					throw {
						type: "UNPROCESSABLE",
						message:
							"Delivered order must have a specified payment method",
					};
				}
				updatePayload.paid_at = "now()";
				updatePayload.payment_method = paymentMethod;
				updatePayload.closed_by = updater.user_id;
				updatePayload.order_end_date = "now()";
				break;

			// rollback
			case "completed":
				if (updater.user_role === "employee") {
					throw {
						type: "FORBIDDEN",
						message:
							"Only privileged users can rollback owed orders",
					};
				}
				updatePayload.owed_due_date = null;
				break;

			default:
				break;
		}

		return updatePayload;
	},
};

export const orderHelper = {
	createOrderHelper: {
		async handleCustomerCreationAndLocking(client, orderData) {
			// Create customer if required
			let newCustomer = null;
			if (orderData.customerInfo && !orderData.customer_id) {
				newCustomer = await CustomerRepository.createCustomer(
					client,
					orderData.customerInfo,
				);
			}

			// Lock customer
			if (!orderData.customer_id && !newCustomer) {
				throw {
					type: "BAD_REQUEST",
					message: "No customer provided",
				};
			}
			const lockedCustomer = await CustomerRepository.lockCustomerById(
				client,
				orderData.customer_id || newCustomer?.customer_id,
			);

			if (!lockedCustomer) {
				throw {
					type: "NOT_FOUND",
					message: "Customer doesn't exist",
				};
			}

			orderData.customer_id = lockedCustomer.customer_id;

			return orderData;
		},

		async lockHandlerAndCheckExistence(client, orderData) {
			const handler = await UserRepository.findUserDataByIdAndLock(
				client,
				orderData.handler_id,
			);

			if (!handler) {
				throw {
					type: "NOT_FOUND",
					message: "Handler not found or no longer exist",
				};
			}
		},

		async checkServicesAndLock(client, inputServices) {
			const serviceIds = inputServices.map((s) => s.service_id);
			// Validate services input
			if (new Set(serviceIds).size !== inputServices.length) {
				throw {
					type: "UNPROCESSABLE",
					message: "Duplicate service_id found",
				};
			}

			// Lock services to prevent modification and ensure integrity by checking for existence at order creation
			const storedServices = await ServiceRepository.fetchServicesAndLock(
				client,
				serviceIds,
			);

			if (storedServices.length !== inputServices.length) {
				throw {
					type: "NOT_FOUND",
					message: "One or more services not found",
				};
			}

			// Creating price map for each retrieved services from database
			const servicePriceMap = new Map();

			storedServices.forEach((service) => {
				servicePriceMap.set(
					service.service_id,
					service.service_price_per_unit,
				);
			});

			// Check if service_price_per_unit sent by client is stale
			inputServices.forEach((service) => {
				if (
					servicePriceMap.get(service.service_id) !==
					service.service_price_per_unit
				) {
					throw {
						type: "CONFLICT",
						message: "Service price had been changed",
					};
				}
			});
		},

		async createLineItemsAndCalculateCost(client, orderId, orderData) {
			// Creating line item objects
			console.log(orderData);
			const line_items = orderData.services.map((s) => ({
				service_id: s.service_id,
				line_item_cost: s.service_price_per_unit * s.number_of_unit,
				number_of_unit: s.number_of_unit,
			}));
			const ids = line_items.map((li) => li.service_id);
			const costs = line_items.map((li) => li.line_item_cost);
			const units = line_items.map((li) => li.number_of_unit);

			const total_service_cost = costs.reduce(
				(acc, cost) => acc + cost,
				0,
			);

			// Check if discount is too high
			if (
				orderData.discount >
				total_service_cost + orderData.extra_cost
			) {
				throw {
					type: "UNPROCESSABLE",
					message: "Discount is too high",
				};
			}

			orderData.total_service_cost = total_service_cost;

			// Insert line_items into local_order_service
			await OrderRepository.insertLineItems(
				client,
				orderId,
				ids,
				costs,
				units,
			);

			return orderData;
		},

		async subtractCustomerPoints(client, customer_id, orderData) {
			const points_added =
				orderData.points_earned - orderData.points_used;
			const successfulSubtraction =
				// insufficent point handled by check constraint and in repository
				await CustomerRepository.updateCustomer(client, customer_id, {
					added_points: points_added,
				});
			if (!successfulSubtraction) {
				throw {
					type: "NOT_FOUND",
					message: "Customer not found.",
				};
			}
		},
	},

	updateOrderHelper: {
		handleStatusUpdate(
			originalStatus,
			newStatus,
			isPrepaid,
			due_date,
			updater,
			paymentMethod,
		) {
			updateOrderStatusHelper.preventIllegalStateChange(
				originalStatus,
				newStatus,
			);

			let updatePayload = {
				order_status: newStatus,
			};

			switch (originalStatus) {
				case "completed":
					updatePayload =
						updateOrderStatusHelper.handleStateChangesFromCompleted(
							updatePayload,
							newStatus,
							isPrepaid,
							due_date,
							updater,
							paymentMethod,
						);
					break;

				case "delivered":
					updatePayload =
						updateOrderStatusHelper.handleDeliveredOrderRollback(
							updatePayload,
							updater.user_role,
							isPrepaid,
						);
					break;

				case "owed":
					updatePayload =
						updateOrderStatusHelper.handleStateChangesFromOwed(
							updatePayload,
							newStatus,
							updater,
							paymentMethod,
						);
					break;

				// Changes made from pending or working requires no metadata changes needed to be handled at application level
				default:
					break;
			}

			return updatePayload;
		},

		async handleAddNewCustomer(client, updateData) {
			// Create customer if required
			let newCustomer = null;
			if (updateData.customerInfo && !updateData.customer_id) {
				newCustomer = await CustomerRepository.createCustomer(
					client,
					updateData.customerInfo,
				);
			}

			// Update with new customer
			if (newCustomer) {
				await client.query("SET CONSTRAINTS ALL DEFERRED");
				updateData.customer_id = newCustomer.customer_id;
			}

			return updateData;
		},

		checkFixedDiscountValidity(currOrder, updateData) {
			const orderCostBeforeDiscount =
				currOrder.total_service_cost + currOrder.extra_cost;

			const effectiveType =
				updateData.discount_type || currOrder.discount_type;

			if (
				updateData.discount &&
				effectiveType === "fixed" &&
				updateData.discount >= orderCostBeforeDiscount
			) {
				throw {
					type: "UNPROCESSABLE",
					message: "Discount cannot be greater than total_cost",
				};
			}
		},
	},
};
