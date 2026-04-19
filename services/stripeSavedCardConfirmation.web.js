const STRIPE_JS_SRC = "https://js.stripe.com/v3/";

let stripeLoaderPromise = null;

const loadStripeJs = () => {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return Promise.reject(new Error("Card payment is only available in a browser."));
	}

	if (window.Stripe) {
		return Promise.resolve(window.Stripe);
	}

	if (stripeLoaderPromise) {
		return stripeLoaderPromise;
	}

	stripeLoaderPromise = new Promise((resolve, reject) => {
		const existingScript = document.querySelector(`script[src="${STRIPE_JS_SRC}"]`);
		if (existingScript) {
			existingScript.addEventListener("load", () => resolve(window.Stripe), {
				once: true,
			});
			existingScript.addEventListener(
				"error",
				() => reject(new Error("Could not load Stripe.")),
				{ once: true },
			);
			return;
		}

		const script = document.createElement("script");
		script.src = STRIPE_JS_SRC;
		script.async = true;
		script.onload = () => resolve(window.Stripe);
		script.onerror = () => reject(new Error("Could not load Stripe."));
		document.head.appendChild(script);
	});

	return stripeLoaderPromise;
};

export async function confirmSavedCardPayment(clientSecret, stripePaymentMethodId) {
	if (!clientSecret) {
		throw new Error("Missing payment intent client secret");
	}

	if (!stripePaymentMethodId) {
		throw new Error("Missing Stripe payment method");
	}

	const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
	if (!publishableKey) {
		throw new Error("Stripe publishable key is missing.");
	}

	const Stripe = await loadStripeJs();
	const stripe = Stripe(publishableKey);
	const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
		payment_method: stripePaymentMethodId,
	});

	if (error) {
		throw new Error(error.message || "Could not confirm card payment");
	}

	return paymentIntent;
}
