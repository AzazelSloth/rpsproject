import { Controller, Get, Logger, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { getN8nBaseUrl } from '../n8n/n8n.config';

type HealthStatus = 'healthy' | 'unhealthy' | 'unavailable' | 'not-configured';

interface HealthCheck {
  status: string;
  timestamp: string;
  checks: {
    database: HealthStatus;
    n8n: HealthStatus;
  };
}

function getConfiguredN8nHealthUrl() {
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL?.trim();
  const n8nBaseUrl = process.env.N8N_BASE_URL?.trim();

  if (!n8nWebhookUrl && !n8nBaseUrl) {
    return undefined;
  }

  return `${getN8nBaseUrl()}/healthz`;
}

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  constructor(@Optional() private readonly dataSource?: DataSource) {}

  @Get()
  async getHealth(): Promise<HealthCheck> {
    const health: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'unknown' as HealthStatus,
        n8n: 'unknown' as HealthStatus,
      },
    };

    // Check database connectivity
    if (!this.dataSource) {
      health.checks.database = 'not-configured';
    } else {
      try {
        await this.dataSource.query('SELECT 1');
        health.checks.database = 'healthy';
      } catch (error) {
        this.logger.error('Database health check failed', error);
        health.checks.database = 'unhealthy';
      }
    }

    // Check n8n service health endpoint (if configured)
    const n8nHealthUrl = getConfiguredN8nHealthUrl();
    if (n8nHealthUrl) {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(n8nHealthUrl, {
          method: 'GET',
          signal: controller.signal,
        });
        health.checks.n8n = response.ok ? 'healthy' : 'unavailable';
      } catch {
        health.checks.n8n = 'unavailable';
      } finally {
        if (timeout) {
          clearTimeout(timeout);
        }
      }
    } else {
      health.checks.n8n = 'not-configured';
    }

    const n8nHealthRequired = process.env.N8N_HEALTH_REQUIRED === 'true';
    const overallHealthy =
      (health.checks.database === 'healthy' ||
        health.checks.database === 'not-configured') &&
      (!n8nHealthRequired ||
        health.checks.n8n === 'healthy' ||
        health.checks.n8n === 'not-configured');

    return {
      ...health,
      status: overallHealthy ? 'healthy' : 'degraded',
    };
  }
}
