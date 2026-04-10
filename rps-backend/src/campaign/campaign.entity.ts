import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Company } from '../company/company.entity';
import { CampaignParticipant } from '../campaign-participant/campaign-participant.entity';
import { Question } from '../question/question.entity';
import { Report } from '../report/report.entity';

@Entity({ name: 'campaigns' })
export class Campaign {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Company, (company) => company.campaigns, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'date', nullable: true })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @Column({ type: 'varchar', default: 'active', nullable: true })
  status: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => Question, (question) => question.campaign)
  questions: Question[];

  @OneToMany(() => Report, (report) => report.campaign)
  reports: Report[];

  @OneToMany(() => CampaignParticipant, (participant) => participant.campaign)
  participants: CampaignParticipant[];
}
