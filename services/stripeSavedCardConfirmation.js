import { confirmPayment } from "@stripe/stripe-react-native";

export async function confirmSavedCardPayment(clientSecret, stripePaymentMethodId) {
	if (!clientSecret) {
		throw new Error("Missing payment intent client secret");
	}

	if (!stripePaymentMethodId) {
		throw new Error("Missing Stripe payment method");
	}

	const { paymentIntent, error } = await confirmPayment(clientSecret, {
		paymentMethodType: "Card",
		paymentMethodData: {
			paymentMethodId: stripePaymentMethodId,
		},
	});

	if (error) {
		throw new Error(error.message || "Could not confirm card payment");
	}

	return paymentIntent;
}
