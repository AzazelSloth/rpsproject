import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Campaign } from '../campaign/campaign.entity';
import { Employee } from '../employee/employee.entity';

export enum CampaignParticipantStatus {
  PENDING = 'pending',
  REMINDED = 'reminded',
  COMPLETED = 'completed',
}

@Entity({ name: 'campaign_participants' })
@Unique(['campaign', 'employee'])
export class CampaignParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Campaign, (campaign) => campaign.participants, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @ManyToOne(() => Employee, (employee) => employee.campaign_participations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ unique: true })
  participation_token: string;

  @Column({
    type: 'varchar',
    default: CampaignParticipantStatus.PENDING,
  })
  status: CampaignParticipantStatus;

  @Column({ type: 'timestamp', nullable: true })
  invitation_sent_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  reminder_sent_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
