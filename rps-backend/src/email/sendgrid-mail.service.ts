import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

export type SurveyInvitationEmailRecipient = {
  participant_id: number;
  employee_id: number;
  email: string;
  name: string;
  first_name?: string | null;
  survey_url: string;
  campaign_name: string;
  company_name: string;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
};

export type SendGridBatchResult = {
  sent: SurveyInvitationEmailRecipient[];
  failed: {
    recipient: SurveyInvitationEmailRecipient;
    error: string;
  }[];
};

const SURVEY_INVITATION_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sondage Bien-être au Travail</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background-color: #f8f9fa;
        }

        .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-collapse: collapse;
        }

        /* Header */
        .header {
            background: linear-gradient(135deg, #000000 0%, #000000 100%);
            padding: 40px 20px;
            text-align: center;
            color: #ffffff;
            border-bottom: 0px solid #000000;
        }

        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
        }

        .header p {
            font-size: 14px;
            opacity: 0.95;
            font-weight: 500;
        }

        /* Main Content */
        .container {
            padding: 40px 30px;
        }

        .greeting {
            font-size: 16px;
            margin-bottom: 24px;
            color: #000000;
        }

        .greeting strong {
            color: #000000;
        }

        /* Highlight Box */
        .highlight-box {
             background-color: #e8f4f0;
            border-left: 4px solid #2d9e7d;
            padding: 20px;
            margin: 28px 0;
            border-radius: 4px;
        }

        .highlight-box h2 {
            font-size: 16px;
            color: #000000;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .highlight-box p {
            font-size: 14px;
            color: #2c3e50;
            line-height: 1.7;
        }

        /* Info Grid */
        .info-grid {
            display: table;
            width: 100%;
            margin: 32px 0;
            border-spacing: 0;
        }

        .info-item {
            display: table-cell;
            padding: 16px;
            text-align: center;
            border: 1px solid #000000;
            background-color: #ffffff;
        }

        .info-item:nth-child(2n) {
            background-color: #F0F0F0;
        }

        .info-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #000000;
            font-weight: 700;
            margin-bottom: 8px;
            display: block;
        }

        .info-value {
            font-size: 16px;
            font-weight: 700;
            color: #00000;
        }

        /* Important Info Section */
        .important-info {

                    background-color: #FADADD;
            border: 2px solid #E50914;
            padding: 20px;
            margin: 28px 0;
            border-radius: 4px;

           /* background-color: #f0ebe5;
            border: 2px solid #d4c4b0;
            padding: 20px;
            margin: 28px 0;
            border-radius: 4px;*/
        }

        .important-info h3 {

        font-size: 16px;

            margin-bottom: 10px;

            font-size: 16px;
            color: #E50914;
            font-weight: 700;
            display: flex;
            align-items: center;
        }

        /*.important-info h3::before {
            content: "⭐";
            margin-right: 8px;
            font-size: 16px;
        }*/

        .important-info ul {
            list-style: none;
            padding-left: 0;
        }

        .important-info li {
            font-size: 13px;
            color: #2c3e50;
            margin-bottom: 8px;
            padding-left: 24px;
            position: relative;
        }

        .important-info li::before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #28a745;
            font-weight: bold;
        }

        /* CTA Button */
        .cta-section {
            text-align: center;
            margin: 36px 0;
            padding: 20px 0;
            /*background-color: #f5f2ee;*/
            border-radius: 4px;
        }

        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #E50914 0%, #E50914 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 16px 48px;
            border-radius: 30px;
            font-weight: 700;
            font-size: 16px;
            transition: all 0.3s ease;
            border: 2px solid #E50914;
            cursor: pointer;
            margin-bottom: 12px;
            display: inline-block;
        }

        .cta-button:hover {
            background: linear-gradient(135deg, #E50914 0%, #E50914 100%);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(107, 91, 79, 0.3);
        }

        .cta-button-secondary {
            display: inline-block;
            background-color: #ffffff;
            color: #8a7a70;
            text-decoration: none;
            padding: 12px 32px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 14px;
            border: 2px solid #8a7a70;
            transition: all 0.3s ease;
            margin-top: 8px;
            margin-left: 8px;
        }

        .cta-button-secondary:hover {
            background-color: #f5f2ee;
        }

        .cta-link-text {
            font-size: 12px;
            color: #7f8c8d;
            margin-top: 12px;
            word-break: break-all;
        }

        /* Body Text */
        .body-text {
            font-size: 14px;
            line-height: 1.8;
            color: #2c3e50;
            margin: 20px 0;
        }

        .emphasis {
            color: #000000;
            font-weight: 700;
        }

        /* Timeline */
        .timeline {
            margin: 28px 0;
            padding: 20px;
            background-color: #f5f2ee;
            border-radius: 4px;
        }

        .timeline-item {
            display: flex;
            margin-bottom: 16px;
            align-items: flex-start;
        }

        .timeline-item:last-child {
            margin-bottom: 0;
        }

        .timeline-marker {
            background-color: #000000;
            color: #ffffff;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            margin-right: 16px;
            flex-shrink: 0;
            font-size: 14px;
        }

        .timeline-content {
            padding-top: 4px;
        }

        .timeline-content h4 {
            font-size: 13px;
            font-weight: 700;
            color: #000000;
            margin-bottom: 4px;
        }

        .timeline-content p {
            font-size: 13px;
            color: #2c3e50;
        }

        /* Footer */
        .footer {
            background-color: #000000;
            color: #f5f2ee;
            padding: 30px;
            text-align: center;
            font-size: 12px;
            border-top: 0px solid #fff3cd;
        }

        .footer p {
            margin: 8px 0;
        }

        .footer a {
            color: #a8d5a8;
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        .footer-divider {
            height: 1px;
            background-color: #8a7a70;
            margin: 16px 0;
        }

        /* Responsive */
        @media only screen and (max-width: 600px) {
            .header {
                padding: 30px 15px;
            }

            .header h1 {
                font-size: 22px;
            }

            .container {
                padding: 25px 20px;
            }

            .info-item {
                display: block;
                width: 100%;
                padding: 12px;
                margin-bottom: 8px;
            }

            .cta-button, .cta-button-secondary {
                display: block;
                width: 100%;
                margin: 8px 0;
                padding: 14px 20px;
            }

            .body-text {
                font-size: 13px;
            }

            .highlight-box {
                padding: 16px;
                margin: 20px 0;
            }

            .important-info {
                padding: 16px;
            }
        }

        /* Utility Classes */
        .text-center {
            text-align: center;
        }

        .mt-20 {
            margin-top: 20px;
        }

        .mb-20 {
            margin-bottom: 20px;
        }

        .text-muted {
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <table class="email-wrapper" cellpadding="0" cellspacing="0">
        <!-- Header -->
        <tr>
            <td>
                <div class="header">
                    <h1>Votre avis compte</h1>
                    <p>Participez à notre sondage sur le bien-être au travail</p>
                </div>
            </td>
        </tr>

        <!-- Main Content -->
        <tr>
            <td>
                <div class="container">
                    <!-- Greeting -->
                    <div class="greeting">
                        Bonjour <strong>{{firstName}}</strong>,
                    </div>

                    <!-- Introduction -->
                    <div class="body-text">
                        Nous avons le plaisir de vous inviter à participer à un <span class="emphasis">sondage important</span> qui nous aidera à mieux comprendre votre expérience et à créer un environnement de travail plus positif et sain.
                    </div>

                    <!-- Highlight Box - Loi 27 -->
                    <div class="highlight-box">
                        <h2>Conformité Loi 27 du Québec</h2>
                        <p>
                            Ce sondage s'inscrit dans notre <span class="emphasis">engagement légal et éthique</span> à respecter les normes de santé psychologique et de sécurité du travail établies par la Loi 27. Vos commentaires contribueront directement à l'amélioration de vos conditions de travail.
                        </p>
                    </div>

                    <!-- Important Info -->
                    <div class="important-info">
                        <h3>Informations essentielles</h3>
                        <ul>
                            <li><strong>Durée :</strong> Environ 10-15 minutes</li>
                            <li><strong>Confidentialité :</strong> Vos réponses sont 100% anonymes et sécurisées</li>
                            <li><strong>Impact :</strong> Vos commentaires seront utilisés pour améliorer nos politiques et pratiques</li>
                            <li><strong>Accès :</strong> Lien personnalisé et sécurisé ci-dessous</li>
                        </ul>
                    </div>

                    <!-- Timeline / Info Grid -->
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">📅 Début</span>
                            <div class="info-value">{{startDate}}</div>
                        </div>
                        <div class="info-item">
                            <span class="info-label">⏰ Fin</span>
                            <div class="info-value">{{endDate}}</div>
                        </div>
                        <div class="info-item">
                            <span class="info-label">⏱️ Durée</span>
                            <div class="info-value">10-15 min</div>
                        </div>
                    </div>

                    <!-- CTA Section -->
                    <div class="cta-section">
                        <div>
                            <a href="{{surveyLink}}" class="cta-button">Accédez au sondage</a>
                        </div>
                        <div>
                            <p class="cta-link-text">Ou copiez ce lien : <strong>{{surveyLink}}</strong></p>
                        </div>
                    </div>

                    <!-- Body Text -->
                    <div class="body-text">
                        <strong>Pourquoi votre participation est importante ?</strong><br><br>
                        En répondant à ce sondage, vous :
                    </div>

                    <div class="timeline">
                        <div class="timeline-item">
                            <div class="timeline-marker">1</div>
                            <div class="timeline-content">
                                <h4>Aidez à identifier les défis</h4>
                                <p>Nous comprendrons mieux les enjeux qui affectent votre bien-être</p>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-marker">2</div>
                            <div class="timeline-content">
                                <h4>Contribuez aux solutions</h4>
                                <p>Vos idées alimentent directement vos initiatives d'amélioration</p>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-marker">3</div>
                            <div class="timeline-content">
                                <h4>Renforcez notre culture</h4>
                                <p>Ensemble, nous créons un milieu de travail plus inclusif et bienveillant</p>
                            </div>
                        </div>
                    </div>

                    <!-- Final CTA -->
                    <div class="cta-section">
                        <a href="{{surveyLink}}" class="cta-button">Répondez maintenant</a><br>
                     <!--   <a href="mailto:{{contactEmail}}" class="cta-button-secondary">Des questions ?</a> -->
                    </div>

                    <!-- Closing -->
                    <div class="body-text mt-20">
                        <p>
                            Merci de votre précieuse collaboration. Votre voix est entendue et valorisée.
                        </p>
                        <p style="margin-top: 24px; font-size: 13px; color: #7f8c8d;">
                            Si vous avez des questions ou des préoccupations concernant ce sondage, n'hésitez pas à nous contacter à <a href="mailto:{{contactEmail}}" style="color: #0066cc;">{{contactEmail}}</a>.
                        </p>
                    </div>
                </div>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td>
                <div class="footer">


                    <p>
                        Ce courriel contient des informations confidentielles destinées au seul usage de la personne à qui il est adressé.
                    </p>

                </div>
            </td>
        </tr>
    </table>
</body>
</html>`;

@Injectable()
export class SendGridMailService {
  private readonly logger = new Logger(SendGridMailService.name);
  private readonly sendGridUrl = 'https://api.sendgrid.com/v3/mail/send';

  async sendSurveyInvitations(
    recipients: SurveyInvitationEmailRecipient[],
  ): Promise<SendGridBatchResult> {
    const apiKey = this.getRequiredEnv('SENDGRID_API_KEY');
    const fromEmail = this.getRequiredEnv('SENDGRID_FROM_EMAIL');
    const fromName = this.getRequiredEnv('SENDGRID_FROM_NAME');
    const replyTo = process.env.SENDGRID_REPLY_TO?.trim() || fromEmail;

    const result: SendGridBatchResult = {
      sent: [],
      failed: [],
    };

    for (const recipient of recipients) {
      try {
        await this.sendSurveyInvitation({
          apiKey,
          fromEmail,
          fromName,
          replyTo,
          recipient,
        });
        result.sent.push(recipient);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erreur inconnue lors de l'envoi SendGrid";

        this.logger.error(
          `SendGrid invitation failed for ${recipient.email}: ${message}`,
        );
        result.failed.push({ recipient, error: message });
      }
    }

    return result;
  }

  private async sendSurveyInvitation(params: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
    replyTo: string;
    recipient: SurveyInvitationEmailRecipient;
  }) {
    const { apiKey, fromEmail, fromName, replyTo, recipient } = params;
    const subject = `Sondage RPS - ${recipient.campaign_name}`;
    const text = this.buildInvitationText(recipient, replyTo, fromName);
    const html = this.buildInvitationHtml(recipient, replyTo);

    const response = await fetch(this.sendGridUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: recipient.email, name: recipient.name }],
          },
        ],
        from: { email: fromEmail, name: fromName },
        reply_to: { email: replyTo },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new InternalServerErrorException(
        `SendGrid a refuse l'email (${response.status})${
          body ? `: ${body.slice(0, 500)}` : ''
        }`,
      );
    }
  }

  private buildInvitationText(
    recipient: SurveyInvitationEmailRecipient,
    contactEmail: string,
    fromName: string,
  ) {
    const firstName = this.getFirstName(recipient);
    const startDate = this.formatEmailDate(recipient.start_date);
    const endDate = this.formatEmailDate(recipient.end_date);

    return [
      `Bonjour ${firstName},`,
      '',
      'Nous avons le plaisir de vous inviter a participer a un sondage important sur le bien-etre au travail.',
      '',
      `Debut : ${startDate}`,
      `Fin : ${endDate}`,
      `Lien personnalise : ${recipient.survey_url}`,
      '',
      'Merci de votre precieuse collaboration. Votre voix est entendue et valorisee.',
      `Contact : ${contactEmail}`,
      '',
      fromName,
    ].join('\n');
  }

  private buildInvitationHtml(
    recipient: SurveyInvitationEmailRecipient,
    contactEmail: string,
  ) {
    return this.renderTemplate(SURVEY_INVITATION_HTML_TEMPLATE, {
      firstName: this.getFirstName(recipient),
      startDate: this.formatEmailDate(recipient.start_date),
      endDate: this.formatEmailDate(recipient.end_date),
      surveyLink: recipient.survey_url,
      contactEmail,
    });
  }

  private renderTemplate(template: string, values: Record<string, string>) {
    return Object.entries(values).reduce((html, [key, value]) => {
      return html.replaceAll(`{{${key}}}`, this.escapeHtml(value));
    }, template);
  }

  private getFirstName(recipient: SurveyInvitationEmailRecipient) {
    const firstName = recipient.first_name?.trim();

    if (firstName) {
      return firstName;
    }

    return recipient.name.split(/\s+/)[0] || recipient.email;
  }

  private formatEmailDate(value?: Date | string | null) {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

      if (dateOnly) {
        return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
      }
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getRequiredEnv(name: string) {
    const value = process.env[name]?.trim();

    if (!value) {
      throw new ServiceUnavailableException(
        `Configuration email manquante: ${name}`,
      );
    }

    return value;
  }
}
