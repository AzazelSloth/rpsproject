import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Campaign } from '../campaign/campaign.entity';
import { SurveyResponse } from '../response/response.entity';

@Entity({ name: 'questions' })
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Campaign, (campaign) => campaign.questions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column('text', { nullable: true })
  question_text: string;

  @Column({ type: 'varchar', nullable: true })
  question_type: string | null;

  @Column({ type: 'varchar', nullable: true })
  rps_dimension: string | null;

  @Column({ type: 'int', default: 0 })
  order_index: number;

  @Column('simple-array', { nullable: true })
  choice_options: string[] | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => SurveyResponse, (response) => response.question)
  responses: SurveyResponse[];
}
