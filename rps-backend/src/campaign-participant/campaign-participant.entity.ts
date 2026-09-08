import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { Campaign } from '../campaign/campaign.entity';
import { Employee } from '../employee/employee.entity';

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
  completed_at!: Date | null;

  // Draft answers are only selected by the respondent's token routes.
  @Column({ type: 'jsonb', nullable: true, select: false })
  draft!: ParticipationDraft | null;

  @Column({ type: 'int', default: 0, select: false })
  draft_revision!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @BeforeInsert()
  ensureParticipationToken() {
    if (!this.participation_token) {
      this.participation_token = randomUUID();
    }
  }
}
