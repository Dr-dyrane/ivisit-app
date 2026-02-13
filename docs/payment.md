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
1. **User requests** ambulance/bed reservation
2. **Service price**: Fixed amount (e.g., $150) - no breakdown shown
3. **Automatic payment**: Uses saved card or new card
4. **No payment step**: Seamless like Uber ride completion
5. **Service delivered**: Payment processed automatically

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
├── User payments: 2.5% of service fees
├── Payout processing: $0 (free for providers)
└── Cash confirmations: 2.5% of manual payments
```

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
- **PaymentScreen**: Main payment interface
- **PaymentMethodSelector**: Card management
- **SimplifiedPaymentScreen**: Uber-like experience
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

### **No Saved Card**
- **Prompt**: "Add card or pay cash"
- **Cash Option**: User pays hospital directly
- **Manual Confirmation**: Hospital confirms cash payment
- **Fee Still Applies**: 2.5% deducted from hospital wallet

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