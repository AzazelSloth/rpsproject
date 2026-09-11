import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { CompanyService } from './company.service';
import { AddCompanyChampion1710000000017 } from '../database/migrations/1710000000017-AddCompanyChampion';
import type { QueryRunner } from 'typeorm';

describe('Company champion persistence', () => {
  it('saves and reloads the selected company contact, preserving other fields and companies', async () => {
    const first = { id: 1, name: 'First', context: 'Original context', champion_name: null, champion_email: null } as Company;
    const second = { id: 2, name: 'Second', champion_name: 'Other contact', champion_email: 'other@example.com' } as Company;
    const records = [first, second];
    const repository = {
      findOne: jest.fn(({ where }: { where: { id: number } }) => Promise.resolve(records.find((record) => record.id === where.id))),
      merge: jest.fn((company: Company, patch: Partial<Company>) => Object.assign(company, patch)),
      save: jest.fn((company: Company) => Promise.resolve(company)),
    };
    const service = new CompanyService(repository as unknown as Repository<Company>);
    await service.update(1, { champion_name: 'Saved contact', champion_email: 'saved@example.com' });
    expect(await service.findOne(1)).toMatchObject({
      id: 1, context: 'Original context', champion_name: 'Saved contact', champion_email: 'saved@example.com',
    });
    expect(second).toMatchObject({ champion_name: 'Other contact', champion_email: 'other@example.com' });
    await service.update(1, { context: 'Updated context' });
    expect(first.champion_email).toBe('saved@example.com');
    await service.update(1, { champion_name: null, champion_email: null });
    expect(await service.findOne(1)).toMatchObject({ context: 'Updated context', champion_name: null, champion_email: null });
    expect(repository.save).toHaveBeenCalledTimes(3);
  });

  it('migration only adds nullable contact columns, without populating or altering existing records', async () => {
    const query = jest.fn<Promise<unknown>, [string]>().mockResolvedValue(undefined);
    await new AddCompanyChampion1710000000017().up({ query } as unknown as QueryRunner);
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "champion_name" varchar(150)');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "champion_email" varchar(254)');
    expect(sql).not.toMatch(/NOT NULL|DEFAULT|UPDATE|DELETE|DROP/i);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
