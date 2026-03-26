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
  id: number;

  @Column()
  name: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => Campaign, (campaign) => campaign.company)
  campaigns: Campaign[];

  @OneToMany(() => Employee, (employee) => employee.company)
  employees: Employee[];
}
