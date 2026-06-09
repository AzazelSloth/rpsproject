import { TRPCClientError } from '@trpc/client';

export interface ErrorInfo {
  code: string;
  statusCode: number;
  message: string;
  userMessage: string;
  isRetryable: boolean;
  suggestedAction?: string;
}

export function parseApiError(error: unknown): ErrorInfo {
  // Handle tRPC errors
  if (error instanceof TRPCClientError) {
    const statusCode = error.data?.code === 'INTERNAL_SERVER_ERROR' ? 500 : 400;
    return {
      code: error.data?.code || 'UNKNOWN_ERROR',
      statusCode,
      message: error.message,
      userMessage: getTrpcErrorMessage(error),
      isRetryable: isRetryableErrorCode(statusCode),
      suggestedAction: getRetryAction(statusCode),
    };
  }

  // Handle fetch errors (network issues)
  if (error instanceof Error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        statusCode: 0,
        message: error.message,
        userMessage: 'Erreur de connexion réseau. Vérifiez votre connexion Internet.',
        isRetryable: true,
        suggestedAction: 'Veuillez réessayer après quelques secondes.',
      };
    }

    if (error.message.includes('429')) {
      return {
        code: 'RATE_LIMIT_ERROR',
        statusCode: 429,
        message: error.message,
        userMessage: 'Trop de requêtes. Veuillez attendre avant de réessayer.',
        isRetryable: true,
        suggestedAction: 'Le système essayera automatiquement de renvoyer la requête avec une attente.',
      };
    }

    if (error.message.includes('500')) {
      return {
        code: 'SERVER_ERROR',
        statusCode: 500,
        message: error.message,
        userMessage: 'Erreur serveur temporaire. Le système réessayera automatiquement.',
        isRetryable: true,
        suggestedAction: 'Aucune action requise - le système retente automatiquement.',
      };
    }

    if (error.message.includes('abort') || error.message.includes('timeout')) {
      return {
        code: 'TIMEOUT_ERROR',
        statusCode: 0,
        message: error.message,
        userMessage: 'La requête a dépassé le délai d\'attente. La connexion est peut-être lente.',
        isRetryable: true,
        suggestedAction: 'Veuillez réessayer. Si le problème persiste, vérifiez votre connexion Internet.',
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      statusCode: 0,
      message: error.message,
      userMessage: error.message,
      isRetryable: false,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    statusCode: 0,
    message: 'Erreur inconnue',
    userMessage: 'Une erreur inattendue s\'est produite.',
    isRetryable: false,
  };
}

export function getTrpcErrorMessage(error: TRPCClientError<any>): string {
  const code = error.data?.code;
  const message = error.message;

  switch (code) {
    case 'INTERNAL_SERVER_ERROR':
      // Check message for specific issues
      if (message.includes('SendGrid')) {
        return 'Erreur lors de l\'envoi des emails via SendGrid. Vérifiez la configuration SendGrid.';
      }
      if (message.includes('invitation')) {
        return 'Erreur lors de la création des invitations. Veuillez réessayer.';
      }
      return 'Erreur serveur interne. Le système réessayera automatiquement.';
    case 'BAD_REQUEST':
      return `Requête invalide: ${message}`;
    case 'UNAUTHORIZED':
      return 'Authentification requise. Veuillez vous reconnecter.';
    case 'FORBIDDEN':
      return 'Vous n\'avez pas la permission d\'effectuer cette action.';
    case 'NOT_FOUND':
      return 'Ressource non trouvée.';
    default:
      return message || 'Une erreur s\'est produite.';
  }
}

export function isRetryableErrorCode(statusCode: number): boolean {
  // 429 Too Many Requests
  // 500 Internal Server Error
  // 502 Bad Gateway
  // 503 Service Unavailable
  // 504 Gateway Timeout
  // 408 Request Timeout
  const retryableCodes = [408, 429, 500, 502, 503, 504];
  return retryableCodes.includes(statusCode);
}

export function getRetryAction(statusCode: number): string {
  switch (statusCode) {
    case 429:
      return 'Le système va automatiquement attendre et réessayer avec un délai exponentiel.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Erreur serveur temporaire. Le système va réessayer automatiquement.';
    case 408:
      return 'Délai d\'attente dépassé. Le système va réessayer.';
    default:
      return 'Veuillez réessayer.';
  }
}

/**
 * Extract error details from API response body
 */
export function extractErrorDetails(body: string | object): string {
  if (typeof body === 'string') {
    try {
      const json = JSON.parse(body);
      return json.message || json.error || body;
    } catch {
      return body;
    }
  }

  if (typeof body === 'object' && body !== null) {
    return (body as any).message || (body as any).error || JSON.stringify(body);
  }

  return 'Erreur inconnue';
}
