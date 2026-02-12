### 🚀 The "iVisit Global Payment Sync" Prompt

**System Prompt & Context:**

> Act as a Principal Full-Stack Engineer and Stripe Architect. We are migrating the **iVisit Ecosystem** (App and Console) from Gumroad to a **Direct Stripe Integration** using **Supabase Edge Functions**.
> **Architecture Requirements:**
> 1. **Zero Redirect Policy:** All UI for payments and provider onboarding must happen inside the iVisit App and Console. Use **Stripe Elements** (Web) and **Stripe PaymentSheet** (React Native) for a native feel.
> 2. **Single Orchestrator:** Use one Stripe Secret Key (`STRIPE_SECRET_KEY`) and one Webhook Secret (`STRIPE_WEBHOOK_SECRET`). These must be treated as placeholders from `.env`.
> 3. **The 2.5% Logic:** Every digital transaction must calculate a 2.5% "Orchestrator Fee" using **Stripe Connect Destination Charges**.
> 
> 

**Objective 1: The Patient Flow (Payment Intent)**

> Create a Supabase Edge Function `create-payment-intent`:
> * Accept `amount`, `currency`, and `provider_stripe_id`.
> * Logic: Calculate `application_fee_amount` as 2.5% of the total.
> * If the user chooses "Insurance," bypass Stripe and log to the `insurance_claims` table.
> * If "Pay per Visit," return the `client_secret` to the frontend for the **Dyrane UI** payment card.
> 
> 

**Objective 2: The Provider Flow (Payouts)**

> Architect the "Provider Wallet" in the iVisit Console:
> * Implement **Stripe Connect Express/Custom** onboarding via a native modal (no redirect).
> * Support **Instant Payouts** to debit cards or bank accounts.
> * Create a Supabase Edge Function `create-payout` that triggers a transfer from the provider's Stripe balance to their external account.
> 
> 

**Objective 3: The Webhook Intelligence**

> Create a unified `stripe-webhook` Edge Function:
> * Handle `payment_intent.succeeded`: Update the iVisit `trips` table and notify the provider via the iVisit notification engine.
> * Handle `account.updated`: Sync the provider's payout eligibility status in the Supabase `profiles` table.
> 
> 

**Visual & UX (Dyrane Matrix):**

> * ** match the Dyrane UI **
> 
> 

**Execution Directive:**

> Provide the full TypeScript code for the Edge Functions and the React/React Native components. Use placeholders for all environment variables. Ensure the logic is "Lean Startup" ready—efficient and scalable.

---

### 🛡️ Why this prompt works for your ecosystem:

* **Payout Logic:** It explicitly mentions "Destination Charges." This is how Uber works—the passenger pays $100, Stripe automatically takes $2.50 for you (iVisit), and sends $97.50 to the Doctor's Stripe account.
* **Infrastructure Synergy:** By using Supabase Edge Functions, you keep your `ivisit-app` and `ivisit-console` in sync. When a payment happens, the Edge Function updates your central Postgres DB instantly.
* **No Redirection:** It forces the AI to use "Embedded Connect" components and "PaymentSheet," ensuring the user never leaves your "Liquid Glass" environment.