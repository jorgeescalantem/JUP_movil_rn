import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { mockServices } from '../mocks/services';
import { colors } from '../theme';
import { Role, Service, ServiceState } from '../types/domain';

const STORAGE_KEY = 'jup-mobile-session';

type PersistedSession = {
  role: Role;
  services: Service[];
};

type ActionResult = { ok: boolean; message?: string };

type SessionContextValue = {
  isReady: boolean;
  role: Role;
  services: Service[];
  activeService: Service | null;
  statusCounts: Record<ServiceState, number>;
  setRole: (role: Role) => void;
  resetSession: () => void;
  closeService: (serviceNumber: string, guideControl: string) => ActionResult;
  arrivedAtOrigin: (serviceNumber: string, code: string) => ActionResult;
  arrivedAtDestination: (serviceNumber: string) => ActionResult;
  deliverService: (serviceNumber: string, guideControl: string) => ActionResult;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const DEFAULT_ROLE: Role = 'CONDUCTOR';

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
  const [role, setRole] = useState<Role>(DEFAULT_ROLE);
  const [services, setServices] = useState<Service[]>(mockServices);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || !isMounted) {
          return;
        }

        const parsed = JSON.parse(raw) as Partial<PersistedSession>;

        if (parsed.role === 'CONDUCTOR' || parsed.role === 'PROPIETARIO') {
          setRole(parsed.role);
        }

        if (Array.isArray(parsed.services) && parsed.services.length > 0) {
          setServices(parsed.services as Service[]);
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
      role,
      services,
    };

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => undefined);
  }, [isReady, role, services]);

  const activeService = useMemo(
    () => services.find((service) => service.estado === 'EN_TRANSITO' || service.estado === 'TERMINADO') ?? null,
    [services],
  );

  const statusCounts = useMemo(() => buildStatusCounts(services), [services]);

  const value = useMemo<SessionContextValue>(
    () => ({
      isReady,
      role,
      services,
      activeService,
      statusCounts,
      setRole,
      resetSession: () => {
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

    [activeService, isReady, role, services, statusCounts],
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