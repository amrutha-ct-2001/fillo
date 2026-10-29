export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export type User = {
  id: number;
  phone: string;
  username?: string | null;
  name: string;
  role: Role;
  is_active: boolean;
  points_balance?: number;
  station_id?: number | null;
  station_name?: string | null;
  created_at?: string;
};

export type Station = {
  id: number;
  name: string;
  address: string;
  city: string;
  is_active: boolean;
  staff_count?: number;
  created_at?: string;
};

export type Reward = {
  id: number;
  title: string;
  description: string;
  points_cost: number;
  /** null = unlimited. */
  stock: number | null;
  is_active: boolean;
  created_at?: string;
};

export type VoucherStatus = 'PENDING' | 'USED' | 'CANCELLED';

export type Redemption = {
  id: number;
  code: string;
  reward: Reward;
  points_spent: number;
  status: VoucherStatus;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  verified_by_name: string | null;
  created_at: string;
  used_at: string | null;
  /** Only on the redeem response: the customer's balance afterwards. */
  balance?: number;
};

export type Vehicle = {
  id: number;
  plate_number: string;
  vehicle_type: 'BIKE' | 'CAR' | 'OTHER';
  photo_url?: string | null;
  customer: User;
  model_name?: string;
  colour?: string;
  notes?: string;
  created_at?: string;
};

export type Transaction = {
  id: number;
  vehicle: Vehicle;
  customer: User;
  staff: User;
  amount: string;
  fuel_type?: string;
  payment_mode: 'UPI' | 'CASH' | 'CARD';
  payment_proof_url?: string | null;
  vehicle_photo_url?: string | null;
  points_earned: number;
  points_redeemed: number;
  notes?: string;
  station_name?: string | null;
  created_at: string;
  customer_balance?: number;
};

export type PointsSettings = {
  earn_points_per_rupees: number;
  earn_rupees_unit: number;
  redeem_rate: string | null;
  min_redeem_points: number;
  /** Points earned on a fill can be used on that same fill (server default: on). */
  instant_redeem?: boolean;
  updated_at?: string;
};

export type LedgerEntry = {
  id: number;
  delta: number;
  type: 'EARN' | 'REDEEM' | 'ADJUST';
  transaction?: number | null;
  note: string;
  created_at: string;
};

export type Dashboard = {
  today: {
    fills: number;
    amount: string;
    points_issued: number;
    points_redeemed: number;
  };
  top_customers: Array<{
    customer_id: number;
    customer__phone: string;
    customer__name: string;
    total_amount: number;
    fills: number;
  }>;
  by_staff?: Array<{
    staff_id: number;
    name: string;
    username: string;
    phone: string;
    fills: number;
    total_amount: string;
  }>;
  by_payment?: Array<{
    payment_mode: string;
    fills: number;
    total_amount: string;
  }>;
  recent_fills?: Transaction[];
  by_station?: Array<{
    station_id: number;
    name: string;
    fills: number;
    total_amount: string;
  }>;
  customer_count: number;
  vehicle_count: number;
  staff_count?: number;
  station_count?: number;
  pending_vouchers?: number;
};

export type OfflineFill = {
  id: string;
  /** Staff member who made the fill; only they may sync it. */
  staffId?: number;
  createdAt: string;
  payload: {
    plate_number: string;
    /** Known vehicle; lets the server skip a second plate lookup on sync. */
    vehicle_id?: number;
    phone?: string;
    name?: string;
    amount: string;
    payment_mode: 'UPI' | 'CASH' | 'CARD';
    points_to_redeem?: number;
    vehicle_type?: string;
    notes?: string;
  };
  vehiclePhotoUri?: string;
  paymentProofUri?: string;
};
