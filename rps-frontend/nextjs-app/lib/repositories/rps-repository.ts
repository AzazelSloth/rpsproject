import {
  demoSurveyAccessToken,
  getDemoDataset,
  reportData,
  reportTemplateData,
  trendByRange,
} from "@/lib/demo-data";
import {
  isBackendConfigured,
} from "@/lib/backend/client";
import {
  getServerBackendCollection as getBackendCollection,
  getServerBackendItem as getBackendItem,
} from "@/lib/backend/server";
import type {
  BackendCampaign,
  BackendCampaignProgress,
  BackendCompany,
  BackendEmployee,
  BackendQuestionnaire,
  BackendQuestion,
  BackendReport,
  BackendResponse,
} from "@/lib/backend/types";
import {
  type EmployeeRecord,
  type SurveyQuestion,
  mapStrapiReportTemplate,
} from "@/lib/strapi/mappers";
import { getStrapiSingle, isStrapiConfigured } from "@/lib/strapi/client";
import type { StrapiReportTemplate } from "@/lib/strapi/types";

type DashboardData = {
  metrics: {
    participationRate: number;
    averageStress: string;
    responded: number;
    totalEmployees: number;
    alertsDetected: number;
  };
  trendByRange: {
    monthly: { label: string; value: number }[];
    weekly: { label: string; value: number }[];
  };
  departmentDistribution: { label: string; value: number; color: string }[];
  insights: string[];
};

type ResultsData = {
  metrics: {
    participationRate: number;
    averageStress: string;
  };
  bars: {
    department: string;
    value: number;
    average: string;
  }[];
  analysis: string[];
};

type SurveyResponseData = {
  participantToken: string | null;
  employeeId: number | null;
  employeeName: string;
  employeeTitle: string;
  companyName: string;
  campaignName: string;
  status: string;
  completedAt: string | null;
  questions: SurveyQuestion[];
};

export type CampaignParticipantRecord = {
  id: number;
  employeeId: number;
  name: string;
  email: string;
  department: string;
  status: "pending" | "reminded" | "completed";
  responseStatus: EmployeeRecord["responseStatus"];
  invitationSentAt: string | null;
  reminderSentAt: string | null;
  completedAt: string | null;
  participationToken: string;
  surveyUrl: string;
};

export type EmployeeManagementData = {
  campaignId: number | null;
  companyId: number | null;
  campaignName: string;
  campaignStatus: string;
  participationRate: number;
  totalParticipants: number;
  completedParticipants: number;
  pendingParticipants: number;
  remindedParticipants: number;
  participants: CampaignParticipantRecord[];
};

export type SurveyBuilderData = {
  campaignId: number | null;
  companyId: number | null;
  companies: { id: number; name: string }[];
  campaigns: { id: number; name: string; status: string; companyId: number | null }[];
  title: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  questions: SurveyQuestion[];
};

export type ReportTemplateData = {
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

export type ReportDocumentData = {
  title: string;
  companyName: string;
  participationRate: number;
  averageStress: number;
  alertCount: number;
  riskAreas: string[];
  recommendations: string[];
  archivedReportPath?: string | null;
  template: ReportTemplateData;
};

export async function getSurveyCampaign(scenario?: string | null) {
  const demoDataset = getDemoDataset(scenario);

  if (!isBackendConfigured()) {
    return demoDataset.campaign;
  }

  try {
    const campaigns = await getBackendCollection<BackendCampaign>("/campaigns");
    const activeCampaign =
      campaigns.find((item) => item.status === "active") ?? campaigns[0];

    if (!activeCampaign) {
      return demoDataset.campaign;
    }

    return mapBackendCampaign(activeCampaign);
  } catch {
    return demoDataset.campaign;
  }
}

export async function getSurveyQuestions(scenario?: string | null) {
  const currentCampaign = await getSurveyCampaign(scenario);
  return currentCampaign.questions;
}

export type SurveyOption = {
  id: number;
  title: string;
  status: string;
  companyId: number | null;
};

export async function getAllSurveys(scenario?: string | null): Promise<SurveyOption[]> {
  const demoDataset = getDemoDataset(scenario);

  if (!isBackendConfigured()) {
    // Retourne le sondage demo comme seule option
    return [{
      id: demoDataset.campaign.id ?? 1,
      title: demoDataset.campaign.title,
      status: demoDataset.campaign.status,
      companyId: 1,
    }];
  }

  try {
    const campaigns = await getBackendCollection<BackendCampaign>("/campaigns");
    return campaigns.map(c => ({
      id: c.id,
      title: c.name,
      status: c.status,
      companyId: c.company?.id ?? null,
    }));
  } catch {
    return [{
      id: demoDataset.campaign.id ?? 1,
      title: demoDataset.campaign.title,
      status: demoDataset.campaign.status,
      companyId: 1,
    }];
  }
}

export async function getSurveyBuilderData(
  scenario?: string | null,
  campaignId?: number | null,
): Promise<SurveyBuilderData> {
  const demoDataset = getDemoDataset(scenario);

  if (isBackendConfigured()) {
    try {
      const [campaigns, companies] = await Promise.all([
        getBackendCollection<BackendCampaign>("/campaigns"),
        getBackendCollection<BackendCompany>("/companies"),
      ]);
      const activeCampaign =
        (campaignId ? campaigns.find((item) => item.id === campaignId) : null) ??
        campaigns.find((item) => item.status === "active") ??
        campaigns[0];
      const companyOptions = companies.map((company) => ({
        id: company.id,
        name: company.name,
      }));

      // Formater les campagnes disponibles
      const campaignOptions = campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        companyId: campaign.company?.id ?? null,
      }));

      if (activeCampaign) {
        const mappedCampaign = mapBackendCampaign(activeCampaign);
        const activeCompanyId = activeCampaign.company?.id ?? null;

        return {
          campaignId: activeCampaign.id,
          companyId: activeCompanyId,
          companies: companyOptions,
          campaigns: campaignOptions.filter((c) => c.companyId === activeCompanyId),
          title: mappedCampaign.title,
          description: mappedCampaign.description,
          status: mappedCampaign.status,
          startDate: mappedCampaign.startDate ?? "",
          endDate: mappedCampaign.endDate ?? "",
          questions: mappedCampaign.questions,
        };
      }

      return {
        campaignId: null,
        companyId: companyOptions[0]?.id ?? null,
        companies: companyOptions,
        campaigns: campaignOptions,
        title: "Nouveau sondage RPS",
        description:
          "Sondage trimestriel visant a mesurer le stress, la charge de travail et la qualite de l'environnement professionnel.",
        status: "draft",
        startDate: "",
        endDate: "",
        questions: [],
      };
    } catch {
      // Fall back to the demo-backed shape below.
    }
  }

  const currentCampaign = await getSurveyCampaign(scenario);

  return {
    campaignId: currentCampaign.id ?? null,
    companyId: 1,
    companies: [
      {
        id: 1,
        name: currentCampaign.companyName || demoDataset.campaign.companyName,
      },
    ],
    campaigns: [
      {
        id: currentCampaign.id ?? 1,
        name: currentCampaign.title,
        status: currentCampaign.status,
        companyId: 1,
      },
    ],
    title: "",
    description: "",
    status: currentCampaign.status,
    startDate: currentCampaign.startDate ?? "",
    endDate: currentCampaign.endDate ?? "",
    questions: currentCampaign.questions.length
      ? currentCampaign.questions
      : demoDataset.campaign.questions,
  };
}

export async function getEmployees(scenario?: string | null) {
  const demoDataset = getDemoDataset(scenario);

  if (!isBackendConfigured()) {
    return demoDataset.employees;
  }

  try {
    const entries = await getBackendCollection<BackendEmployee>("/employees");
    return entries.map(mapBackendEmployee);
  } catch {
    return demoDataset.employees;
  }
}

export async function getEmployeeManagementData(
  scenario?: string | null,
  campaignId?: number | null,
): Promise<EmployeeManagementData> {
  const demoDataset = getDemoDataset(scenario);

  if (!isBackendConfigured()) {
    return {
      campaignId: demoDataset.campaign.id,
      companyId: 1,
      campaignName: demoDataset.campaign.title,
      campaignStatus: demoDataset.campaign.status,
      participationRate: demoDataset.dashboardMetrics.participationRate,
      totalParticipants: demoDataset.employees.length,
      completedParticipants: demoDataset.employees.filter(
        (employee) => employee.responseStatus === "Responded",
      ).length,
      pendingParticipants: demoDataset.employees.filter(
        (employee) => employee.responseStatus !== "Responded",
      ).length,
      remindedParticipants: 1,
      participants: demoDataset.employees.map((employee, index) => ({
        id: employee.id,
        employeeId: employee.id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        status: employee.responseStatus === "Responded" ? "completed" : "pending",
        responseStatus: employee.responseStatus,
        invitationSentAt: "2026-03-15T09:00:00.000Z",
        reminderSentAt:
          employee.responseStatus === "Responded" || index > 1
            ? null
            : "2026-03-20T09:00:00.000Z",
        completedAt:
          employee.responseStatus === "Responded" ? "2026-03-18T09:00:00.000Z" : null,
        participationToken: `${demoSurveyAccessToken}-${employee.id}`,
        surveyUrl: `/survey-response/${demoSurveyAccessToken}-${employee.id}`,
      })),
    };
  }

  try {
    const campaigns = await getBackendCollection<BackendCampaign>("/campaigns");
    const activeCampaign =
      (campaignId ? campaigns.find((item) => item.id === campaignId) : null) ??
      campaigns.find((item) => item.status === "active") ??
      campaigns[0];

    if (!activeCampaign) {
      throw new Error("no_campaign");
    }

    const progress = await getBackendItem<BackendCampaignProgress>(
      `/campaign-participants/campaign/${activeCampaign.id}/progress`,
    );

    return {
      campaignId: activeCampaign.id,
      companyId: activeCampaign.company?.id ?? null,
      campaignName: activeCampaign.name,
      campaignStatus: activeCampaign.status,
      participationRate: progress.participation_rate,
      totalParticipants: progress.total_participants,
      completedParticipants: progress.completed_participants,
      pendingParticipants: progress.pending_participants,
      remindedParticipants: progress.reminded_participants,
      participants: progress.participants.map((participant) => {
        console.log('[DEBUG] Backend participant email:', participant.employee?.email);
        return {
          id: participant.id,
          employeeId: participant.employee.id,
          name: `${participant.employee.first_name} ${participant.employee.last_name}`.trim(),
          email: participant.employee.email,
          department: participant.employee.department ?? "Non renseigne",
          status: participant.status,
          responseStatus:
            participant.status === "completed" ? "Responded" : "Not responded",
          invitationSentAt: participant.invitation_sent_at,
          reminderSentAt: participant.reminder_sent_at,
          completedAt: participant.completed_at,
          participationToken: participant.participation_token,
          surveyUrl: `/survey-response/${participant.participation_token}`,
        };
      }),
    };
  } catch {
    return {
      campaignId: demoDataset.campaign.id,
      companyId: 1,
      campaignName: demoDataset.campaign.title,
      campaignStatus: demoDataset.campaign.status,
      participationRate: demoDataset.dashboardMetrics.participationRate,
      totalParticipants: demoDataset.employees.length,
      completedParticipants: demoDataset.employees.filter(
        (employee) => employee.responseStatus === "Responded",
      ).length,
      pendingParticipants: demoDataset.employees.filter(
        (employee) => employee.responseStatus !== "Responded",
      ).length,
      remindedParticipants: 1,
      participants: demoDataset.employees.map((employee, index) => ({
        id: employee.id,
        employeeId: employee.id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        status: employee.responseStatus === "Responded" ? "completed" : "pending",
        responseStatus: employee.responseStatus,
        invitationSentAt: "2026-03-15T09:00:00.000Z",
        reminderSentAt:
          employee.responseStatus === "Responded" || index > 1
            ? null
            : "2026-03-20T09:00:00.000Z",
        completedAt:
          employee.responseStatus === "Responded" ? "2026-03-18T09:00:00.000Z" : null,
        participationToken: `${demoSurveyAccessToken}-${employee.id}`,
        surveyUrl: `/survey-response/${demoSurveyAccessToken}-${employee.id}`,
      })),
    };
  }
}

export async function getDashboardData(scenario?: string | null): Promise<DashboardData> {
  const demoDataset = getDemoDataset(scenario);

  if (!isBackendConfigured()) {
    return {
      metrics: demoDataset.dashboardMetrics,
      trendByRange: demoDataset.trendByRange,
      departmentDistribution: demoDataset.departmentDistribution,
      insights: demoDataset.aiInsights,
    };
  }

  try {
    const [campaigns, employeeEntries, responses] = await Promise.all([
      getBackendCollection<BackendCampaign>("/campaigns"),
      getBackendCollection<BackendEmployee>("/employees"),
      getBackendCollection<BackendResponse>("/responses"),
    ]);

    return buildDashboardData(campaigns, employeeEntries, responses);
  } catch {
    return {
      metrics: demoDataset.dashboardMetrics,
      trendByRange: demoDataset.trendByRange,
      departmentDistribution: demoDataset.departmentDistribution,
      insights: demoDataset.aiInsights,
    };
  }
}

export async function getResultsData(scenario?: string | null): Promise<ResultsData> {
  const demoDataset = getDemoDataset(scenario);

  if (!isBackendConfigured()) {
    return {
      metrics: {
        participationRate: demoDataset.dashboardMetrics.participationRate,
        averageStress: demoDataset.dashboardMetrics.averageStress,
      },
      bars: demoDataset.stressByDepartment,
      analysis: demoDataset.aiAnalysis,
    };
  }

  try {
    const [employeeEntries, responses] = await Promise.all([
      getBackendCollection<BackendEmployee>("/employees"),
      getBackendCollection<BackendResponse>("/responses"),
    ]);

    return buildResultsData(employeeEntries, responses);
  } catch {
    return {
      metrics: {
        participationRate: demoDataset.dashboardMetrics.participationRate,
        averageStress: demoDataset.dashboardMetrics.averageStress,
      },
      bars: demoDataset.stressByDepartment,
      analysis: demoDataset.aiAnalysis,
    };
  }
}

export async function getReportData(scenario?: string | null) {
  const demoDataset = getDemoDataset(scenario);
  const template = await getReportTemplateData();

  if (!isBackendConfigured()) {
    return {
      ...demoDataset.reportData,
      archivedReportPath: null,
      template,
    };
  }

  try {
    const [campaigns, employeeEntries, responses, reports] = await Promise.all([
      getBackendCollection<BackendCampaign>("/campaigns"),
      getBackendCollection<BackendEmployee>("/employees"),
      getBackendCollection<BackendResponse>("/responses"),
      getBackendCollection<BackendReport>("/reports"),
    ]);

    return {
      ...buildReportData(campaigns, employeeEntries, responses, reports),
      template,
    };
  } catch {
    return {
      ...demoDataset.reportData,
      archivedReportPath: null,
      template,
    };
  }
}

export async function getReportTemplateData(): Promise<ReportTemplateData> {
  if (!isStrapiConfigured()) {
    return reportTemplateData;
  }

  try {
    const response = await getStrapiSingle<StrapiReportTemplate>("/api/report-template");
    return mapStrapiReportTemplate(response.data);
  } catch {
    return reportTemplateData;
  }
}

export async function getSurveyResponseData(
  token?: string,
  scenario?: string | null,
): Promise<SurveyResponseData> {
  const demoDataset = getDemoDataset(scenario);

  if (!isBackendConfigured()) {
    return {
      participantToken: demoSurveyAccessToken,
      employeeId: demoDataset.employees[0]?.id ?? 1,
      employeeName: demoDataset.employees[0]?.name ?? "Salarie demo",
      employeeTitle: demoDataset.employees[0]?.department ?? "Collaborateur",
      companyName: demoDataset.campaign.companyName ?? "Entreprise demo",
      campaignName: demoDataset.campaign.title,
      status: "pending",
      completedAt: null,
      questions: demoDataset.surveyQuestions,
    };
  }

  if (token) {
    try {
      const questionnaire = await getBackendItem<BackendQuestionnaire>(
        `/campaign-participants/token/${token}/questionnaire`,
      );
      if (questionnaire) {
        return mapBackendQuestionnaire(questionnaire);
      }
    } catch {
        return {
          participantToken: null,
          employeeId: null,
          employeeName: "",
          employeeTitle: "",
          companyName: "",
          campaignName: "",
          status: "not-found",
          completedAt: null,
        questions: [],
      };
    }
  }

  try {
    const [currentCampaign, employeeEntries] = await Promise.all([
      getSurveyCampaign(scenario),
      getBackendCollection<BackendEmployee>("/employees"),
    ]);

    return {
      participantToken: null,
      employeeId: employeeEntries[0]?.id ?? 1,
      employeeName:
        `${employeeEntries[0]?.first_name ?? ""} ${employeeEntries[0]?.last_name ?? ""}`.trim() ||
        "Salarie",
      employeeTitle: employeeEntries[0]?.department ?? "Collaborateur",
      companyName: currentCampaign.companyName,
      campaignName: currentCampaign.title,
      status: "pending",
      completedAt: null,
      questions: currentCampaign.questions,
    };
  } catch {
    return {
      participantToken: demoSurveyAccessToken,
      employeeId: demoDataset.employees[0]?.id ?? 1,
      employeeName: demoDataset.employees[0]?.name ?? "Salarie demo",
      employeeTitle: demoDataset.employees[0]?.department ?? "Collaborateur",
      companyName: demoDataset.campaign.companyName ?? "Entreprise demo",
      campaignName: demoDataset.campaign.title,
      status: "pending",
      completedAt: null,
      questions: demoDataset.surveyQuestions,
    };
  }
}

function mapBackendQuestionnaire(entry: BackendQuestionnaire): SurveyResponseData {
  return {
    participantToken: entry.token,
    employeeId: entry.employee.id,
    employeeName: `${entry.employee.first_name} ${entry.employee.last_name}`.trim(),
    employeeTitle: entry.employee.department ?? "Collaborateur",
    companyName: entry.campaign.company?.name ?? "Entreprise",
    campaignName: entry.campaign.name,
    status: entry.status,
    completedAt: entry.completed_at,
    questions: entry.questions
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map(mapBackendQuestion),
  };
}

function mapBackendCampaign(entry: BackendCampaign) {
  return {
    id: entry.id,
    documentId: `campaign-${entry.id}`,
    title: entry.name,
    description:
      entry.description ??
      "Description du sondage ici. Ce champ peut etre utilise pour fournir des instructions ou des informations supplementaires aux participants.",
    status: mapCampaignStatus(entry.status),
    startDate: entry.start_date ?? "",
    endDate: entry.end_date ?? "",
    companyName: entry.company?.name ?? "Entreprise",
    questions: (entry.questions ?? [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map(mapBackendQuestion),
  };
}

function mapBackendQuestion(entry: BackendQuestion): SurveyQuestion {
  const type = normalizeQuestionType(entry.question_type);
  const defaultOptions = ["Oui", "Partiellement", "Non"];

  return {
    id: String(entry.id),
    documentId: `question-${entry.id}`,
    type,
    title: entry.question_text,
    helpText: entry.rps_dimension
      ? `Dimension analysee: ${entry.rps_dimension}`
      : "Question du questionnaire RPS",
    options:
      type === "choice"
        ? entry.choice_options?.filter(Boolean).length
          ? entry.choice_options.filter(Boolean)
          : defaultOptions
        : undefined,
    orderIndex: entry.order_index ?? 0,
  };
}

function mapBackendEmployee(entry: BackendEmployee): EmployeeRecord {
  const fullName = `${entry.first_name ?? ""} ${entry.last_name ?? ""}`.trim();
  const responseStatus = (entry.responses?.length ?? 0) > 0 ? "Responded" : "Not responded";

  return {
    id: entry.id,
    documentId: `employee-${entry.id}`,
    name: fullName || "Employe",
    email: entry.email,
    department: entry.department ?? "Non renseigne",
    stressScore: computeStressScore(entry.responses ?? []),
    responseStatus,
  };
}

function normalizeQuestionType(type: string | null | undefined): SurveyQuestion["type"] {
  switch ((type ?? "").toLowerCase()) {
    case "scale":
    case "rating":
    case "likert":
      return "scale";
    case "choice":
    case "multiple_choice":
    case "radio":
      return "choice";
    default:
      return "text";
  }
}

function mapCampaignStatus(status: string) {
  switch (status) {
    case "active":
      return "active" as const;
    case "archived":
    case "terminated":
      return "closed" as const;
    default:
      return "draft" as const;
  }
}

function computeStressScore(responses: Pick<BackendResponse, "answer" | "question">[]) {
  const scaleValues = responses
    .filter((response) => normalizeQuestionType(response.question?.question_type) === "scale")
    .map((response) => Number(response.answer))
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);

  if (!scaleValues.length) {
    return 0;
  }

  const average = scaleValues.reduce((sum, value) => sum + value, 0) / scaleValues.length;
  return Number(average.toFixed(1));
}

function buildDashboardData(
  campaigns: BackendCampaign[],
  employeeEntries: BackendEmployee[],
  responses: BackendResponse[],
): DashboardData {
  const employeesData = employeeEntries.map(mapBackendEmployee);
  const respondedEmployees = employeesData.filter(
    (employee) => employee.responseStatus === "Responded",
  );
  const participationRate = employeeEntries.length
    ? Math.round((respondedEmployees.length / employeeEntries.length) * 100)
    : 0;
  const stressValues = respondedEmployees
    .map((employee) => employee.stressScore)
    .filter((value) => value > 0);
  const averageStressValue = stressValues.length
    ? stressValues.reduce((sum, value) => sum + value, 0) / stressValues.length
    : 0;
  const departmentAverages = buildDepartmentStressBars(employeesData);
  const activeCampaign =
    campaigns.find((campaignEntry) => campaignEntry.status === "active") ?? campaigns[0];

  return {
    metrics: {
      participationRate,
      averageStress: averageStressValue.toFixed(1),
      responded: respondedEmployees.length,
      totalEmployees: employeeEntries.length,
      alertsDetected: departmentAverages.filter((item) => Number(item.average) >= 4).length,
    },
    trendByRange: buildTrendByRange(responses),
    departmentDistribution: buildDepartmentDistribution(employeeEntries),
    insights: buildInsights(activeCampaign, departmentAverages, participationRate),
  };
}

function buildResultsData(
  employeeEntries: BackendEmployee[],
  responses: BackendResponse[],
): ResultsData {
  const employeesData = employeeEntries.map(mapBackendEmployee);
  const respondedEmployees = employeesData.filter(
    (employee) => employee.responseStatus === "Responded",
  );
  const participationRate = employeeEntries.length
    ? Math.round((respondedEmployees.length / employeeEntries.length) * 100)
    : 0;
  const stressValues = respondedEmployees
    .map((employee) => employee.stressScore)
    .filter((value) => value > 0);
  const averageStressValue = stressValues.length
    ? stressValues.reduce((sum, value) => sum + value, 0) / stressValues.length
    : 0;
  const bars = buildDepartmentStressBars(employeesData);

  return {
    metrics: {
      participationRate,
      averageStress: averageStressValue.toFixed(1),
    },
    bars,
    analysis: buildAnalysis(bars, responses.length),
  };
}

function buildReportData(
  campaigns: BackendCampaign[],
  employeeEntries: BackendEmployee[],
  responses: BackendResponse[],
  reports: BackendReport[],
) {
  const activeCampaign =
    campaigns.find((campaignEntry) => campaignEntry.status === "active") ?? campaigns[0];
  const latestReport = [...reports]
    .filter((entry) =>
      activeCampaign ? entry.campaign?.id === activeCampaign.id : true,
    )
    .sort((left, right) => {
      const leftDate = Date.parse(left.created_at);
      const rightDate = Date.parse(right.created_at);

      if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) {
        return rightDate - leftDate;
      }

      return right.id - left.id;
    })[0];
  const resultsData = buildResultsData(employeeEntries, responses);
  const dashboardData = buildDashboardData(campaigns, employeeEntries, responses);
  const riskAreas = resultsData.bars
    .filter((item) => Number(item.average) >= 3.5)
    .map((item) => item.department)
    .slice(0, 3);

  return {
    title: activeCampaign
      ? `${activeCampaign.name}`
      : reports[0]
        ? `${reports[0].campaign.name}`
        : reportData.title,
    companyName: activeCampaign?.company?.name ?? reportData.companyName,
    participationRate: dashboardData.metrics.participationRate,
    averageStress: Number(resultsData.metrics.averageStress),
    alertCount: dashboardData.metrics.alertsDetected,
    riskAreas: riskAreas.length ? riskAreas : reportData.riskAreas,
    recommendations: buildRecommendations(riskAreas, dashboardData.metrics.participationRate),
    archivedReportPath: latestReport?.report_path ?? null,
  };
}

function buildDepartmentStressBars(employeesData: EmployeeRecord[]) {
  const departments = Array.from(
    new Set(employeesData.map((employee) => employee.department).filter(Boolean)),
  );

  return departments.map((department) => {
    const records = employeesData.filter(
      (employee) =>
        employee.department === department &&
        employee.responseStatus === "Responded" &&
        employee.stressScore > 0,
    );
    const average = records.length
      ? records.reduce((sum, employee) => sum + employee.stressScore, 0) / records.length
      : 0;

    return {
      department,
      value: Number((average * 20).toFixed(0)),
      average: average.toFixed(1),
    };
  });
}

function buildDepartmentDistribution(employeeEntries: BackendEmployee[]) {
  const palette = ["#F59E0B", "#FCD34D", "#D97706", "#92400E", "#B45309"];
  const totals = new Map<string, number>();

  for (const employee of employeeEntries) {
    const department = employee.department ?? "Non renseigne";
    totals.set(department, (totals.get(department) ?? 0) + 1);
  }

  const employeeCount = employeeEntries.length || 1;

  return Array.from(totals.entries()).map(([label, count], index) => ({
    label,
    value: Number(((count / employeeCount) * 100).toFixed(0)),
    color: palette[index % palette.length],
  }));
}

function buildTrendByRange(responses: BackendResponse[]) {
  const scaleResponses = responses.filter(
    (response) => normalizeQuestionType(response.question?.question_type) === "scale",
  );
  const monthly = buildAveragedSeries(scaleResponses, "month", 7);
  const weekly = buildAveragedSeries(scaleResponses, "week", 5);

  return {
    monthly: monthly.length ? monthly : trendByRange.monthly,
    weekly: weekly.length ? weekly : trendByRange.weekly,
  };
}

function buildAveragedSeries(
  responses: BackendResponse[],
  granularity: "month" | "week",
  slots: number,
) {
  const now = new Date();
  const labels: { key: string; label: string }[] = [];

  for (let index = slots - 1; index >= 0; index -= 1) {
    const date = new Date(now);

    if (granularity === "month") {
      date.setMonth(now.getMonth() - index);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      labels.push({
        key,
        label: date.toLocaleString("fr-FR", { month: "short" }),
      });
    } else {
      date.setDate(now.getDate() - index * 7);
      const weekStart = getWeekStart(date);
      const key = weekStart.toISOString().slice(0, 10);
      labels.push({
        key,
        label: `S${labels.length + 1}`,
      });
    }
  }

  return labels.map(({ key, label }) => {
    const values = responses
      .filter((response) => getBucketKey(new Date(response.created_at), granularity) === key)
      .map((response) => Number(response.answer))
      .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);

    const average = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;

    return {
      label,
      value: Number(average.toFixed(1)),
    };
  });
}

function getBucketKey(date: Date, granularity: "month" | "week") {
  if (granularity === "month") {
    return `${date.getFullYear()}-${date.getMonth()}`;
  }

  return getWeekStart(date).toISOString().slice(0, 10);
}

function getWeekStart(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + offset);
  result.setHours(0, 0, 0, 0);
  return result;
}

function buildInsights(
  currentCampaign: BackendCampaign | undefined,
  bars: { department: string; average: string }[],
  participationRate: number,
) {
  const mostExposed = [...bars]
    .sort((left, right) => Number(right.average) - Number(left.average))
    .slice(0, 2)
    .filter((item) => Number(item.average) > 0)
    .map((item) => item.department);

  const insights = [
    currentCampaign
      ? `Sondage actif: ${currentCampaign.name}.`
      : "Aucun sondage actif n'est remontee par l'API.",
    participationRate < 60
      ? "Le taux de participation reste faible et demande une relance ciblee."
      : "Le taux de participation permet une premiere lecture exploitable.",
  ];

  if (mostExposed.length) {
    insights.push(`Les departements les plus exposes sont ${mostExposed.join(" et ")}.`);
  }

  return insights;
}

function buildAnalysis(
  bars: { department: string; average: string }[],
  responseCount: number,
) {
  const ordered = [...bars].sort(
    (left, right) => Number(right.average) - Number(left.average),
  );
  const analysis = ordered
    .filter((item) => Number(item.average) > 0)
    .slice(0, 3)
    .map(
      (item) =>
        `${item.department}: stress moyen ${item.average}/5 sur les reponses consolidees.`,
    );

  if (!analysis.length) {
    analysis.push("Les donnees de reponse sont encore insuffisantes pour produire une analyse fine.");
  }

  if (responseCount > 0) {
    analysis.push(`${responseCount} reponses individuelles sont actuellement consolidees.`);
  }

  return analysis;
}

function buildRecommendations(riskAreas: string[], participationRate: number) {
  const recommendations = [
    participationRate < 70
      ? "Lancer une relance ciblee des collaborateurs n'ayant pas encore repondu."
      : "Maintenir un sondage de suivi reguliere pour conserver la dynamique de reponse.",
  ];

  if (riskAreas.length) {
    recommendations.push(
      `Prioriser un plan d'action manageriale sur ${riskAreas.join(", ")}.`,
    );
  }

  recommendations.push(
    "Documenter les signaux faibles remontes dans les questions ouvertes et suivre leur evolution.",
  );

  return recommendations;
}
