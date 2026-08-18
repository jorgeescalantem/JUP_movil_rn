import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PreoperationalOption, PreoperationalQuestion } from '../mocks/preoperational';
import { fetchPreoperationalQuestions } from '../services/preoperationalApi';
import { fetchAssignedServices } from '../services/servicesApi';
import { loginMobilUser, releaseMobilKey } from '../services/userAuth';
import { colors } from '../theme';
import { Role, Service, ServiceState } from '../types/domain';
import { SanitizedMobilUser } from '../types/api';

const STORAGE_KEY = 'jup-mobile-session';

type PersistedSession = {
  isAuthenticated: boolean;
  username: string | null;
  role: Role;
  services: Service[];
  preoperationalByUser: Record<string, string>;
  mobilUser: SanitizedMobilUser | null;
};

type ActionResult = { ok: boolean; message?: string };

type SessionContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  username: string | null;
  mobilUser: SanitizedMobilUser | null;
  needsPreoperational: boolean;
  preoperationalQuestions: { id: string; text: string }[];
  preoperationalLoadError: string | null;
  reloadPreoperationalChecklist: () => void;
  role: Role;
  services: Service[];
  servicesLoadError: string | null;
  isLoadingServices: boolean;
  reloadAssignedServices: () => void;
  activeService: Service | null;
  statusCounts: Record<ServiceState, number>;
  login: (username: string, password: string) => Promise<ActionResult>;
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

function mergeServicesWithMocks(persistedServices: Service[], baseMocks: Service[]): Service[] {
  const persistedByNumber = new Map(persistedServices.map((service) => [service.numeroServicio, service]));

  // Keep mock catalog updated while preserving any runtime changes for existing service IDs.
  // Merge field-by-field so newly added mock fields (e.g. HoraRecogida/HoraCita) aren't lost
  // when older persisted data (saved before those fields existed) is restored.
  const merged = baseMocks.map((mockService) => {
    const persisted = persistedByNumber.get(mockService.numeroServicio);
    return persisted ? { ...mockService, ...persisted } : mockService;
  });

  // Preserve old persisted services that are not in current mocks.
  persistedServices.forEach((service) => {
    if (!baseMocks.some((mockService) => mockService.numeroServicio === service.numeroServicio)) {
      merged.push(service);
    }
  });

  return merged;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(DEFAULT_USERNAME);
  const [mobilUser, setMobilUser] = useState<SanitizedMobilUser | null>(null);
  const [role, setRole] = useState<Role>(DEFAULT_ROLE);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoadError, setServicesLoadError] = useState<string | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [preoperationalByUser, setPreoperationalByUser] = useState<Record<string, string>>({});
  const [preoperationalQuestions, setPreoperationalQuestions] = useState<PreoperationalQuestion[]>([]);
  const [preoperationalLoadError, setPreoperationalLoadError] = useState<string | null>(null);

  const loadPreoperationalChecklist = () => {
    setPreoperationalLoadError(null);

    fetchPreoperationalQuestions().then((result) => {
      if (result.ok) {
        setPreoperationalQuestions(result.questions);
      } else {
        setPreoperationalLoadError(result.message);
      }
    });
  };

  const loadAssignedServices = (user: SanitizedMobilUser) => {
    setIsLoadingServices(true);
    setServicesLoadError(null);

    fetchAssignedServices(user.Vehiculo)
      .then((result) => {
        if (result.ok) {
          // Only the ASIGNADA slice comes from the real API for now; other
          // states stay untouched to avoid affecting screens out of scope here.
          // Local status changes (arrivedAtOrigin/deliverService/...) aren't
          // persisted to the API yet, so a service already progressed locally
          // would otherwise be "resurrected" as ASIGNADA on refetch, producing
          // a duplicate numeroServicio (and a React duplicate-key warning).
          setServices((current) => {
            // Defensive de-dupe: AsyncStorage may already hold duplicate
            // numeroServicio entries persisted by an earlier run (last one wins).
            const dedupedCurrent = Array.from(
              new Map(current.map((service) => [service.numeroServicio, service])).values(),
            );

            const progressedLocally = new Set(
              dedupedCurrent
                .filter((service) => service.estado !== 'ASIGNADA')
                .map((service) => service.numeroServicio),
            );

            const freshAssigned = result.services.filter(
              (service) => !progressedLocally.has(service.numeroServicio),
            );

            return [...dedupedCurrent.filter((service) => service.estado !== 'ASIGNADA'), ...freshAssigned];
          });
        } else {
          setServicesLoadError(result.message);
        }
      })
      .finally(() => setIsLoadingServices(false));
  };

  useEffect(() => {
    if (mobilUser) {
      loadAssignedServices(mobilUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobilUser]);

  useEffect(() => {
    loadPreoperationalChecklist();
  }, []);

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

        if (parsed.mobilUser && typeof parsed.mobilUser === 'object') {
          setMobilUser(parsed.mobilUser as SanitizedMobilUser);
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
      mobilUser,
    };

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => undefined);
  }, [isAuthenticated, isReady, mobilUser, preoperationalByUser, role, services, username]);

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
      mobilUser,
      needsPreoperational,
      preoperationalQuestions,
      preoperationalLoadError,
      reloadPreoperationalChecklist: loadPreoperationalChecklist,
      role,
      services,
      servicesLoadError,
      isLoadingServices,
      reloadAssignedServices: () => {
        if (mobilUser) {
          loadAssignedServices(mobilUser);
        }
      },
      activeService,
      statusCounts,
      login: async (rawUsername: string, rawPassword: string) => {
        const result = await loginMobilUser(rawUsername, rawPassword);

        if (!result.ok) {
          return { ok: false, message: result.message };
        }

        const normalized = result.user.Username.toLowerCase();
        // NOTE: TusuarioMobil does not expose an explicit role field yet.
        // Keeping the existing heuristic until the backend provides one.
        const nextRole: Role = normalized.includes('prop') || normalized.includes('owner')
          ? 'PROPIETARIO'
          : 'CONDUCTOR';

        setUsername(result.user.Username);
        setMobilUser(result.user);
        setRole(nextRole);
        setIsAuthenticated(true);

        return { ok: true };
      },
      submitPreoperational: ({ answers, mileage, observations }) => {
        if (!username) {
          return { ok: false, message: 'No hay usuario activo.' };
        }

        const expectedIds = preoperationalQuestions.map((question) => question.id);
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
        if (mobilUser) {
          // Release the device lock so this account can log in from another
          // device afterwards. Best-effort/fire-and-forget: logout must not
          // be blocked by a network failure.
          releaseMobilKey(mobilUser.Id).catch(() => undefined);
        }

        setIsAuthenticated(false);
        setUsername(DEFAULT_USERNAME);
        setMobilUser(null);
        setRole(DEFAULT_ROLE);
        setServices([]);
      },
      closeService: (serviceNumber: string, guideControl: string) => {
        if (role === 'PROPIETARIO') {
          return { ok: false, message: 'Este rol no tiene permiso para cerrar servicios desde este flujo.' };
        }

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

    [
      activeService,
      isAuthenticated,
      isLoadingServices,
      isReady,
      mobilUser,
      needsPreoperational,
      preoperationalByUser,
      preoperationalLoadError,
      preoperationalQuestions,
      role,
      services,
      servicesLoadError,
      statusCounts,
      username,
    ],
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