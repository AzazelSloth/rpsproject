import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Index('IDX_users_password_reset_token_hash')
  @Column({ type: 'varchar', nullable: true })
  password_reset_token_hash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  password_reset_expires_at: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
