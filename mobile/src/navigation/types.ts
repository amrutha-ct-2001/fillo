export type StaffStackParamList = {
  StaffHome: undefined;
  ScanPlate: undefined;
  FindCustomer: {mode?: 'plate' | 'phone'} | undefined;
  Fill: {
    plate: string;
    vehicleId?: number;
    customerId?: number;
    phone?: string;
    name?: string;
    pointsBalance?: number;
    /** Set when the plate was already looked up (true = no such vehicle). */
    isNew?: boolean;
    vehiclePhotoUri?: string;
  };
  ProofCamera: undefined;
  FillSuccess: {
    amount: string;
    pointsEarned: number;
    pointsUsed?: number;
    balance: number;
    plate: string;
    offline?: boolean;
    paymentMode?: 'UPI' | 'CASH' | 'CARD';
    customerName?: string;
    customerPhone?: string;
    fuelType?: string;
  };
  CustomerHistory: {
    customerId: number;
    name?: string;
    phone?: string;
  };
  VerifyVoucher: undefined;
};

export type CustomerTabParamList = {
  Home: undefined;
  Rewards: undefined;
  Vehicles: undefined;
  History: undefined;
  Profile: undefined;
};

export type AdminCustomersStackParamList = {
  CustomersList: undefined;
  CustomerDetail: {customerId: number; name?: string; phone?: string};
};

export type AdminStaffStackParamList = {
  StaffList: undefined;
  /** No staffId means "add a new staff member". */
  StaffForm: {staffId?: number} | undefined;
};

export type AdminRewardsStackParamList = {
  RewardsList: undefined;
  /** No rewardId means "add a new reward". */
  RewardForm: {rewardId?: number} | undefined;
};

export type AdminSettingsStackParamList = {
  SettingsHome: undefined;
  Stations: undefined;
  /** No stationId means "add a new station". */
  StationForm: {stationId?: number} | undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  Customers: undefined;
  Staff: undefined;
  Rewards: undefined;
  Settings: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  StaffLogin: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Staff: undefined;
  Customer: undefined;
  Admin: undefined;
};
