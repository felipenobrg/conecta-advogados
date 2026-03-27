import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "LAWYER" | "CLIENT";
export type PlanId = "START" | "PRO" | "PRIMUM";

export type OnboardingData = {
  role?: UserRole;
  fullName: string;
  email: string;
  phone: string;
  otpCode: string;
  phoneVerified: boolean;
  selectedPlan?: PlanId;
  practiceAreas: string[];
  consentAccepted: boolean;
};

const defaultData: OnboardingData = {
  fullName: "",
  email: "",
  phone: "",
  otpCode: "",
  phoneVerified: false,
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
      totalSteps: 6,
      isSubmitting: false,
      data: defaultData,
      setStep: (step) => set({ currentStep: Math.max(1, Math.min(6, step)) }),
      patchData: (payload) =>
        set((state) => ({
          data: {
            ...state.data,
            ...payload,
          },
        })),
      nextStep: () => set({ currentStep: Math.min(get().currentStep + 1, 6) }),
      previousStep: () => set({ currentStep: Math.max(get().currentStep - 1, 1) }),
      setSubmitting: (value) => set({ isSubmitting: value }),
      reset: () =>
        set({
          sessionId: createSessionId(),
          currentStep: 1,
          isSubmitting: false,
          data: defaultData,
        }),
    }),
    {
      name: "conecta-onboarding-store",
      partialize: (state) => ({
        sessionId: state.sessionId,
        currentStep: state.currentStep,
        data: state.data,
      }),
    }
  )
);
