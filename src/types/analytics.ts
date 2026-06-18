/**
 * Analytics Dashboard Types
 * Based on SRS Section 3.2.3
 */

export type TimeRange = "7d" | "30d" | "90d" | "1y" | "all" | "custom";

export interface DateRange {
  start: string; // ISO date string
  end: string;
}

export interface AnalyticsFilters {
  timeRange?: TimeRange;
  dateRange?: DateRange;
  district?: string;
  commodity?: string;
  fpoId?: string;
}

// Summary Statistics
export interface DashboardSummary {
  totalFpos: number;
  totalFposChange: number; // Percentage change from previous period
  pendingApplications: number;
  approvedFpos: number;
  activeFpos: number;
  totalProducts: number;
  totalMatches: number;
  totalMatchesCompleted: number;
}

// District-wise Data
export interface DistrictStats {
  district: string;
  districtMl?: string;
  fpoCount: number;
  memberCount: number;
  productCount: number;
  matchCount: number;
  revenue?: number;
}

// FPO Performance Metrics
export interface FpoPerformanceMetric {
  fpoId: string;
  fpoName: string;
  district: string;
  memberCount: number;
  productCount: number;
  matchesReceived: number;
  matchesCompleted: number;
  conversionRate: number; // Percentage
  revenue?: number;
  rating?: number;
}

// Crop/Commodity Data
export interface CropTrendData {
  commodity: string;
  commodityMl?: string;
  totalQuantity: number;
  unit: string;
  averagePrice: number;
  priceChange: number; // Percentage
  fpoCount: number;
  demandIndex: number; // 0-100 scale
}

// Scheme Utilization
export interface SchemeUtilization {
  schemeId: string;
  schemeName: string;
  schemeNameMl?: string;
  totalBeneficiaries: number;
  totalAmount: number;
  utilizationRate: number; // Percentage
  district?: string;
}

// Market Activity
export interface MarketActivityData {
  date: string;
  totalListings: number;
  newListings: number;
  totalMatches: number;
  completedTransactions: number;
  totalVolume: number; // In currency
}

// Chart Data Structures
export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface PieChartDataPoint {
  name: string;
  nameMl?: string;
  value: number;
  color?: string;
}

export interface BarChartDataPoint {
  category: string;
  categoryMl?: string;
  value: number;
  previousValue?: number;
}

// Analytics Response Types
export interface DistrictAnalytics {
  summary: DashboardSummary;
  districtStats: DistrictStats[];
  fpoPerformance: FpoPerformanceMetric[];
  cropTrends: CropTrendData[];
  schemeUtilization: SchemeUtilization[];
  marketActivity: MarketActivityData[];
  registrationTrend: TimeSeriesDataPoint[];
  commodityDistribution: PieChartDataPoint[];
}

export interface StateAnalytics {
  summary: DashboardSummary;
  districtComparison: DistrictStats[];
  topPerformingFpos: FpoPerformanceMetric[];
  cropTrends: CropTrendData[];
  schemeUtilization: SchemeUtilization[];
  marketActivity: MarketActivityData[];
  registrationTrend: TimeSeriesDataPoint[];
  districtWiseRegistration: BarChartDataPoint[];
}

// Export Report Types
export type ReportFormat = "pdf" | "excel" | "csv";

export interface ReportRequest {
  type: "district" | "state" | "fpo" | "custom";
  filters: AnalyticsFilters;
  format: ReportFormat;
  includeCharts?: boolean;
  sections?: string[];
}

export interface ReportResponse {
  id: string;
  status: "generating" | "ready" | "failed";
  downloadUrl?: string;
  expiresAt?: string;
  error?: string;
}
