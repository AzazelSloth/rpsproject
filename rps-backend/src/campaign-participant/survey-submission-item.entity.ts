import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CampaignParticipant } from './campaign-participant.entity';

export enum SurveySubmissionItemState {
  ANSWERED = 'answered',
  DECLINED = 'declined',
  SKIPPED = 'skipped',
}

@Entity({ name: 'survey_submission_items' })
@Check(
  'CHK_survey_submission_items_answer_consistency',
  `(
    "response_state" = 'answered'
    AND "answer" IS NOT NULL
    AND btrim("answer") <> ''
  ) OR (
    "response_state" IN ('declined', 'skipped')
    AND "answer" IS NULL
  )`,
)
@Index(
  'IDX_survey_submission_items_participation_question',
  ['participation', 'original_question_id'],
  {
    unique: true,
    where: '"original_question_id" IS NOT NULL',
  },
)
export class SurveySubmissionItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => CampaignParticipant,
    (participant) => participant.submission_items,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'participation_id' })
  participation!: CampaignParticipant;

  // Deliberately not a foreign key: the snapshot must survive question deletion.
  @Column({ type: 'int', nullable: true })
  original_question_id!: number | null;

  @Column({ type: 'text', nullable: true })
  question_text!: string | null;

  @Column({ type: 'varchar', nullable: true })
  question_type!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  section_title!: string | null;

  @Column({ type: 'int', nullable: true })
  section_order!: number | null;

  @Column({ type: 'int' })
  question_order!: number;

  @Column({ type: 'jsonb', nullable: true })
  choice_options!: string[] | null;

  @Column({ type: 'text', nullable: true })
  answer!: string | null;

  @Column({ type: 'varchar', length: 20 })
  response_state!: SurveySubmissionItemState;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
