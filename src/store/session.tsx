import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { preoperationalConfig, PreoperationalOption } from '../mocks/preoperational';
import { mockServices } from '../mocks/services';
import { colors } from '../theme';
import { Role, Service, ServiceState } from '../types/domain';

const STORAGE_KEY = 'jup-mobile-session';

type PersistedSession = {
  isAuthenticated: boolean;
  username: string | null;
  role: Role;
  services: Service[];
  preoperationalByUser: Record<string, string>;
};

type ActionResult = { ok: boolean; message?: string };

type SessionContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  username: string | null;
  needsPreoperational: boolean;
  preoperationalQuestions: { id: string; text: string }[];
  role: Role;
  services: Service[];
  activeService: Service | null;
  statusCounts: Record<ServiceState, number>;
  login: (username: string, password: string) => ActionResult;
  submitPreoperational: (payload: {
    answers: Record<string, PreoperationalOption>;
    mileage: string;
    observations: string;
  }) => ActionResult;
  setRole: (role: Role) => void;
  resetSession: () => void;
  closeService: (serviceNumber: string, guideControl: string) => ActionResult;
  arrivedAtOrigin: (serviceNumber: string, code: string) => ActionResult;
  arrivedAtDestination: (serviceNumber: string) => ActionResult;
  deliverService: (serviceNumber: string, guideControl: string) => ActionResult;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const DEFAULT_ROLE: Role = 'CONDUCTOR';
const DEFAULT_USERNAME: string | null = null;

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildStatusCounts(services: Service[]): Record<ServiceState, number> {
  return services.reduce(
    (accumulator, service) => {
      accumulator[service.estado] += 1;
      return accumulator;
    },
    {
      ASIGNADA: 0,
      EN_TRANSITO: 0,
      TERMINADO: 0,
      COMPLETADO: 0,
      procesado: 0,
    },
  );
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(DEFAULT_USERNAME);
  const [role, setRole] = useState<Role>(DEFAULT_ROLE);
  const [services, setServices] = useState<Service[]>(mockServices);
  const [preoperationalByUser, setPreoperationalByUser] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || !isMounted) {
          return;
        }

        const parsed = JSON.parse(raw) as Partial<PersistedSession>;

        if (typeof parsed.isAuthenticated === 'boolean') {
          setIsAuthenticated(parsed.isAuthenticated);
        }

        if (typeof parsed.username === 'string') {
          setUsername(parsed.username);
        }

        if (parsed.role === 'CONDUCTOR' || parsed.role === 'PROPIETARIO') {
          setRole(parsed.role);
        }

        if (Array.isArray(parsed.services) && parsed.services.length > 0) {
          setServices(parsed.services as Service[]);
        }

        if (parsed.preoperationalByUser && typeof parsed.preoperationalByUser === 'object') {
          setPreoperationalByUser(parsed.preoperationalByUser as Record<string, string>);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const payload: PersistedSession = {
      isAuthenticated,
      username,
      role,
      services,
      preoperationalByUser,
    };

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => undefined);
  }, [isAuthenticated, isReady, preoperationalByUser, role, services, username]);

  const activeService = useMemo(
    () => services.find((service) => service.estado === 'EN_TRANSITO' || service.estado === 'TERMINADO') ?? null,
    [services],
  );

  const statusCounts = useMemo(() => buildStatusCounts(services), [services]);

  const needsPreoperational = useMemo(() => {
    if (!isAuthenticated || !username) {
      return false;
    }

    const lastDate = preoperationalByUser[username];
    return lastDate !== getTodayKey();
  }, [isAuthenticated, preoperationalByUser, username]);

  const value = useMemo<SessionContextValue>(
    () => ({
      isReady,
      isAuthenticated,
      username,
      needsPreoperational,
      preoperationalQuestions: preoperationalConfig.questions,
      role,
      services,
      activeService,
      statusCounts,
      login: (rawUsername: string, rawPassword: string) => {
        const nextUsername = rawUsername.trim();
        const nextPassword = rawPassword.trim();

        if (!nextUsername || !nextPassword) {
          return { ok: false, message: 'Debes ingresar usuario y contrasena.' };
        }

        if (nextUsername !== 'pruebas1' || nextPassword !== 'pruebas1') {
          return { ok: false, message: 'Usuario o contrasena invalido. Usa pruebas1 / pruebas1.' };
        }

        const normalized = nextUsername.toLowerCase();
        const nextRole: Role = normalized.includes('prop') || normalized.includes('owner')
          ? 'PROPIETARIO'
          : 'CONDUCTOR';

        setUsername(nextUsername);
        setRole(nextRole);
        setIsAuthenticated(true);

        return { ok: true };
      },
      submitPreoperational: ({ answers, mileage, observations }) => {
        if (!username) {
          return { ok: false, message: 'No hay usuario activo.' };
        }

        const expectedIds = preoperationalConfig.questions.map((question) => question.id);
        const missing = expectedIds.find((id) => !answers[id]);

        if (missing) {
          return { ok: false, message: 'Responde todas las preguntas de la encuesta.' };
        }

        if (!String(mileage).trim()) {
          return { ok: false, message: 'Debes ingresar el kilometraje.' };
        }

        if (String(observations).length > 69) {
          return { ok: false, message: 'Observaciones no puede superar 69 caracteres.' };
        }

        setPreoperationalByUser((current) => ({
          ...current,
          [username]: getTodayKey(),
        }));

        return { ok: true };
      },
      setRole,
      resetSession: () => {
        setIsAuthenticated(false);
        setUsername(DEFAULT_USERNAME);
        setRole(DEFAULT_ROLE);
        setServices(mockServices);
      },
      closeService: (serviceNumber: string, guideControl: string) => {
        if (!/^\d{1,10}$/.test(guideControl)) {
          return { ok: false, message: 'La guia debe ser numerica y tener entre 1 y 10 digitos.' };
        }

        const target = services.find((s) => s.numeroServicio === serviceNumber);

        if (!target || target.estado !== 'TERMINADO') {
          return { ok: false, message: 'El servicio no esta disponible para cierre.' };
        }

        setServices((current) =>
          current.map((s) =>
            s.numeroServicio === serviceNumber ? { ...s, estado: 'COMPLETADO', Guiacontrol: guideControl } : s,
          ),
        );

        return { ok: true };
      },

      arrivedAtOrigin: (serviceNumber: string, code: string) => {
        const target = services.find((s) => s.numeroServicio === serviceNumber);

        if (!target || target.estado !== 'ASIGNADA') {
          return { ok: false, message: 'El servicio no esta en estado ASIGNADA.' };
        }

        if (String(code).trim() !== String(target.numeroServicio).trim()) {
          return { ok: false, message: 'El codigo no coincide con el numero de servicio.' };
        }

        const hasActive = services.some(
          (s) => s.numeroServicio !== serviceNumber && (s.estado === 'EN_TRANSITO' || s.estado === 'TERMINADO'),
        );

        if (hasActive) {
          return { ok: false, message: 'Ya existe un servicio activo. Finaliza el servicio en curso primero.' };
        }

        setServices((current) =>
          current.map((s) =>
            s.numeroServicio === serviceNumber ? { ...s, estado: 'EN_TRANSITO' } : s,
          ),
        );

        return { ok: true };
      },

      arrivedAtDestination: (serviceNumber: string) => {
        const target = services.find((s) => s.numeroServicio === serviceNumber);

        if (!target || target.estado !== 'EN_TRANSITO') {
          return { ok: false, message: 'El servicio no esta en estado EN_TRANSITO.' };
        }

        setServices((current) =>
          current.map((s) =>
            s.numeroServicio === serviceNumber ? { ...s, estado: 'TERMINADO' } : s,
          ),
        );

        return { ok: true };
      },

      deliverService: (serviceNumber: string, guideControl: string) => {
        if (!/^\d{1,10}$/.test(guideControl)) {
          return { ok: false, message: 'La guia debe ser numerica y tener entre 1 y 10 digitos.' };
        }

        const target = services.find((s) => s.numeroServicio === serviceNumber);

        if (!target || target.estado !== 'TERMINADO') {
          return { ok: false, message: 'El servicio debe estar en estado TERMINADO para entregar.' };
        }

        setServices((current) =>
          current.map((s) =>
            s.numeroServicio === serviceNumber
              ? { ...s, estado: 'COMPLETADO', Guiacontrol: guideControl }
              : s,
          ),
        );

        return { ok: true };
      },
    }),

    [activeService, isAuthenticated, isReady, needsPreoperational, preoperationalByUser, role, services, statusCounts, username],
  );

  if (!isReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }

  return context;
}

const styles = StyleSheet.create({
  loader: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
});