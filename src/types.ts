export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'customer' | 'agent';
  currentZone?: string; // Optional: for agents to specify their current zone
  status?: 'available' | 'busy'; // Optional: for agents
  latitude?: number;
  longitude?: number;
}

export interface Zone {
  id: string;
  name: string;
  coverageAreas: string[]; // Areas or Postal codes under this zone (e.g. "Downtown", "Westside")
}

export interface RateCard {
  id: string;
  zoneType: 'intra' | 'inter';
  orderType: 'B2B' | 'B2C';
  baseRate: number;       // Base charge for delivery
  baseWeightLimit: number; // Limit up to which only base rate is charged (e.g., 2 kg)
  perKgRate: number;      // Extra charge per kg above baseWeightLimit
}

export interface SurchargeConfig {
  codSurchargeB2B: number;
  codSurchargeB2C: number;
}

export interface TrackingHistoryLog {
  id: string;
  timestamp: string;
  status: string;
  actor: string;
  actorRole: string;
  comment: string;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  orderId: string;
  type: 'Email' | 'SMS';
  recipient: string;
  message: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  
  // Package specifications
  pickupAddress: string;
  pickupArea: string; // Used to identify pickup zone
  pickupZone: string;
  dropAddress: string;
  dropArea: string; // Used to identify drop zone
  dropZone: string;
  
  length: number; // cm
  width: number;  // cm
  height: number; // cm
  actualWeight: number; // kg
  
  volumetricWeight: number; // calculated: (L * B * H) / 5000
  chargeableWeight: number; // Max(actualWeight, volumetricWeight)
  
  orderType: 'B2B' | 'B2C';
  paymentType: 'Prepaid' | 'COD';
  
  // Rate calculation breakdown
  baseRate: number;
  weightSurplusCharge: number;
  codSurcharge: number;
  totalCharge: number;
  
  // Logistics
  status: 'Created' | 'Assigned' | 'Picked Up' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Failed';
  agentId?: string;
  agentName?: string;
  
  // Reschedule
  rescheduleDate?: string;
  rescheduleCount: number;
  
  // Audit trail
  trackingHistory: TrackingHistoryLog[];
  createdAt: string;
}

export interface DatabaseState {
  users: User[];
  zones: Zone[];
  rateCards: RateCard[];
  surchargeConfig: SurchargeConfig;
  orders: Order[];
  notifications: NotificationLog[];
}
