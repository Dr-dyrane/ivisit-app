# Supabase Edge Functions

This directory contains all Supabase Edge Functions organized by category.

## 📁 **Directory Structure**

```
functions/
├── payments/              # Payment-related functions
│   ├── create-payment-intent/
│   ├── create-payout/
│   └── manage-payment-methods/
├── discovery/             # Discovery and search functions
│   └── discover-hospitals/
├── webhooks/              # Webhook handlers
│   └── stripe-webhook/
└── shared/                # Shared utilities and helpers
```

## 💳 **Payment Functions**

### **create-payment-intent**
Creates payment intents for emergency services and medical visits.

**Endpoint**: `/functions/v1/create-payment-intent`
**Method**: POST
**Authentication**: Required

### **create-payout**
Processes payouts to healthcare providers and ambulance services.

**Endpoint**: `/functions/v1/create-payout`
**Method**: POST
**Authentication**: Admin required

### **manage-payment-methods**
Manages patient payment methods (cards, digital wallets).

**Endpoint**: `/functions/v1/manage-payment-methods`
**Method**: GET, POST, DELETE
**Authentication**: Required

## 🔍 **Discovery Functions**

### **discover-hospitals**
Searches for hospitals based on location, specialty, and availability.

**Endpoint**: `/functions/v1/discover-hospitals`
**Method**: GET
**Authentication**: Optional

**Query Parameters**:
- `lat`: Latitude (required)
- `lng`: Longitude (required)
- `radius`: Search radius in km (default: 10)
- `specialty`: Medical specialty (optional)
- `availability`: Filter by availability (optional)

### **bootstrap-demo-ecosystem**
Builds a deterministic demo healthcare ecosystem for users in low/no verified coverage zones.

**Endpoint**: `/functions/v1/bootstrap-demo-ecosystem`
**Method**: POST
**Authentication**: Required

**Body Parameters**:
- `phase`: `prepare | hospitals | staff | pricing | summary | full`
- `latitude`: number (required)
- `longitude`: number (required)
- `radiusKm`: number (optional, default 50)

## 🪝 **Webhook Functions**

### **stripe-webhook**
Handles Stripe webhook events for payment processing.

**Endpoint**: `/functions/v1/stripe-webhook`
**Method**: POST
**Authentication**: Stripe signature verification

**Events Handled**:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `account.updated`

## 🛠️ **Shared Utilities**

Common utilities and helpers used across functions.

### **Authentication**
- JWT token validation
- Role-based access control
- User session management

### **Validation**
- Input sanitization
- Parameter validation
- Error handling

### **Database**
- Supabase client initialization
- Connection pooling
- Error handling

## 🚀 **Deployment**

### **Local Development**
```bash
# Start local development server
supabase functions serve

# Test specific function
supabase functions serve discover-hospitals
```

### **Deployment**
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy discover-hospitals
```

## 📋 **Development Guidelines**

### **Function Structure**
Each function should follow this structure:
```
function-name/
├── index.ts          # Main function logic
├── types.ts          # TypeScript definitions
├── utils.ts          # Function-specific utilities
└── README.md         # Function documentation
```

### **Naming Conventions**
- **Directories**: kebab-case (e.g., `create-payment-intent`)
- **Files**: kebab-case (e.g., `index.ts`, `types.ts`)
- **Endpoints**: `/functions/v1/{function-name}`
- **Environment**: Use `process.env` for configuration

### **Error Handling**
- Use standardized error responses
- Log errors for debugging
- Return appropriate HTTP status codes
- Include error details in response

### **Security**
- Validate all inputs
- Use authentication middleware
- Implement rate limiting
- Sanitize outputs

## 🔧 **Environment Variables**

Required environment variables:
```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Other Services
GOOGLE_MAPS_API_KEY=your_google_maps_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

## 📊 **Monitoring**

### **Logging**
- Use structured logging with timestamps
- Include correlation IDs for request tracking
- Log errors with full context
- Monitor performance metrics

### **Health Checks**
- Implement health check endpoints
- Monitor function response times
- Track error rates
- Set up alerts for failures

## 🔗 **Related Documentation**

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [API Reference](../docs/REFERENCE.md)
- [Testing Guide](../docs/TESTING.md)
- [Contribution Guidelines](../docs/CONTRIBUTING.md)

---

**All functions should follow the established patterns and guidelines for consistency and maintainability.**
