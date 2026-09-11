import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Campaign } from '../campaign/campaign.entity';
import { Employee } from '../employee/employee.entity';

@Entity({ name: 'companies' })
export class Company {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', nullable: true })
  name!: string | null;

  @Column({ type: 'text', nullable: true })
  context!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  champion_name!: string | null;

  @Column({ type: 'varchar', length: 254, nullable: true })
  champion_email!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @OneToMany(() => Campaign, (campaign) => campaign.company)
  campaigns!: Campaign[];

  @OneToMany(() => Employee, (employee) => employee.company)
  employees!: Employee[];
}
