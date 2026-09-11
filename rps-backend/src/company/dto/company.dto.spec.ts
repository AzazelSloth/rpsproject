import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCompanyDto } from './company.dto';

describe('Optional company champion', () => {
  it.each([{}, { champion_name: null, champion_email: null }, { champion_name: ' ', champion_email: ' ' }])(
    'accepts omitted or empty fields: %j', async (fields) => {
      expect(await validate(plainToInstance(UpdateCompanyDto, fields))).toEqual([]);
    },
  );

  it('trims real data and permits either field on its own', async () => {
    const dto = plainToInstance(UpdateCompanyDto, {
      champion_name: '  Contact Test  ', champion_email: ' contact@example.com ',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.champion_name).toBe('Contact Test');
    expect(dto.champion_email).toBe('contact@example.com');
    expect(await validate(plainToInstance(UpdateCompanyDto, { champion_name: 'Contact' }))).toEqual([]);
    expect(await validate(plainToInstance(UpdateCompanyDto, { champion_email: 'contact@example.com' }))).toEqual([]);
  });

  it('normalizes explicit clearing to null without changing omitted fields', () => {
    const cleared = plainToInstance(UpdateCompanyDto, { champion_name: '', champion_email: ' ' });
    expect(cleared.champion_name).toBeNull();
    expect(cleared.champion_email).toBeNull();
    expect(plainToInstance(UpdateCompanyDto, { context: 'Unchanged' }).champion_email).toBeUndefined();
  });

  it.each([
    { champion_email: 'invalid-email' },
    { champion_email: 'contact@example.com\r\nBcc: other@example.com' },
    { champion_name: 'x'.repeat(151) },
    { champion_name: { name: 'invalid' } },
  ])('rejects invalid contact values: %j', async (fields) => {
    expect(await validate(plainToInstance(UpdateCompanyDto, fields))).not.toHaveLength(0);
  });
});
