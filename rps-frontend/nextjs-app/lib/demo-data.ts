import {
  mapStrapiAnalyticsSnapshot,
  mapStrapiCampaign,
  mapStrapiEmployee,
  mapStrapiInsight,
  mapStrapiReport,
  mapStrapiReportTemplate,
  type EmployeeRecord,
  type EmployeeStatus,
  type SurveyQuestion,
} from "@/lib/strapi/mappers";
import type {
  StrapiAnalyticsSnapshot,
  StrapiCampaign,
  StrapiCompany,
  StrapiEmployee,
  StrapiInsight,
  StrapiReport,
  StrapiReportTemplate,
} from "@/lib/strapi/types";

export type { EmployeeRecord, EmployeeStatus, SurveyQuestion };

export const demoSurveyAccessToken = "demo-participant-token";
export type DemoScenario = "baseline" | "tension" | "critical";
export const demoScenarios: DemoScenario[] = ["baseline", "tension", "critical"];

const referenceDate = new Date("2026-03-23T09:00:00.000Z");
const now = referenceDate.toISOString();

function meta(id: number, documentId: string) {
  return {
    id,
    documentId,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  };
}

const companyEntry: StrapiCompany = {
  ...meta(1, "company-laroche"),
  name: "Laroche Groupe",
  slug: "laroche-groupe",
};

const campaignStartDate = new Date(
  Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
);
const campaignEndDate = new Date(
  Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 0),
);

const employeeProfiles = [
  ["Sarah Mendy", "IT", 4.4],
  ["Paul Andrian", "Finance", 2.6],
  ["Nina Rakoto", "RH", 2.9],
  ["Jean Albert", "Production", 3.7],
  ["Aina Noel", "IT", 4.1],
  ["Mika Rana", "Production", 3.5],
  ["Julie Dupond", "Finance", 3.1],
  ["Marc Bernard", "IT", 4.6],
  ["Claire Rivelo", "RH", 2.7],
  ["Thomas Rajaon", "Production", 3.9],
  ["Lucie Morel", "Support", 3.3],
  ["David Rahar", "IT", 4.2],
] as const;

const demoScenarioConfigs: Record<
  DemoScenario,
  {
    label: string;
    stressDelta: number;
    pendingIndexes: number[];
    monthlyStep: number;
    weeklyStep: number;
  }
> = {
  baseline: {
    label: "Equilibre fragile",
    stressDelta: 0,
    pendingIndexes: [1, 3, 8],
    monthlyStep: 0.12,
    weeklyStep: 0.08,
  },
  tension: {
    label: "Tension operationnelle",
    stressDelta: 0.45,
    pendingIndexes: [1, 3, 5, 7, 9],
    monthlyStep: 0.18,
    weeklyStep: 0.12,
  },
  critical: {
    label: "Alerte critique",
    stressDelta: 0.85,
    pendingIndexes: [1, 2, 3, 5, 7, 8, 10],
    monthlyStep: 0.24,
    weeklyStep: 0.16,
  },
};

const generatedEmployees = employeeProfiles.map(([fullName, department, baseStress], index) => {
  const slug = slugify(fullName);
  const responseStatus = index % 4 === 1 ? "pending" : "responded";
  const stressScore = Number(
    Math.min(4.9, Math.max(2.2, baseStress + ((index % 3) - 1) * 0.15)).toFixed(1),
  );

  return {
    ...meta(index + 1, `employee-${slug}`),
    fullName,
    email: `${slug}@laroche.fr`,
    department,
    responseStatus,
    stressScore,
    company: companyEntry,
  } satisfies StrapiEmployee;
});

const participationRate = Math.round(
  (generatedEmployees.filter((employee) => employee.responseStatus === "responded").length /
    generatedEmployees.length) *
    100,
);

const respondedStressScores = generatedEmployees
  .filter((employee) => employee.responseStatus === "responded")
  .map((employee) => employee.stressScore);

const averageStress = Number(
  (
    respondedStressScores.reduce((sum, current) => sum + current, 0) /
    respondedStressScores.length
  ).toFixed(1),
);

const employeesByDepartment = Array.from(
  generatedEmployees.reduce((map, employee) => {
    const records = map.get(employee.department) ?? [];
    records.push(employee);
    map.set(employee.department, records);
    return map;
  }, new Map<string, StrapiEmployee[]>()),
);

const rankedDepartments = employeesByDepartment
  .map(([department, records]) => {
    const average =
      records.reduce((sum, employee) => sum + employee.stressScore, 0) / records.length;

    return {
      department,
      average: Number(average.toFixed(1)),
      count: records.length,
    };
  })
  .sort((left, right) => right.average - left.average);

const topRiskDepartments = rankedDepartments.slice(0, 3).map((item) => item.department);

const dynamicNotifications = [
  `${topRiskDepartments[0]} reste le departement le plus expose`,
  `${generatedEmployees.filter((employee) => employee.responseStatus === "pending").length} salaries restent a relancer`,
  `Rapport ${monthLabel(referenceDate)} ${referenceDate.getUTCFullYear()} pret a exporter`,
];

const dynamicMonthlyTrend = buildTrendSeries(7, averageStress - 0.4, 0.12, [
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Fev",
  "Mar",
  "Apr",
]);

const dynamicWeeklyTrend = buildTrendSeries(5, averageStress - 0.2, 0.08, [
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
]);

const dynamicDepartmentDistribution = rankedDepartments.map((item, index) => ({
  label: item.department,
  value: Math.round((item.count / generatedEmployees.length) * 100),
  color: ["#F59E0B", "#FCD34D", "#D97706", "#92400E", "#B45309"][index % 5],
}));

const dynamicInsights = [
  {
    ...meta(30, "insight-dashboard-top-risk"),
    title: `Stress eleve dans le departement ${topRiskDepartments[0]}.`,
    category: "dashboard",
    severity: "high",
  },
  {
    ...meta(31, "insight-dashboard-participation"),
    title:
      participationRate < 75
        ? "La participation demande une relance ciblee des populations non repondantes."
        : "La participation permet une lecture fiable des premiers signaux.",
    category: "dashboard",
    severity: participationRate < 75 ? "high" : "medium",
  },
  {
    ...meta(32, "insight-dashboard-workload"),
    title: `La charge percue monte dans ${topRiskDepartments.slice(0, 2).join(" et ")}.`,
    category: "dashboard",
    severity: "medium",
  },
  {
    ...meta(33, "analysis-top-risk"),
    title: `${topRiskDepartments[0]} concentre les scores de stress les plus eleves.`,
    category: "analysis",
    severity: "high",
  },
  {
    ...meta(34, "analysis-managerial-load"),
    title: "Les equipes a forte intensite operationnelle demandent un reequilibrage de charge.",
    category: "analysis",
    severity: "high",
  },
  {
    ...meta(35, "analysis-communication"),
    title: "Les retours qualitatifs suggèrent de clarifier priorites, arbitrages et points de charge.",
    category: "analysis",
    severity: "medium",
  },
] satisfies StrapiInsight[];

export const navItems = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/surveys?tab=list", label: "Liste des sondages" },
  { href: "/surveys?tab=create", label: "Creer un sondage" },
  { href: "/surveys?tab=edit", label: "Modifier un sondage" },
  { href: "/employees", label: "Gestion des employes" },
  { href: "/results", label: "Resultats" },
];

export const notifications = dynamicNotifications;

export const campaignsResponse: { data: StrapiCampaign[] } = {
  data: [
    {
      ...meta(10, "campaign-rps-march-2026"),
      title: "Evaluation RPS Mars 2026",
      description:
        "Sondage trimestriel visant a mesurer le stress, la charge de travail et la qualite de l'environnement professionnel.",
      status: "active",
      startDate: campaignStartDate.toISOString().slice(0, 10),
      endDate: campaignEndDate.toISOString().slice(0, 10),
      company: companyEntry,
      questions: [
        {
          ...meta(100, "question-stress"),
          title: "Comment evaluez-vous votre niveau de stress actuel ?",
          type: "scale",
          helpText: "1 = tres faible, 5 = tres eleve",
          orderIndex: 1,
        },
        {
          ...meta(101, "question-workload"),
          title: "Votre charge de travail est-elle adaptee a vos moyens actuels ?",
          type: "choice",
          helpText: "Choisissez la reponse qui decrit le mieux votre situation.",
          orderIndex: 2,
          options: [
            { label: "Oui", value: "yes" },
            { label: "Partiellement", value: "partial" },
            { label: "Non", value: "no" },
          ],
        },
        {
          ...meta(102, "question-comment"),
          title: "Quels changements pourraient ameliorer votre environnement de travail ?",
          type: "text",
          helpText: "Votre reponse sera analysee avec le reste du sondage.",
          orderIndex: 3,
        },
      ],
    },
  ],
};

export const employeesResponse: { data: StrapiEmployee[] } = {
  data: generatedEmployees,
};

export const analyticsResponse: { data: StrapiAnalyticsSnapshot } = {
  data: {
    ...meta(20, "analytics-march-2026"),
    name: `Dashboard ${monthLabel(referenceDate)} ${referenceDate.getUTCFullYear()}`,
    participationRate,
    averageStress,
    alertsDetected: rankedDepartments.filter((item) => item.average >= 4).length,
    employeesResponded: generatedEmployees.filter((employee) => employee.responseStatus === "responded")
      .length,
    totalEmployees: generatedEmployees.length,
    trendMonthly: dynamicMonthlyTrend,
    trendWeekly: dynamicWeeklyTrend,
    departmentDistribution: dynamicDepartmentDistribution,
  },
};

export const insightsResponse: { data: StrapiInsight[] } = {
  data: dynamicInsights,
};

export const reportResponse: { data: StrapiReport } = {
  data: {
    ...meta(40, "report-march-2026"),
    title: `Rapport RPS - ${monthLabel(referenceDate)} ${referenceDate.getUTCFullYear()}`,
    companyName: companyEntry.name,
    participationRate,
    averageStress,
    alertCount: rankedDepartments.filter((item) => item.average >= 4).length,
    riskAreas: [...topRiskDepartments, "Management intermediaire"].slice(0, 3),
    recommendations: [
      `Reequilibrer la charge de travail dans ${topRiskDepartments[0]}.`,
      `Mettre un point de pilotage hebdomadaire entre RH et managers de ${topRiskDepartments[1] ?? topRiskDepartments[0]}.`,
      "Former les managers a la detection des signaux faibles de surcharge et de desorganisation.",
    ],
  },
};

export const reportTemplateResponse: { data: StrapiReportTemplate } = {
  data: {
    ...meta(41, "report-template-default"),
    templateName: "Modele consultant standard",
    executiveSummaryTitle: "Synthese executive",
    executiveSummaryBody:
      "Cette synthese presente les principaux indicateurs du sondage et les tensions prioritaires a adresser dans les equipes les plus exposees.",
    methodologyTitle: "Methodologie",
    methodologyBody:
      "Les resultats s'appuient sur les reponses collectees pendant le sondage actif, consolidees par departement puis interpretees au regard des dimensions RPS suivies.",
    recommendationsTitle: "Recommandations",
    recommendationsIntro:
      "Les pistes ci-dessous constituent une base de travail pour les consultants avant restitution finale au client.",
    consultantNotesTitle: "Notes consultant",
    consultantNotesPlaceholder:
      "Ajouter ici les observations qualitatives, nuances de terrain et recommandations adaptees au contexte du client.",
    conclusionTitle: "Conclusion",
    conclusionBody:
      "Le rapport doit etre relu puis enrichi par le consultant avant diffusion aux parties prenantes de l'entreprise.",
  },
};

export const campaign = mapStrapiCampaign(campaignsResponse.data[0]);
export const surveyQuestions: SurveyQuestion[] = campaign.questions;
export const employees: EmployeeRecord[] = employeesResponse.data.map(mapStrapiEmployee);

const analytics = mapStrapiAnalyticsSnapshot(analyticsResponse.data);

export const trendByRange = analytics.trendByRange;
export const departmentDistribution = analytics.departmentDistribution;
export const aiInsights = insightsResponse.data
  .filter((item) => item.category === "dashboard")
  .map(mapStrapiInsight);
export const aiAnalysis = insightsResponse.data
  .filter((item) => item.category === "analysis")
  .map(mapStrapiInsight);
export const reportData = mapStrapiReport(reportResponse.data);
export const reportTemplateData = mapStrapiReportTemplate(reportTemplateResponse.data);

export function getDashboardMetrics() {
  return {
    participationRate: analytics.participationRate,
    averageStress: analytics.averageStress,
    responded: analytics.responded,
    totalEmployees: analytics.totalEmployees,
    alertsDetected: analytics.alertsDetected,
  };
}

export function getStressByDepartment() {
  const departments = Array.from(new Set(employees.map((employee) => employee.department)));

  return departments.map((department) => {
    const records = employees.filter((employee) => employee.department === department);
    const average =
      records.reduce((sum, employee) => sum + employee.stressScore, 0) / records.length;

    return {
      department,
      value: Number((average * 20).toFixed(0)),
      average: average.toFixed(1),
    };
  });
}

export function resolveDemoScenario(input?: string | null): DemoScenario {
  if (input && demoScenarios.includes(input as DemoScenario)) {
    return input as DemoScenario;
  }

  return "baseline";
}

export function getDemoDataset(input?: string | null) {
  const scenario = resolveDemoScenario(input);
  const config = demoScenarioConfigs[scenario];
  const scenarioEmployees = employeeProfiles.map(([fullName, department, baseStress], index) => {
    const slug = slugify(fullName);
    const responseStatus = config.pendingIndexes.includes(index) ? "pending" : "responded";
    const stressScore = Number(
      Math.min(4.9, Math.max(2.2, baseStress + config.stressDelta + ((index % 3) - 1) * 0.15)).toFixed(1),
    );

    return {
      ...meta(index + 1, `employee-${slug}`),
      fullName,
      email: `${slug}@laroche.fr`,
      department,
      responseStatus,
      stressScore,
      company: companyEntry,
    } satisfies StrapiEmployee;
  });

  const mappedEmployees = scenarioEmployees.map(mapStrapiEmployee);
  const answeredCount = scenarioEmployees.filter((employee) => employee.responseStatus === "responded").length;
  const participationRate = Math.round((answeredCount / scenarioEmployees.length) * 100);
  const respondedStressScores = scenarioEmployees
    .filter((employee) => employee.responseStatus === "responded")
    .map((employee) => employee.stressScore);
  const averageStress = Number(
    (
      respondedStressScores.reduce((sum, current) => sum + current, 0) /
      Math.max(1, respondedStressScores.length)
    ).toFixed(1),
  );
  const employeesByDepartment = Array.from(
    scenarioEmployees.reduce((map, employee) => {
      const records = map.get(employee.department) ?? [];
      records.push(employee);
      map.set(employee.department, records);
      return map;
    }, new Map<string, StrapiEmployee[]>()),
  );
  const rankedDepartments = employeesByDepartment
    .map(([department, records]) => {
      const average =
        records.reduce((sum, employee) => sum + employee.stressScore, 0) / records.length;

      return {
        department,
        average: Number(average.toFixed(1)),
        count: records.length,
      };
    })
    .sort((left, right) => right.average - left.average);
  const topRiskDepartments = rankedDepartments.slice(0, 3).map((item) => item.department);
  const analyticsData = mapStrapiAnalyticsSnapshot({
    ...meta(20, `analytics-${scenario}`),
    name: `${config.label} ${monthLabel(referenceDate)} ${referenceDate.getUTCFullYear()}`,
    participationRate,
    averageStress,
    alertsDetected: rankedDepartments.filter((item) => item.average >= 4).length,
    employeesResponded: answeredCount,
    totalEmployees: scenarioEmployees.length,
    trendMonthly: buildTrendSeries(7, averageStress - 0.4, config.monthlyStep, [
      "Oct",
      "Nov",
      "Dec",
      "Jan",
      "Fev",
      "Mar",
      "Apr",
    ]),
    trendWeekly: buildTrendSeries(5, averageStress - 0.2, config.weeklyStep, [
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
    ]),
    departmentDistribution: rankedDepartments.map((item, index) => ({
      label: item.department,
      value: Math.round((item.count / scenarioEmployees.length) * 100),
      color: ["#F59E0B", "#FCD34D", "#D97706", "#92400E", "#B45309"][index % 5],
    })),
  });
  const mappedCampaign = mapStrapiCampaign(campaignsResponse.data[0]);
  const aiInsights = [
    `Scenario: ${config.label}.`,
    `Stress eleve dans ${topRiskDepartments[0]}.`,
    participationRate < 70
      ? "La participation est insuffisante et demande un plan de relance."
      : "La participation permet une lecture deja exploitable.",
  ];
  const aiAnalysis = [
    `${topRiskDepartments[0]} concentre les scores les plus eleves.`,
    `${topRiskDepartments[1] ?? topRiskDepartments[0]} demande un arbitrage charge/ressources.`,
    "Les verbatims suggerent de clarifier les priorites et le pilotage manageriale.",
  ];
  const report = {
    title: `Rapport RPS - ${config.label}`,
    companyName: companyEntry.name,
    participationRate,
    averageStress,
    alertCount: rankedDepartments.filter((item) => item.average >= 4).length,
    riskAreas: [...topRiskDepartments],
    recommendations: [
      `Prioriser un plan d'action sur ${topRiskDepartments[0]}.`,
      "Mettre un rituel de pilotage hebdomadaire entre RH et managers.",
      "Ajouter une relecture consultant avant restitution au client.",
    ],
  };

  return {
    scenario,
    scenarioLabel: config.label,
    navItems,
    notifications: [
      `${topRiskDepartments[0]} reste le departement le plus expose`,
      `${scenarioEmployees.length - answeredCount} salaries restent a relancer`,
      `Rapport ${config.label} pret a exporter`,
    ],
    campaign: mappedCampaign,
    surveyQuestions: mappedCampaign.questions,
    employees: mappedEmployees,
    dashboardMetrics: {
      participationRate: analyticsData.participationRate,
      averageStress: analyticsData.averageStress,
      responded: analyticsData.responded,
      totalEmployees: analyticsData.totalEmployees,
      alertsDetected: analyticsData.alertsDetected,
    },
    trendByRange: analyticsData.trendByRange,
    departmentDistribution: analyticsData.departmentDistribution,
    aiInsights,
    aiAnalysis,
    reportData: report,
    stressByDepartment: Array.from(new Set(mappedEmployees.map((employee) => employee.department))).map(
      (department) => {
        const records = mappedEmployees.filter((employee) => employee.department === department);
        const average =
          records.reduce((sum, employee) => sum + employee.stressScore, 0) / records.length;

        return {
          department,
          value: Number((average * 20).toFixed(0)),
          average: average.toFixed(1),
        };
      },
    ),
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function monthLabel(date: Date) {
  return date.toLocaleString("fr-FR", {
    month: "long",
    timeZone: "UTC",
  }).replace(/^./, (character) => character.toUpperCase());
}

function buildTrendSeries(
  count: number,
  startValue: number,
  step: number,
  labels: string[],
) {
  return Array.from({ length: count }, (_, index) => ({
    label: labels[index] ?? `P${index + 1}`,
    value: Number((startValue + step * index).toFixed(1)),
  }));
}
