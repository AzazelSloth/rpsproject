import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { ReportDocumentData } from "@/lib/repositories/rps-repository";
import { getExecutiveSummaryTitle } from "@/lib/reporting/headings";

export async function buildReportDocx(report: ReportDocumentData) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: report.title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${report.companyName} | Participation ${report.participationRate}% | Stress moyen ${report.averageStress}/5`,
                italics: true,
              }),
            ],
          }),
          spacer(),
          sectionTitle(getExecutiveSummaryTitle(report.template.executiveSummaryTitle)),
          bodyParagraph(report.template.executiveSummaryBody),
          bulletLine(`Taux de participation: ${report.participationRate}%`),
          bulletLine(`Stress moyen: ${report.averageStress}/5`),
          bulletLine(`Alertes detectees: ${report.alertCount}`),
          spacer(),
          sectionTitle(report.template.methodologyTitle),
          bodyParagraph(report.template.methodologyBody),
          spacer(),
          sectionTitle("Zones de risque"),
          ...report.riskAreas.map((item) => bulletLine(item)),
          spacer(),
          sectionTitle(report.template.recommendationsTitle),
          bodyParagraph(report.template.recommendationsIntro),
          ...report.recommendations.map((item) => bulletLine(item)),
          spacer(),
          sectionTitle(report.template.consultantNotesTitle),
          bodyParagraph(report.template.consultantNotesPlaceholder),
          emptyLine(),
          emptyLine(),
          emptyLine(),
          sectionTitle(report.template.conclusionTitle),
          bodyParagraph(report.template.conclusionBody),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function sectionTitle(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
  });
}

function bodyParagraph(text: string) {
  return new Paragraph({
    children: [new TextRun(text)],
  });
}

function bulletLine(text: string) {
  return new Paragraph({
    text,
    bullet: {
      level: 0,
    },
  });
}

function spacer() {
  return new Paragraph({ text: "" });
}

function emptyLine() {
  return new Paragraph({
    children: [new TextRun("____________________________________________")],
  });
}
