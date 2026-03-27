import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      name: 'RPS Platform API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
