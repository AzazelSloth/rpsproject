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
import { SurveyResponse } from '../response/response.entity';

@Entity({ name: 'employees' })
export class Employee {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Company, (company) => company.employees, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'varchar', nullable: true })
  first_name!: string | null;

  @Column({ type: 'varchar', nullable: true })
  last_name!: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', nullable: true })
  status!: string | null;

  @Column({ type: 'varchar', nullable: true })
  company_name!: string | null;

  @Column({ type: 'varchar', nullable: true })
  department!: string | null;

  @Column({ unique: true, nullable: true })
  survey_token!: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @Column('timestamp', { nullable: true })
  deleted_at!: Date | null;

  @OneToMany(() => SurveyResponse, (response) => response.employee)
  responses!: SurveyResponse[];

  @OneToMany(
    () => CampaignParticipant,
    (campaignParticipant) => campaignParticipant.employee,
  )
  campaign_participations!: CampaignParticipant[];
}
