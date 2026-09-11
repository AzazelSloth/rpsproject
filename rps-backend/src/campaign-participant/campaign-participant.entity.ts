import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { Exclude } from 'class-transformer';
import { Campaign } from '../campaign/campaign.entity';
import { Employee } from '../employee/employee.entity';
import { SurveySubmissionItem } from './survey-submission-item.entity';

export enum CampaignParticipantStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  REMINDED = 'reminded',
  COMPLETED = 'completed',
}

export type ParticipationDraft = {
  responses: Array<{
    question_id: number;
    answer: string | null;
    response_state: 'answered' | 'declined';
  }>;
  current_section: number;
  started: boolean;
};

export type QuestionnaireSnapshotSection = {
  id: number;
  title: string;
  description: string | null;
  order_index: number;
  is_visible: boolean;
  created_at?: string;
};

export type QuestionnaireSnapshotQuestion = {
  id: number;
  question_text: string | null;
  question_type: string | null;
  rps_dimension: string | null;
  order_index: number;
  choice_options: string[] | null;
  created_at?: string;
  section: QuestionnaireSnapshotSection | null;
};

export type QuestionnaireSnapshot = {
  version: 1;
  captured_at: string;
  sections: QuestionnaireSnapshotSection[];
  questions: QuestionnaireSnapshotQuestion[];
};

@Entity({ name: 'campaign_participants' })
@Unique(['campaign', 'employee'])
export class CampaignParticipant {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Campaign, (campaign) => campaign.participants, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign!: Campaign;

  @ManyToOne(() => Employee, (employee) => employee.campaign_participations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({ type: 'varchar', unique: true, nullable: true })
  participation_token!: string;

  @Column({
    type: 'varchar',
    default: CampaignParticipantStatus.PENDING,
  })
  status!: CampaignParticipantStatus;

  @Column({ type: 'timestamp', nullable: true })
  invitation_sent_at!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  reminder_sent_at!: Date | null;

  @Column({ type: 'int', default: 0 })
  reminder_count!: number;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  completed_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  @Exclude()
  timing_started_at!: Date | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb", select: false })
  @Exclude()
  timing_intervals!: Array<{ start: number; end: number }>;

  // Draft answers are only selected by the respondent's token routes.
  @Column({ type: 'jsonb', nullable: true, select: false })
  draft!: ParticipationDraft | null;

  @Column({ type: 'int', default: 0, select: false })
  draft_revision!: number;

  // Captured once for unfinished participations and never rewritten afterwards.
  @Column({ type: 'jsonb', nullable: true, select: false })
  @Exclude()
  questionnaire_snapshot!: QuestionnaireSnapshot | null;

  @OneToMany(() => SurveySubmissionItem, (item) => item.participation)
  submission_items!: SurveySubmissionItem[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @BeforeInsert()
  ensureParticipationToken() {
    if (!this.participation_token) {
      this.participation_token = randomUUID();
    }
  }
}
