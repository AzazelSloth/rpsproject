import type {
  StrapiAnalyticsSnapshot,
  StrapiCampaign,
  StrapiEmployee,
  StrapiInsight,
  StrapiQuestion,
  StrapiReport,
  StrapiReportTemplate,
} from "@/lib/strapi/types";

export type EmployeeStatus = "Responded" | "Not responded";

export type EmployeeRecord = {
  id: number;
  documentId: string;
  name: string;
  email: string;
  department: string;
  stressScore: number;
  responseStatus: EmployeeStatus;
};

export type SurveyQuestion = {
  id: string;
  documentId: string;
  type: "scale" | "choice" | "text" | "section";
  title: string;
  helpText: string;
  options?: string[];
  orderIndex: number;
};

export function mapStrapiQuestion(question: StrapiQuestion): SurveyQuestion {
  return {
    id: String(question.id),
    documentId: question.documentId,
    type: question.type,
    title: question.title,
    helpText: question.helpText,
    options: question.options?.map((option) => option.label),
    orderIndex: question.orderIndex,
  };
}

export function mapStrapiCampaign(campaign: StrapiCampaign) {
  return {
    id: campaign.id,
    documentId: campaign.documentId,
    title: campaign.title,
    description: campaign.description,
    status: campaign.status,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    companyName: campaign.company.name,
    questions: campaign.questions
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(mapStrapiQuestion),
  };
}

export function mapStrapiEmployee(employee: StrapiEmployee): EmployeeRecord {
  return {
    id: employee.id,
    documentId: employee.documentId,
    name: employee.fullName,
    email: employee.email,
    department: employee.department,
    stressScore: employee.stressScore,
    responseStatus:
      employee.responseStatus === "responded" ? "Responded" : "Not responded",
  };
}

export function mapStrapiInsight(insight: StrapiInsight) {
  return insight.title;
}

export function mapStrapiAnalyticsSnapshot(snapshot: StrapiAnalyticsSnapshot) {
  return {
    participationRate: snapshot.participationRate,
    averageStress: snapshot.averageStress.toFixed(1),
    responded: snapshot.employeesResponded,
    totalEmployees: snapshot.totalEmployees,
    alertsDetected: snapshot.alertsDetected,
    trendByRange: {
      monthly: snapshot.trendMonthly,
      weekly: snapshot.trendWeekly,
    } as const,
    departmentDistribution: snapshot.departmentDistribution,
  };
}

export function mapStrapiReport(report: StrapiReport) {
  return {
    title: report.title,
    companyName: report.companyName,
    participationRate: report.participationRate,
    averageStress: report.averageStress,
    alertCount: report.alertCount,
    riskAreas: report.riskAreas,
    recommendations: report.recommendations,
  };
}

export function mapStrapiReportTemplate(template: StrapiReportTemplate) {
  return {
    templateName: template.templateName,
    executiveSummaryTitle: template.executiveSummaryTitle,
    executiveSummaryBody: template.executiveSummaryBody,
    methodologyTitle: template.methodologyTitle,
    methodologyBody: template.methodologyBody,
    recommendationsTitle: template.recommendationsTitle,
    recommendationsIntro: template.recommendationsIntro,
    consultantNotesTitle: template.consultantNotesTitle,
    consultantNotesPlaceholder: template.consultantNotesPlaceholder,
    conclusionTitle: template.conclusionTitle,
    conclusionBody: template.conclusionBody,
  };
}
