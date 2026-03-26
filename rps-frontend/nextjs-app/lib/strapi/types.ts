export type StrapiMeta = {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
};

export type StrapiCollectionResponse<T> = {
  data: T[];
};

export type StrapiSingleResponse<T> = {
  data: T;
};

export type StrapiCompany = StrapiMeta & {
  name: string;
  slug: string;
};

export type StrapiQuestionOption = {
  label: string;
  value: string;
};

export type StrapiQuestion = StrapiMeta & {
  title: string;
  type: "scale" | "choice" | "text";
  helpText: string;
  orderIndex: number;
  options?: StrapiQuestionOption[];
};

export type StrapiCampaign = StrapiMeta & {
  title: string;
  description: string;
  status: "draft" | "active" | "closed";
  startDate: string;
  endDate: string;
  company: StrapiCompany;
  questions: StrapiQuestion[];
};

export type StrapiEmployee = StrapiMeta & {
  fullName: string;
  email: string;
  department: string;
  responseStatus: "responded" | "pending";
  stressScore: number;
  company: StrapiCompany;
};

export type StrapiInsight = StrapiMeta & {
  title: string;
  category: "dashboard" | "analysis";
  severity: "medium" | "high";
};

export type StrapiAnalyticsSnapshot = StrapiMeta & {
  name: string;
  participationRate: number;
  averageStress: number;
  alertsDetected: number;
  employeesResponded: number;
  totalEmployees: number;
  trendMonthly: { label: string; value: number }[];
  trendWeekly: { label: string; value: number }[];
  departmentDistribution: { label: string; value: number; color: string }[];
};

export type StrapiReport = StrapiMeta & {
  title: string;
  companyName: string;
  participationRate: number;
  averageStress: number;
  alertCount: number;
  riskAreas: string[];
  recommendations: string[];
};

export type StrapiReportTemplate = StrapiMeta & {
  templateName: string;
  executiveSummaryTitle: string;
  executiveSummaryBody: string;
  methodologyTitle: string;
  methodologyBody: string;
  recommendationsTitle: string;
  recommendationsIntro: string;
  consultantNotesTitle: string;
  consultantNotesPlaceholder: string;
  conclusionTitle: string;
  conclusionBody: string;
};
