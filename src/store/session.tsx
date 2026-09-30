import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PreoperationalOption, PreoperationalQuestion } from '../mocks/preoperational';
import { fetchPreoperationalQuestions, fetchPreoperationalStatus, submitPreoperationalAnswers } from '../services/preoperationalApi';
import { fetchAssignedServices, fetchCurrentServices } from '../services/servicesApi';
import { clearBiometricCredentials } from '../services/biometricAuth';
import { nowInColombiaIso } from '../services/firmasApi';
import {
  arriveAtDestination,
  arriveAtOrigin,
  completeService,
  submitServiceSurvey as submitServiceSurveyRequest,
} from '../services/serviceStateApi';
import { loginMobilUser, releaseMobilKey } from '../services/userAuth';
import { useTheme, type ThemeColors } from '../theme';
import { OwnedVehicle, Role, RoleCapability, Service, ServiceState } from '../types/domain';
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
  roleCapability: RoleCapability;
  ownedVehicles: OwnedVehicle[];
  selectedVehiculo: OwnedVehicle | null;
  needsVehicleSelection: boolean;
  selectVehiculo: (codvehiculo: number) => void;
  services: Service[];
  servicesLoadError: string | null;
  isLoadingServices: boolean;
  reloadAssignedServices: () => void;
  ownerServices: Service[];
  ownerServicesLoadError: string | null;
  isLoadingOwnerServices: boolean;
  reloadOwnerServices: () => void;
  activeService: Service | null;
  ownerActiveService: Service | null;
  statusCounts: Record<ServiceState, number>;
  login: (username: string, password: string) => Promise<ActionResult>;
  submitPreoperational: (payload: {
    answers: Record<string, PreoperationalOption>;
    mileage: string;
    observations: string;
  }) => Promise<ActionResult>;
  setRole: (role: Role) => void;
  resetSession: () => void;
  closeService: (serviceNumber: string, guideControl: string) => ActionResult;
  arrivedAtOrigin: (serviceNumber: string, code: string) => Promise<ActionResult>;
  arrivedAtDestination: (serviceNumber: string) => Promise<ActionResult>;
  submitServiceSurvey: (serviceNumber: string, calificacion: number, comentario: string) => Promise<ActionResult>;
  deliverService: (
    serviceNumber: string,
    guideControl: string,
    firma: { orden: number; placa: string; firmaBase64: string },
  ) => Promise<ActionResult>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const DEFAULT_ROLE: Role = 'CONDUCTOR';
const DEFAULT_ROLE_CAPABILITY: RoleCapability = 'CONDUCTOR';
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(DEFAULT_USERNAME);
  const [mobilUser, setMobilUser] = useState<SanitizedMobilUser | null>(null);
  const [role, setRole] = useState<Role>(DEFAULT_ROLE);
  const [roleCapability, setRoleCapability] = useState<RoleCapability>(DEFAULT_ROLE_CAPABILITY);
  const [ownedVehicles, setOwnedVehicles] = useState<OwnedVehicle[]>([]);
  const [selectedVehiculo, setSelectedVehiculo] = useState<OwnedVehicle | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoadError, setServicesLoadError] = useState<string | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [ownerServices, setOwnerServices] = useState<Service[]>([]);
  const [ownerServicesLoadError, setOwnerServicesLoadError] = useState<string | null>(null);
  const [isLoadingOwnerServices, setIsLoadingOwnerServices] = useState(false);
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

  // Read-only feed for the PROPIETARIO home card: services assigned to whichever
  // owned vehicle (Locatario-based) is currently selected, independent of the
  // conductor's own `services`/`mobilUser.Vehiculo` fetch above. Uses
  // /services/current (not /services/assigned) so it reflects the vehicle's real
  // state progression (ASIGNADA -> EN_TRANSITO -> TERMINADO -> COMPLETADO),
  // with the same "no date filter" criteria the conductor's own list uses.
  const loadOwnerServices = (vehiculoCodigo: number) => {
    setIsLoadingOwnerServices(true);
    setOwnerServicesLoadError(null);

    fetchCurrentServices(vehiculoCodigo)
      .then((result) => {
        if (result.ok) {
          setOwnerServices(result.services);
        } else {
          setOwnerServicesLoadError(result.message);
        }
      })
      .finally(() => setIsLoadingOwnerServices(false));
  };

  useEffect(() => {
    // A pure PROPIETARIO never drives (mobilUser.Vehiculo is typically 0 for
    // these accounts), so this conductor-only fetch would just be wasted.
    if (mobilUser && roleCapability !== 'PROPIETARIO') {
      loadAssignedServices(mobilUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobilUser, roleCapability]);

  useEffect(() => {
    if (selectedVehiculo) {
      loadOwnerServices(selectedVehiculo.codvehiculo);
    } else {
      setOwnerServices([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehiculo]);

  useEffect(() => {
    // Antes se disparaba sin condicion en cada mount (incluso antes del
    // login), y como /preoperational/questions requiere JWT, siempre fallaba
    // con 401 "Sesion invalida o expirada" - ese error quedaba pegado en
    // pantalla incluso despues de iniciar sesion correctamente, porque nada
    // lo volvia a intentar. Ahora se dispara solo cuando ya hay sesion.
    if (mobilUser) {
      loadPreoperationalChecklist();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobilUser]);

  useEffect(() => {
    // Si el vehiculo ya tiene un preoperacional guardado hoy (por ejemplo,
    // enviado desde otro dispositivo, u otra sesion del mismo conductor), no
    // tiene sentido mostrar la encuesta de nuevo: terminaria bloqueada al
    // enviar con "Ya se registro el preoperacional de este vehiculo hoy".
    // Marcarlo aqui deja que needsPreoperational lo salte y el usuario
    // continue el flujo normal de la app.
    if (mobilUser && roleCapability !== 'PROPIETARIO' && mobilUser.Vehiculo) {
      fetchPreoperationalStatus(mobilUser.Vehiculo).then((result) => {
        if (result.ok && result.submittedToday) {
          setPreoperationalByUser((current) => ({ ...current, [mobilUser.Username]: getTodayKey() }));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobilUser, roleCapability]);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || !isMounted) {
          return;
        }

        const parsed = JSON.parse(raw) as Partial<PersistedSession>;

        // Intentionally not restoring isAuthenticated/username/mobilUser: every
        // cold start must show the Login screen (biometrics remain available
        // there for quick re-entry) instead of silently resuming a session.
        if (parsed.role === 'CONDUCTOR' || parsed.role === 'PROPIETARIO' || parsed.role === 'AMBOS') {
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

  // Real-data counterpart of `activeService` for the owner's vehicle: unlike
  // `services` (only ever populated by the conductor's own local actions on
  // their device), `ownerServices` comes straight from the backend, so this
  // is what a pure PROPIETARIO (who never drives) needs for "Resumen Diario".
  const ownerActiveService = useMemo(
    () => ownerServices.find((service) => service.estado === 'EN_TRANSITO' || service.estado === 'TERMINADO') ?? null,
    [ownerServices],
  );

  // "Resumen Diario" reflects whichever vehicle is relevant to the current
  // role: the conductor's own driven vehicle, or the propietario/AMBOS's
  // selected owned vehicle - a pure PROPIETARIO never drives, so `services`
  // would otherwise stay empty and show a false all-zero summary.
  const statusCounts = useMemo(
    () => buildStatusCounts(role === 'CONDUCTOR' ? services : ownerServices),
    [role, services, ownerServices],
  );

  const needsPreoperational = useMemo(() => {
    if (!isAuthenticated || !username) {
      return false;
    }

    // A pure PROPIETARIO (no CONDUCTOR capability) has no vehicle to inspect daily.
    if (roleCapability === 'PROPIETARIO') {
      return false;
    }

    const lastDate = preoperationalByUser[username];
    return lastDate !== getTodayKey();
  }, [isAuthenticated, preoperationalByUser, roleCapability, username]);

  const needsVehicleSelection = useMemo(() => {
    if (!isAuthenticated) {
      return false;
    }

    if (roleCapability !== 'PROPIETARIO' && roleCapability !== 'AMBOS') {
      return false;
    }

    return ownedVehicles.length > 1 && !selectedVehiculo;
  }, [isAuthenticated, ownedVehicles, roleCapability, selectedVehiculo]);

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
      ownerServices,
      ownerServicesLoadError,
      isLoadingOwnerServices,
      reloadOwnerServices: () => {
        if (selectedVehiculo) {
          loadOwnerServices(selectedVehiculo.codvehiculo);
        }
      },
      activeService,
      ownerActiveService,
      statusCounts,
      login: async (rawUsername: string, rawPassword: string) => {
        const result = await loginMobilUser(rawUsername, rawPassword);

        if (!result.ok) {
          return { ok: false, message: result.message };
        }

        const nextRoleCapability = result.roleCapability;
        const nextOwnedVehicles = result.ownedVehicles;
        const nextRole: Role = nextRoleCapability;
        const autoSelectedVehiculo = nextOwnedVehicles.length === 1 ? nextOwnedVehicles[0] : null;

        setUsername(result.user.Username);
        setMobilUser(result.user);
        setRole(nextRole);
        setRoleCapability(nextRoleCapability);
        setOwnedVehicles(nextOwnedVehicles);
        setSelectedVehiculo(autoSelectedVehiculo);
        setIsAuthenticated(true);

        return { ok: true };
      },
      submitPreoperational: async ({ answers, mileage, observations }) => {
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

        const vehiculo = mobilUser?.Vehiculo;

        if (!vehiculo) {
          return { ok: false, message: 'No se pudo determinar el vehiculo activo.' };
        }

        const result = await submitPreoperationalAnswers({ vehiculo, answers, mileage, observations });

        if (!result.ok) {
          return { ok: false, message: result.message };
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

        // Security: don't leave replayable credentials on the device after logout.
        clearBiometricCredentials().catch(() => undefined);

        setIsAuthenticated(false);
        setUsername(DEFAULT_USERNAME);
        setMobilUser(null);
        setRole(DEFAULT_ROLE);
        setRoleCapability(DEFAULT_ROLE_CAPABILITY);
        setOwnedVehicles([]);
        setSelectedVehiculo(null);
        setServices([]);
        setOwnerServices([]);
      },
      roleCapability,
      ownedVehicles,
      selectedVehiculo,
      needsVehicleSelection,
      selectVehiculo: (codvehiculo: number) => {
        const target = ownedVehicles.find((vehicle) => vehicle.codvehiculo === codvehiculo);

        if (target) {
          setSelectedVehiculo(target);
        }
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

      arrivedAtOrigin: async (serviceNumber: string, code: string) => {
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

        const result = await arriveAtOrigin(serviceNumber);

        if (!result.ok) {
          return result;
        }

        setServices((current) =>
          current.map((s) =>
            s.numeroServicio === serviceNumber ? { ...s, estado: 'EN_TRANSITO' } : s,
          ),
        );

        return { ok: true };
      },

      arrivedAtDestination: async (serviceNumber: string) => {
        const target = services.find((s) => s.numeroServicio === serviceNumber);

        if (!target || target.estado !== 'EN_TRANSITO') {
          return { ok: false, message: 'El servicio no esta en estado EN_TRANSITO.' };
        }

        const result = await arriveAtDestination(serviceNumber);

        if (!result.ok) {
          return result;
        }

        setServices((current) =>
          current.map((s) =>
            s.numeroServicio === serviceNumber ? { ...s, estado: 'TERMINADO' } : s,
          ),
        );

        return { ok: true };
      },

      submitServiceSurvey: async (serviceNumber: string, calificacion: number, comentario: string) => {
        return submitServiceSurveyRequest(serviceNumber, calificacion, comentario);
      },

      deliverService: async (
        serviceNumber: string,
        guideControl: string,
        firma: { orden: number; placa: string; firmaBase64: string },
      ) => {
        if (!/^\d{1,10}$/.test(guideControl)) {
          return { ok: false, message: 'La guia debe ser numerica y tener entre 1 y 10 digitos.' };
        }

        const target = services.find((s) => s.numeroServicio === serviceNumber);

        if (!target || target.estado !== 'TERMINADO') {
          return { ok: false, message: 'El servicio debe estar en estado TERMINADO para entregar.' };
        }

        const timestamp = nowInColombiaIso();
        // fechaServicioFirma solo acepta YYYY-MM-DD (ver serviceState.schemas.ts);
        // horaServicioFirma si necesita el timestamp completo (se parsea como DateTime).
        const fechaOnly = timestamp.slice(0, 10);

        const result = await completeService(serviceNumber, {
          guia: guideControl,
          codorden: firma.orden,
          noorden: '',
          fechaServicioFirma: fechaOnly,
          horaServicioFirma: timestamp,
          placa: firma.placa,
          firma: firma.firmaBase64,
          firmaguia: Number(guideControl),
          cordenadasFirma: '',
          favorito: false,
        });

        if (!result.ok) {
          return result;
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
      isLoadingOwnerServices,
      isLoadingServices,
      isReady,
      mobilUser,
      needsPreoperational,
      needsVehicleSelection,
      ownedVehicles,
      ownerActiveService,
      ownerServices,
      ownerServicesLoadError,
      preoperationalByUser,
      preoperationalLoadError,
      preoperationalQuestions,
      role,
      roleCapability,
      selectedVehiculo,
      services,
      servicesLoadError,
      statusCounts,
      username,
    ],
  );

  if (!isReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.blue} size="large" />
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    loader: {
      alignItems: 'center',
      backgroundColor: colors.background,
      flex: 1,
      justifyContent: 'center',
    },
  });
}