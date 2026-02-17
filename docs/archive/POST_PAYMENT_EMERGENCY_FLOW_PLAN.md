# Post-Payment Emergency Flow Plan

**Date**: February 17, 2026  
**Status**: Planning Phase  
**Objective**: Design comprehensive post-payment emergency flow with automation, dispatch handling, and edge case prevention

## 🎯 Current State Analysis

### Payment Phase Complete ✅
- Emergency requests created successfully
- Payment processing implemented with multiple methods
- Organization fees calculated and deducted
- Payment records created with audit trails
- Emergency-visit synchronization working

### Next Phase Requirements
- Automated dispatch system
- Wait time calculations and management
- Provider assignment and coordination
- Real-time status updates
- Double payment prevention
- Edge case handling

## 🚀 Post-Payment Flow Architecture

### 1. Automated Dispatch System

#### Current State
- Emergency requests are created and paid
- No automated dispatch mechanism implemented
- Manual provider assignment required

#### Required Implementation
```sql
-- Provider dispatch trigger
CREATE OR REPLACE FUNCTION public.auto_dispatch_provider()
RETURNS TRIGGER AS $$
DECLARE
    v_provider_id UUID;
    v_distance DECIMAL;
    v_specialty TEXT;
BEGIN
    -- Get emergency details
    SELECT specialty, hospital_id INTO v_specialty, NEW.hospital_id
    FROM emergency_requests WHERE id = NEW.id;
    
    -- Find nearest available provider
    SELECT provider_id, distance INTO v_provider_id, v_distance
    FROM (
        SELECT 
            p.id as provider_id,
            ST_Distance(
                ST_MakePoint(p.longitude, p.latitude),
                ST_MakePoint(h.longitude, h.latitude)
            ) as distance
        FROM providers p
        JOIN hospitals h ON p.hospital_id = h.id
        WHERE p.specialty = v_specialty
        AND p.status = 'available'
        AND p.hospital_id = NEW.hospital_id
        ORDER BY distance
        LIMIT 1
    ) nearest_provider;
    
    -- Assign provider
    UPDATE emergency_requests 
    SET assigned_provider_id = v_provider_id,
        dispatch_time = NOW(),
        estimated_arrival = NOW() + (v_distance * INTERVAL '1 minute'),
        status = 'dispatched'
    WHERE id = NEW.id;
    
    -- Update provider status
    UPDATE providers 
    SET status = 'dispatched',
        current_request_id = NEW.id
    WHERE id = v_provider_id;
    
    -- Create dispatch record
    INSERT INTO dispatches (
        emergency_request_id, provider_id, dispatch_time, 
        estimated_arrival, status, distance
    ) VALUES (
        NEW.id, v_provider_id, NOW(), 
        NOW() + (v_distance * INTERVAL '1 minute'), 
        'en_route', v_distance
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Wait Time Calculation System

#### Factors to Consider
- Provider availability and location
- Traffic conditions and route optimization
- Hospital capacity and specialty availability
- Time of day and historical patterns
- Emergency severity and priority

#### Implementation Strategy
```sql
-- Enhanced wait time calculation
CREATE OR REPLACE FUNCTION public.calculate_wait_time(
    p_emergency_request_id UUID,
    p_provider_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_base_wait_time INTEGER;
    v_distance_factor DECIMAL;
    v_traffic_factor DECIMAL;
    v_severity_factor DECIMAL;
    v_capacity_factor DECIMAL;
    v_total_wait_time INTEGER;
BEGIN
    -- Base wait time by specialty
    SELECT average_wait_time INTO v_base_wait_time
    FROM specialty_wait_times
    WHERE specialty = (
        SELECT specialty FROM emergency_requests 
        WHERE id = p_emergency_request_id
    );
    
    -- Distance factor (1 minute per km)
    SELECT ST_Distance(
        ST_MakePoint(p.longitude, p.latitude),
        ST_MakePoint(h.longitude, h.latitude)
    ) INTO v_distance_factor
    FROM providers p
    JOIN hospitals h ON p.hospital_id = h.id
    WHERE p.id = p_provider_id;
    
    -- Traffic factor based on time of day
    v_traffic_factor := CASE
        WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 7 AND 9 THEN 1.5  -- Rush hour
        WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 17 AND 19 THEN 1.8
        WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 20 AND 6 THEN 0.7  -- Night
        ELSE 1.0
    END;
    
    -- Severity factor
    SELECT 
        CASE 
            WHEN is_urgent THEN 0.7  -- Urgent gets priority
            ELSE 1.0
        END INTO v_severity_factor
    FROM emergency_requests 
    WHERE id = p_emergency_request_id;
    
    -- Hospital capacity factor
    SELECT 
        CASE 
            WHEN current_load / max_capacity > 0.8 THEN 1.5
            WHEN current_load / max_capacity > 0.6 THEN 1.2
            ELSE 1.0
        END INTO v_capacity_factor
    FROM hospitals 
    WHERE id = (SELECT hospital_id FROM emergency_requests WHERE id = p_emergency_request_id);
    
    -- Calculate total wait time
    v_total_wait_time := CEIL(
        v_base_wait_time * 
        v_distance_factor * 
        v_traffic_factor * 
        v_severity_factor * 
        v_capacity_factor
    );
    
    RETURN jsonb_build_object(
        'base_wait_time', v_base_wait_time,
        'distance_factor', v_distance_factor,
        'traffic_factor', v_traffic_factor,
        'severity_factor', v_severity_factor,
        'capacity_factor', v_capacity_factor,
        'total_wait_time', v_total_wait_time,
        'estimated_arrival', NOW() + (v_total_wait_time * INTERVAL '1 minute')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Double Payment Prevention

#### Current Risks
- Multiple payment attempts for same emergency
- Race conditions in payment processing
- Duplicate payment records
- Refund complications

#### Prevention Strategy
```sql
-- Payment lock mechanism
CREATE OR REPLACE FUNCTION public.prevent_double_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_count INTEGER;
BEGIN
    -- Check if payment already exists
    SELECT COUNT(*) INTO v_payment_count
    FROM payments 
    WHERE emergency_request_id = NEW.emergency_request_id
    AND status = 'completed';
    
    -- Prevent duplicate payments
    IF v_payment_count > 0 THEN
        RAISE EXCEPTION 'Payment already processed for emergency request %', NEW.emergency_request_id;
    END IF;
    
    -- Set payment lock
    UPDATE emergency_requests 
    SET payment_locked = true,
        payment_lock_time = NOW()
    WHERE id = NEW.emergency_request_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Payment completion trigger
CREATE TRIGGER prevent_double_payment_trigger
BEFORE INSERT ON payments
FOR EACH ROW EXECUTE PROCEDURE public.prevent_double_payment();
```

### 4. Real-time Status Updates

#### Status Flow
1. **Created** → **Payment Processing** → **Paid** → **Dispatching** → **Dispatched** → **En Route** → **Arrived** → **In Progress** → **Completed**

#### Implementation
```sql
-- Status update function
CREATE OR REPLACE FUNCTION public.update_emergency_status(
    p_emergency_request_id UUID,
    p_new_status TEXT,
    p_provider_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_old_status TEXT;
    v_timestamp TIMESTAMPTZ := NOW();
BEGIN
    -- Get current status
    SELECT status INTO v_old_status
    FROM emergency_requests 
    WHERE id = p_emergency_request_id;
    
    -- Validate status transition
    IF NOT EXISTS (
        SELECT 1 FROM status_transitions 
        WHERE from_status = v_old_status 
        AND to_status = p_new_status
    ) THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', v_old_status, p_new_status;
    END IF;
    
    -- Update emergency request
    UPDATE emergency_requests 
    SET status = p_new_status,
        updated_at = v_timestamp,
        last_status_change = v_timestamp
    WHERE id = p_emergency_request_id;
    
    -- Update provider if specified
    IF p_provider_id IS NOT NULL THEN
        UPDATE providers 
        SET status = p_new_status,
        updated_at = v_timestamp
        WHERE id = p_provider_id;
    END IF;
    
    -- Create status history record
    INSERT INTO emergency_status_history (
        emergency_request_id, old_status, new_status, 
        timestamp, provider_id, notes
    ) VALUES (
        p_emergency_request_id, v_old_status, p_new_status,
        v_timestamp, p_provider_id, 
        'Status updated via automated system'
    );
    
    -- Send real-time notification
    PERFORM pg_notify('emergency_status_update', 
        jsonb_build_object(
            'emergency_request_id', p_emergency_request_id,
            'old_status', v_old_status,
            'new_status', p_new_status,
            'timestamp', v_timestamp
        )::text
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'old_status', v_old_status,
        'new_status', p_new_status,
        'timestamp', v_timestamp
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🔧 Edge Cases and Exception Handling

### 1. Provider Unavailability
- **Scenario**: Assigned provider becomes unavailable
- **Solution**: Auto-reassign to next available provider
- **Implementation**: Provider status monitoring and reassignment trigger

### 2. Hospital Capacity Overflow
- **Scenario**: Hospital at maximum capacity
- **Solution**: Redirect to nearest available hospital
- **Implementation**: Capacity monitoring and overflow handling

### 3. Network/Connectivity Issues
- **Scenario**: Provider loses connection during dispatch
- **Solution**: Offline mode with sync on reconnection
- **Implementation**: Connection monitoring and recovery procedures

### 4. Emergency Cancellation
- **Scenario**: Patient cancels after payment
- **Solution**: Refund processing and provider release
- **Implementation**: Cancellation workflow with refund logic

### 5. Payment Disputes
- **Scenario**: Payment chargeback or dispute
- **Solution**: Dispute resolution workflow
- **Implementation**: Dispute tracking and resolution system

## 📊 Monitoring and Analytics

### Key Metrics
1. **Response Time**: Time from payment to dispatch
2. **Arrival Time**: Time from dispatch to arrival
3. **Completion Rate**: Percentage of emergencies completed successfully
4. **Provider Utilization**: Average provider busy time
5. **Patient Satisfaction**: Post-visit feedback scores

### Real-time Dashboard
- Live emergency requests map
- Provider availability status
- Hospital capacity indicators
- Response time analytics
- Payment processing status

## 🚀 Implementation Roadmap

### Phase 1: Core Automation (Week 1-2)
- [ ] Implement auto-dispatch system
- [ ] Create wait time calculation engine
- [ ] Add double payment prevention
- [ ] Set up real-time status updates

### Phase 2: Edge Cases (Week 3-4)
- [ ] Handle provider unavailability
- [ ] Implement hospital overflow logic
- [ ] Add cancellation workflows
- [ ] Create dispute resolution system

### Phase 3: Monitoring (Week 5-6)
- [ ] Build real-time dashboard
- [ ] Implement analytics system
- [ ] Add performance monitoring
- [ ] Create alert system for issues

### Phase 4: Optimization (Week 7-8)
- [ ] Optimize dispatch algorithms
- [ ] Improve wait time predictions
- [ ] Add machine learning for routing
- [ ] Implement predictive analytics

## 🔒 Security and Compliance

### Payment Security
- PCI DSS compliance for payment processing
- Encrypted payment data storage
- Audit trails for all transactions
- Fraud detection and prevention

### Data Privacy
- HIPAA compliance for medical data
- Patient data encryption
- Access control and authentication
- Data retention policies

### Emergency Protocols
- Backup systems for high availability
- Disaster recovery procedures
- Emergency contact systems
- Regulatory compliance monitoring

---

**Next Steps**: Begin Phase 1 implementation with core automation systems.
