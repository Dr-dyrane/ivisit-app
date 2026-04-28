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

---

# 🚀 iVisit Payment System Architecture

## 📋 **Finalized Payment Flow**

### **👥 User Flow (Patient)**
```
Request Service → Automatic Payment → Complete Service
```
1. **User requests** ambulance/bed reservation.
2. **Cost estimation**: `serviceCostService` calculates total based on base, distance, and urgency.
3. **Payment Selection**: Patient confirms payment method (Card, Wallet, or Cash) **before** dispatch.
4. **Eligibility Check**: If "Cash" is chosen, the system verifies the Hospital's wallet balance (Wallet Cap).
5. **Dispatch**: Request is created and resources are assigned.
6. **Settlement**: 
   - **Digital**: Processed automatically upon completion.
   - **Cash**: Provider manually confirms receipt in Console.

### **🏥 Provider Flow (Hospital/Org Admin)**
```
Receive Service → Wallet Credited → Can Request Payout
```
1. **Hospital receives**: 97.5% of payment amount
2. **Wallet balance**: Updated automatically
3. **Payout request**: Can withdraw to debit card/bank
4. **No payout fees**: Free to collect their money

### **💰 Fee Distribution**

#### **When User Pays $150**
```
User Card Charged: $150.00
├── Hospital Receives: $146.25 (97.5%)
└── iVisit Fee: $3.75 (2.5%)
```

#### **Per-Organization Configuration**
- **Standard**: 2.5% fee (default)
- **Premium**: Reduced fee for high-volume partners
- **Enterprise**: Custom fee for large networks
- **Non-Profit**: Reduced fee for qualified organizations
- **Custom**: Special negotiated rates

### **🏦 iVisit Main Wallet**
```
Collects 2.5% from ALL transactions:
├── **Digital Payments**: Automatically split during Stripe payout or Wallet transfer.
├── **Cash Payments**: Manually triggered by Provider; 2.5% is **deducted** from Org Wallet balance as debt settlement.
└── **Payout processing**: $0 (free for providers).
```

### 📖 **Scenario Walkthrough: $150 Bed Booking**
*Context: All balances are initially $0.00.*

1. **The Request**: A Patient books a bed for **$150**.
2. **The Calculation**:
   - Service Base: **$150.00**
   - Platform Fee (2.5% surcharge formula): `$150 / (1 - 0.025) = $153.85`
   - **Total Charge to Patient: $153.85**
3. **The Stripe Action (Destination Charge)**:
   - Stripe debits **$153.85** from the Patient's card.
   - Stripe subtracts its own processing fee (~2.9% + 30c) from the platform's share.
   - **$150.00** is sent directly to the **Hospital's Connected Stripe Account**.
   - **$3.85** is sent to the **iVisit Platform Stripe Account**.
4. **The Database Reflection (Webhook Sync)**:
   - The `stripe-webhook` receives `payment_intent.succeeded`.
   - **Hospital Wallet**: Increments by **+$150.00** (Reflecting their earned funds).
   - **iVisit Main Wallet**: Increments by **+$3.85** (Reflecting platform revenue).
   - **Patient Wallet**: Remains **$0.00** (They paid externally via card).
5. **The Result**:
   - **Hospital Dashboard**: Shows **$150.00** available for payout.
   - **iVisit Console**: Shows **$3.85** revenue collected.
   - **Patient App**: Shows a completed booking; status: **Paid**.

## 🗂️ **Database Schema**

### **Core Tables**
```sql
-- Organizations with per-organization fees
organizations (
  ivisit_fee_percentage DECIMAL(5,2) DEFAULT 2.5,
  fee_tier TEXT DEFAULT 'standard',
  custom_fee_enabled BOOLEAN DEFAULT FALSE
)

-- Payments with fee tracking
payments (
  organization_id UUID REFERENCES organizations(id),
  organization_fee_rate DECIMAL(5,2),
  ivisit_deduction_amount DECIMAL(10,2)
)

-- iVisit main wallet for fee collection
ivisit_main_wallet (
  balance DECIMAL(12,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD'
)

-- Organization wallets for earnings
organization_wallets (
  organization_id UUID REFERENCES organizations(id),
  balance DECIMAL(12,2) DEFAULT 0.00
)
```

### **Automatic Fee Distribution**
```sql
-- When payment is completed:
UPDATE organization_wallets 
SET balance = balance + (amount - ivisit_deduction_amount)
WHERE organization_id = payment.organization_id;

UPDATE ivisit_main_wallet 
SET balance = balance + ivisit_deduction_amount;
```

## 📱 **Mobile App Implementation**

### **Payment Flow**
1. **Service Selection**: User chooses ambulance/bed
2. **Cost Display**: Simple total ($150) - no fee breakdown
3. **Payment Method**: Saved card or new card
4. **Automatic Charging**: After service completion
5. **Receipt**: Simple confirmation

### **Key Components**
- **PaymentScreenOrchestrator**: Phase/variant chooser (entry point)
- **PaymentStageBase**: Shell, motion, sidebar layout owner
- **PaymentManagementVariant / PaymentCheckoutVariant**: Mode-specific composition
- **PaymentMethodSelector**: Card management
- **paymentService.js**: Fee calculation logic

### **Environment Variables**
```env
# Payment Providers
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# Service Pricing
BASE_AMBULANCE_COST=150.00
BASE_BED_COST=200.00
DISTANCE_SURCHARGE_RATE=2.00
URGENCY_SURCHARGE=25.00

# iVisit Fee Configuration
IVISIT_FEE_PERCENTAGE=2.5
MINIMUM_FEE_AMOUNT=0.50
MAXIMUM_FEE_AMOUNT=100.00
```

## 🖥️ **Console Implementation**

### **Admin Features**
- **Organization Fee Management**: Set per-organization rates
- **iVisit Main Wallet**: Track fee collections
- **Fee Analytics**: Revenue across all organizations
- **Payout Processing**: Free withdrawals for providers

### **Key Components**
- **OrganizationFeeManagement**: Fee configuration UI
- **WalletManagement**: Organization wallets
- **PaymentDashboard**: Transaction analytics

## 🔄 **Edge Cases**

### **Cash Payments & Wallet Cap**
- **Trigger**: User selects "Cash" in iVisit App.
- **Eligibility**: Hospital must have enough balance in their `organization_wallets` to cover the **2.5% iVisit Service Fee**.
- **Blocker**: If Org balance is too low, Cash is disabled in the App UI (Principle: Platform commission must be secured).
- **Confirmation**: Required in the **iVisit Console**.
- **Fee Settlement**: Confirmed receipt triggers a **debit** from the Org Wallet to the iVisit Main Wallet.

### **Manual Confirmation Workflow**
1. **Completion**: Provider clicks "Complete" in Console.
2. **Agreement**: If it's a cash job, a "Confirm Cash Received" prompt appears.
3. **Processing**: Provider enters the final amount and clicks confirm.
4. **Ledger Sync**: RPC `process_cash_payment` settles the debt and marks the request as `Paid`.

### **Refunds**
- **Full Refund**: Amount returned to user
- **Wallet Reversal**: Deducted from hospital wallet
- **Fee Reversal**: Returned to iVisit main wallet
- **Automatic**: All wallets updated instantly

### **Insurance**
- **Insurance Coverage**: Bypass payment if covered
- **Partial Coverage**: Pay remaining amount
- **Claims Tracking**: Separate from payment flow

## 🚀 **Implementation Steps**

### **Phase 1: Mobile App**
1. ✅ Update paymentService.js with fee calculation
2. ✅ Create database migrations for fee tracking
3. 🔄 Update InsuranceScreen → PaymentScreen
4. ⏳ Implement seamless payment flow
5. ⏳ Add automatic charging after service

### **Phase 2: Database**
1. ✅ Create fee tracking tables
2. ✅ Implement per-organization fee configuration
3. ✅ Add iVisit main wallet
4. ⏳ Create automatic fee distribution triggers
5. ⏳ Add fee analytics views

### **Phase 3: Console**
1. ✅ Create organization fee management
2. ✅ Build wallet management interface
3. ⏳ Implement payout processing
4. ⏳ Add fee analytics dashboard
5. ⏳ Create admin fee configuration

## 🎯 **Success Criteria**

### **User Experience**
- ✅ Seamless one-tap payments
- ✅ No fee breakdown shown to users
- ✅ Automatic charging after service
- ✅ Multiple payment methods supported

### **Provider Experience**
- ✅ Automatic wallet credits
- ✅ Free payout processing
- ✅ Real-time balance updates
- ✅ Per-organization fee configuration

### **Admin Experience**
- ✅ Complete fee tracking
- ✅ Per-organization management
- ✅ Revenue analytics
- ✅ Wallet oversight

---

**This architecture provides a complete payment system with per-organization fee configuration, seamless user experience, and comprehensive admin management.**

---

# 🛠️ **Stripe Dashboard Setup Guide**

Follow these steps to synchronize your Stripe Dashboard with the iVisit "Reflection" architecture.

### **1. 🏗️ Connect Setup**
iVisit uses **Stripe Connect** to distribute funds to Hospitals (Organizations).
- Go to **Connect** in your Stripe Dashboard.
- Click **Complete Setup** or **Get Started**.
- Choose **Platform** as your integration type.
- Under **Settings > Connect > Onboarding Options**, ensure **Embedded Onboarding** or **Express Onboarding** is enabled for the "Zero Redirect" experience.

### **2. 🪝 Webhook Configuration**
The Webhook is the heartbeat of the "Sync" flow. Without it, your DB wallets will never update.
- Go to **Developers > Webhooks**.
- Click **Add endpoint**.
- **Endpoint URL**: `https://<YOUR_PROJECT_ID>.supabase.co/functions/v1/stripe-webhook`
- **Select events to listen to** (CRITICAL):
    - `payment_intent.succeeded` (Credits wallets on successful payment)
    - `payment_intent.payment_failed` (Logs failures)
    - `account.updated` (Syncs Org Admin payout status)
    - `payout.paid` (Deducts balance on bank transfer)
    - `payout.failed` (Notifies of bank issues)
- **Select account events**: Check the box "Listen to events on Connected accounts" (since payouts happen on destination accounts).

### **3. 🔑 Environment Variables**
Configure these in your **Supabase Dashboard** under **Edge Functions > Secrets**:
- `STRIPE_SECRET_KEY`: Your live/test Secret Key (`sk_...`).
- `STRIPE_WEBHOOK_SECRET`: The signing secret provided after creating the Webhook (`whsec_...`).
- `SUPABASE_URL`: Your project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Your admin key (required for wallet mutations).

### **4. 🎨 UI Synchronization (Liquid Glass)**
To match the **Dyrane UI** Canon:
- Go to **Settings > Branding**.
- Set the **Accent Color** to match your platform primary (e.g., `#000000` or `#121212`).
- Set the **Border Radius** to **Standard** (matching our squircle-3xl preference).

### **5. 💳 Payment Methods**
- Go to **Settings > Payment Methods**.
- Ensure **Cards**, **Apple Pay**, and **Google Pay** are enabled to maintain the "Seamless like Uber" completion rule.

iVisit Insurance-Payment Integration
iVisit integrates insurance logic directly into the payment flow to automate healthcare billing:

Identity & Coverage Layer:

The user's Insurance Policy (stored in Supabase/insurance_policies) acts as the primary payer.
Before requesting payment, the backend (paymentService.applyInsuranceCoverage) checks the active policy to determine coverage.
It calculates the adjustedCost based on the plan's limits, deductibles, and co-pays.
The "Gap" Payment:

If insurance covers 100%, the transaction is fully subsidized by the provider/insurer.
If there is a co-pay or the limit is exceeded, the Payment System charges the user for the difference.
Smart Linking Mechanism:

Users can link a specific Payment Method (stored in Stripe) to an Insurance Policy.
This authorization allows iVisit to automatically charge that specific card for any co-pays or uncovered expenses related to that policy.
This creates a "Smart Billing Pair", ensuring medical expenses are charged correctly without manual input for each transaction.