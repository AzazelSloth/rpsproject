import 'dotenv/config';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { User } from '../auth/user.entity';
import { CampaignParticipant } from '../campaign-participant/campaign-participant.entity';
import { Campaign } from '../campaign/campaign.entity';
import { Company } from '../company/company.entity';
import { Employee } from '../employee/employee.entity';
import { Question } from '../question/question.entity';
import { Report } from '../report/report.entity';
import { SurveyResponse } from '../response/response.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'rps_platform',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities: [
    User,
    Company,
    Campaign,
    Employee,
    Question,
    Report,
    SurveyResponse,
    CampaignParticipant,
  ],
  // Use runtime-relative path so TypeORM loads migrations once (src in ts-node, dist in node).
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
});

export default AppDataSource;
