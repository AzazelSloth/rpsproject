import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Campaign } from '../campaign/campaign.entity';

@Entity({ name: 'reports' })
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Campaign, (campaign) => campaign.reports, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column('text')
  report_path: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
