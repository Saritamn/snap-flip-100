export interface Item {
  id?: string;
  userId: string;
  name: string;
  brand: string;
  type: 'Shoes' | 'Clothing' | 'Accessory';
  condition: 'New' | 'Like New' | 'Used';
  purchasePrice: number;
  averageResalePrice: number;
  estimatedProfit: number;
  sellThroughRate: 'High' | 'Medium' | 'Low';
  marketplace: 'eBay' | 'Poshmark' | 'Mercari' | 'Depop' | 'Facebook Marketplace';
  photo: string;
  description: string;
  status?: 'Draft' | 'Ready to Post' | 'Posted' | 'Sold';
  soldPrice?: number;
  shippingCost?: number;
  marketplaceFee?: number;
  marketplaceSoldOn?: string;
  actualProfit?: number;
  createdAt?: any;
}

export interface Profile {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  photo?: string;
  createdAt?: any;
  subscriptionTier?: 'Free' | 'Pro' | 'Unlimited' | 'Admin';
  lookupCount?: number;
  maxLookups?: number;
}

export interface DashboardStats {
  totalItems: number;
  totalProfit: number;
  totalListed: number;
  totalSold: number;
  totalMilesYTD: number;
  brandSummary: { brand: string; count: number; profit: number }[];
  marketplaceSummary: { marketplace: string; count: number }[];
}

export interface Trip {
  id?: string;
  userId: string;
  date: string;
  startLocation: string;
  endLocation: string;
  miles: number;
  notes?: string;
  createdAt?: any;
}
