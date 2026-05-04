// Mock API - Permet à l'application de fonctionner sans backend
// A utiliser en mode demo explicite (NEXT_PUBLIC_BACKEND_MODE=mock)

import { type AuthResponse, type User } from './auth';

class MockAPI {
  private users: Map<string, User> = new Map();
  private surveys: any[] = [];
  private responses: any[] = [];

  constructor() {
    this.seedData();
  }

  private seedData() {
    this.surveys = [
      {
        id: 1,
        company_id: 1,
        name: 'Campagne RPS Q1 2026',
        start_date: '2026-01-15',
        end_date: '2026-03-31',
        status: 'active',
        description: 'Évaluation trimestrielle des risques psychosociaux',
        created_at: '2026-01-15T09:00:00',
      },
      {
        id: 2,
        company_id: 1,
        name: 'Campagne RPS Q2 2026',
        start_date: '2026-04-01',
        end_date: '2026-06-30',
        status: 'pending',
        description: 'Prochaine évaluation',
        created_at: '2026-04-01T09:00:00',
      },
    ];
  }

  async auth(credentials: { email: string; name?: string }): Promise<AuthResponse> {
    await this.delay(2000);
    const user: User = {
      id: Math.floor(Math.random() * 1000),
      email: credentials.email,
      name: credentials.name || 'Admin Demo',
    };
    this.users.set(credentials.email, user);
    return {
      user,
      token: 'demo-token-' + Date.now(),
    };
  }

  async getCampaigns(): Promise<any[]> {
    await this.delay(500);
    return this.surveys;
  }

  async getEmployees(): Promise<any[]> {
    await this.delay(500);
    return [
      { id: 1, company_id: 1, first_name: 'Jean', last_name: 'Dupont', email: 'jean.dupont@laroche.fr', phone: '', status: 'active', department: 'RH', company_name: 'Laroche Consulting', survey_token: 'token-emp-1', created_at: '2026-01-15T09:00:00', deleted_at: null },
      { id: 2, company_id: 1, first_name: 'Marie', last_name: 'Martin', email: 'marie.martin@laroche.fr', phone: '', status: 'active', department: 'IT', company_name: 'Laroche Consulting', survey_token: 'token-emp-2', created_at: '2026-01-15T09:00:00', deleted_at: null },
      { id: 3, company_id: 1, first_name: 'Pierre', last_name: 'Bernard', email: 'pierre.bernard@laroche.fr', phone: '', status: 'active', department: 'Finance', company_name: 'Laroche Consulting', survey_token: 'token-emp-3', created_at: '2026-01-15T09:00:00', deleted_at: null },
    ];
  }

  async getResponses(): Promise<any[]> {
    await this.delay(500);
    return [
      { id: 1, employee_id: 1, question_id: 1, answer: '4', created_at: '2026-01-18T14:30:00' },
      { id: 2, employee_id: 1, question_id: 2, answer: '3', created_at: '2026-01-18T14:30:00' },
    ];
  }

  async createCampaign(campaign: any): Promise<any> {
    await this.delay(500);
    const newCampaign = {
      id: this.surveys.length + 1,
      ...campaign,
      created_at: new Date().toISOString(),
    };
    this.surveys.push(newCampaign);
    return newCampaign;
  }

  async updateEmployeeStatus(employeeId: number, status: string): Promise<any> {
    await this.delay(300);
    return { id: employeeId, status };
  }

  async getCampaignParticipants(campaignId: number): Promise<any[]> {
    await this.delay(500);
    return [
      { id: 1, campaign_id: campaignId, employee_id: 1, status: 'completed', participation_rate: 100 },
      { id: 2, campaign_id: campaignId, employee_id: 2, status: 'completed', participation_rate: 100 },
      { id: 3, campaign_id: campaignId, employee_id: 3, status: 'pending', participation_rate: 0 },
    ];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const mockAPI = new MockAPI();
