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
import { Question } from './question.entity';

@Entity({ name: 'question_sections' })
export class QuestionSection {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Campaign, (campaign) => campaign.question_sections, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  order_index: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => Question, (question) => question.section)
  questions: Question[];
}
