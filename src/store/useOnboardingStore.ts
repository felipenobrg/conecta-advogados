import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "LAWYER" | "CLIENT";
export type PlanId = "START" | "PRO" | "PREMIUM";
export type Gender = "M" | "F" | "O";

export function getTotalStepsForRole(role?: UserRole) {
  return role === "LAWYER" ? 9 : 7;
}

export type OnboardingData = {
  role?: UserRole;
  fullName: string;
  age?: number;
  gender?: Gender;
  email: string;
  phone: string;
  password: string;
  otpCode: string;
  phoneVerified: boolean;
  officeName: string;
  officeLogoUrl: string;
  oabNumber: string;
  oabState: string;
  clientLegalArea: string;
  selectedPlan?: PlanId;
  practiceAreas: string[];
  consentAccepted: boolean;
};

type PersistedOnboardingState = Partial<{
  sessionId: string;
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  data: Partial<OnboardingData>;
}>;

const defaultData: OnboardingData = {
  fullName: "",
  age: undefined,
  gender: undefined,
  email: "",
  phone: "",
  password: "",
  otpCode: "",
  phoneVerified: false,
  officeName: "",
  officeLogoUrl: "",
  oabNumber: "",
  oabState: "",
  clientLegalArea: "",
  practiceAreas: [],
  consentAccepted: false,
};

function createSessionId() {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === "function") {
    return randomUUID.call(globalThis.crypto);
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type OnboardingStore = {
  sessionId: string;
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  data: OnboardingData;
  setStep: (step: number) => void;
  setRole: (role: UserRole) => void;
  setTotalSteps: (steps: number) => void;
  patchData: (payload: Partial<OnboardingData>) => void;
  nextStep: () => void;
  previousStep: () => void;
  setSubmitting: (value: boolean) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      sessionId: createSessionId(),
      currentStep: 1,
      totalSteps: 7,
      isSubmitting: false,
      data: defaultData,
      setStep: (step) => set((state) => ({ currentStep: Math.max(1, Math.min(state.totalSteps, step)) })),
      setRole: (role) =>
        set((state) => {
          const totalSteps = getTotalStepsForRole(role);
          const lawyerReset =
            role === "LAWYER"
              ? {}
              : {
                  officeName: "",
                  officeLogoUrl: "",
                  oabNumber: "",
                  oabState: "",
                  selectedPlan: undefined,
                  practiceAreas: [],
                };

          return {
            totalSteps,
            currentStep: Math.min(state.currentStep, totalSteps),
            data: {
              ...state.data,
              role,
              ...lawyerReset,
            },
          };
        }),
      setTotalSteps: (steps) => set({ totalSteps: Math.max(1, steps) }),
      patchData: (payload) =>
        set((state) => ({
          data: {
            ...state.data,
            ...payload,
          },
        })),
      nextStep: () => set({ currentStep: Math.min(get().currentStep + 1, get().totalSteps) }),
      previousStep: () => set({ currentStep: Math.max(get().currentStep - 1, 1) }),
      setSubmitting: (value) => set({ isSubmitting: value }),
      reset: () =>
        set({
          sessionId: createSessionId(),
          currentStep: 1,
          totalSteps: 7,
          isSubmitting: false,
          data: defaultData,
        }),
    }),
    {
      name: "conecta-onboarding-store",
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as PersistedOnboardingState;

        return {
          ...currentState,
          ...persisted,
          data: {
            ...currentState.data,
            ...defaultData,
            ...(persisted.data ?? {}),
          },
        };
      },
      partialize: (state) => ({
        sessionId: state.sessionId,
        currentStep: state.currentStep,
        data: {
          ...state.data,
          // Nao persiste senha no storage local.
          password: "",
        },
      }),
    }
  )
);
