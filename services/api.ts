import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Hardcoded production URL - this ensures standalone APK always works
const PRODUCTION_API_URL = 'https://solartech-backend-production.up.railway.app/api';

const getApiBaseUrl = (): string => {
  // PRIORITY 1: If NOT in development mode, ALWAYS use production URL
  // This is the most reliable check for standalone APK builds
  if (!__DEV__) {
    console.log('[API] Production mode detected, using Railway URL');
    return PRODUCTION_API_URL;
  }
  
  // PRIORITY 2: Check for standalone execution (backup check)
  if (Constants.executionEnvironment === 'standalone') {
    console.log('[API] Standalone mode detected, using Railway URL');
    return PRODUCTION_API_URL;
  }
  
  // PRIORITY 3: Check app.json extra config
  const configApiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configApiUrl) {
    console.log('[API] Using config apiUrl:', configApiUrl);
    return configApiUrl;
  }
  
  // DEVELOPMENT MODE BELOW
  
  // Web on Replit
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location.hostname.includes('replit')) {
      const url = `https://${window.location.hostname}/api`;
      console.log('[API] Web Replit mode, using:', url);
      return url;
    }
    return 'http://localhost:8081/api';
  }
  
  // Expo Go on mobile - use Replit proxy
  const replitDomain = Constants.expoConfig?.hostUri?.split(':')[0];
  if (replitDomain && replitDomain.includes('replit')) {
    const url = `https://${replitDomain}/api`;
    console.log('[API] Expo Go Replit mode, using:', url);
    return url;
  }
  
  // Local development fallback
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (debuggerHost) {
    return `http://${debuggerHost}:8081/api`;
  }
  
  return 'http://localhost:8081/api';
};

const API_BASE_URL = getApiBaseUrl();

// Always log the API URL for debugging (including production)
console.log('[API] Base URL:', API_BASE_URL);
console.log('[API] __DEV__:', __DEV__);

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: 'master' | 'ditta' | 'tecnico';
    name: string;
    email: string;
    companyId: string | null;
    companyName: string | null;
  };
}

interface User {
  id: string;
  username: string;
  role: 'master' | 'ditta' | 'tecnico';
  name: string;
  email: string;
  companyId: string | null;
  companyName: string | null;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
}

interface Intervention {
  id: string;
  number: number;
  client: {
    name: string;
    address: string;
    phone: string;
    email: string | null;
  };
  category: 'sopralluogo' | 'installazione' | 'manutenzione';
  description: string;
  priority: 'bassa' | 'normale' | 'alta' | 'urgente';
  status: 'assegnato' | 'appuntamento_fissato' | 'in_corso' | 'completato' | 'chiuso';
  assignedAt: string;
  assignedBy: string;
  assignedByName: string;
  companyId: string;
  companyName: string;
  technicianId: string | null;
  technicianName: string | null;
  appointment: {
    date: string;
    confirmedAt: string;
    notes: string | null;
  } | null;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    timestamp: string;
  } | null;
  documentation: {
    photos: string[];
    notes: string | null;
    startedAt: string | null;
    completedAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

class ApiService {
  private token: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  // Register callback to be called when 401 is received
  setOnUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const fullUrl = `${API_BASE_URL}${endpoint}`;
      console.log('[API] Request:', options.method || 'GET', fullUrl);
      
      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      console.log('[API] Response status:', response.status);
      
      // CRITICAL: Handle 401 Unauthorized - token is invalid
      if (response.status === 401 || response.status === 403) {
        console.log('[API] UNAUTHORIZED - Token invalid, triggering logout');
        if (this.onUnauthorizedCallback) {
          this.onUnauthorizedCallback();
        }
        return {
          success: false,
          error: 'Sessione scaduta. Effettua nuovamente il login.',
        };
      }
      
      const data = await response.json();

      if (!response.ok) {
        console.log('[API] Response error:', data.error);
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      console.log('[API] Response success');
      return { success: true, data };
    } catch (error) {
      console.log('[API] Network error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Errore di rete',
      };
    }
  }

  async login(username: string, password: string): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async verifyToken(): Promise<ApiResponse<{ user: LoginResponse['user'] }>> {
    return this.request<{ user: LoginResponse['user'] }>('/auth/verify');
  }

  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>('/users');
  }

  async createUser(data: {
    username: string;
    password: string;
    role: 'ditta' | 'tecnico';
    name: string;
    email: string;
    companyId?: string;
  }): Promise<ApiResponse<User>> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCompanies(): Promise<ApiResponse<Company[]>> {
    return this.request<Company[]>('/companies');
  }

  async createCompany(data: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  }): Promise<ApiResponse<Company>> {
    return this.request<Company>('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInterventions(): Promise<ApiResponse<Intervention[]>> {
    return this.request<Intervention[]>('/interventions');
  }

  async getIntervention(id: string): Promise<ApiResponse<Intervention>> {
    return this.request<Intervention>(`/interventions/${id}`);
  }

  async createIntervention(data: {
    clientName: string;
    clientAddress: string;
    clientPhone: string;
    clientEmail?: string;
    category: 'sopralluogo' | 'installazione' | 'manutenzione';
    description: string;
    priority: 'bassa' | 'normale' | 'alta' | 'urgente';
    companyId: string;
    technicianId?: string;
  }): Promise<ApiResponse<Intervention>> {
    return this.request<Intervention>('/interventions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIntervention(
    id: string,
    data: Partial<{
      status: string;
      technicianId: string;
      appointmentDate: string;
      appointmentNotes: string;
      locationLatitude: number;
      locationLongitude: number;
      locationAddress: string;
      notes: string;
      photos: string[];
    }>
  ): Promise<ApiResponse<Intervention>> {
    return this.request<Intervention>(`/interventions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async closeIntervention(id: string): Promise<ApiResponse<Intervention>> {
    return this.request<Intervention>(`/interventions/${id}/close`, {
      method: 'POST',
    });
  }

  async deleteIntervention(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/interventions/${id}`, {
      method: 'DELETE',
    });
  }

  async deleteInterventions(ids: string[]): Promise<ApiResponse<{ message: string; deletedCount: number }>> {
    return this.request<{ message: string; deletedCount: number }>('/interventions/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  async uploadPhoto(data: {
    interventionId: string;
    data: string;
    mimeType?: string;
    caption?: string;
    uploadedById: string;
  }): Promise<ApiResponse<PhotoMeta>> {
    return this.request<PhotoMeta>('/photos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInterventionPhotos(interventionId: string): Promise<ApiResponse<PhotoMeta[]>> {
    return this.request<PhotoMeta[]>(`/photos/intervention/${interventionId}`);
  }

  async getPhoto(id: string): Promise<ApiResponse<Photo>> {
    return this.request<Photo>(`/photos/${id}`);
  }

  async deletePhoto(id: string): Promise<ApiResponse<{ success: boolean; id: string }>> {
    return this.request<{ success: boolean; id: string }>(`/photos/${id}`, {
      method: 'DELETE',
    });
  }

  getPhotoImageUrl(id: string): string {
    return `${API_BASE_URL}/photos/${id}/image`;
  }

  async generateReport(
    interventionId: string, 
    format: 'pdf' | 'base64' = 'base64',
    demoUser?: { id: string; name: string; role: string; companyId?: string | null },
    interventionData?: any
  ): Promise<ApiResponse<ReportResponse>> {
    const body: any = {};
    if (demoUser) body.demoUser = demoUser;
    if (interventionData) body.interventionData = interventionData;
    
    return this.request<ReportResponse>(`/reports/intervention/${interventionId}?format=${format}`, {
      method: 'POST',
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });
  }

  getReportUrl(interventionId: string): string {
    return `${API_BASE_URL}/reports/intervention/${interventionId}`;
  }

  async savePushToken(token: string, platform: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/push-tokens', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  }

  async removePushToken(token: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/push-tokens', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    });
  }

  async notifyReportSent(interventionId: string, interventionNumber: string, recipientEmail: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/reports/notify-sent/${interventionId}`, {
      method: 'POST',
      body: JSON.stringify({ interventionNumber, recipientEmail }),
    });
  }

  async notifyAppointmentSet(interventionId: string, interventionNumber: string, clientName: string, appointmentDate: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/push-tokens/notify-appointment/${interventionId}`, {
      method: 'POST',
      body: JSON.stringify({ interventionNumber, clientName, appointmentDate }),
    });
  }

  async notifyStatusChange(interventionId: string, interventionNumber: string, previousStatus: string, newStatus: string, clientName: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/push-tokens/notify-status/${interventionId}`, {
      method: 'POST',
      body: JSON.stringify({ interventionNumber, previousStatus, newStatus, clientName }),
    });
  }
}

interface PhotoMeta {
  id: string;
  interventionId: string;
  mimeType: string;
  caption: string | null;
  uploadedById: string;
  createdAt: string;
}

interface Photo extends PhotoMeta {
  data: string;
}

interface ReportResponse {
  success: boolean;
  data: string;
  filename: string;
  mimeType: string;
}

export const api = new ApiService();
export type { LoginResponse, User, Company, Intervention, ApiResponse, PhotoMeta, Photo, ReportResponse };
