import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  BankDetailsFormData,
  ContactPersonFormData,
  DocumentUploadFormData,
  EligibilityFormData,
  OrganizationDetailsFormData,
} from "@/lib/validations/registration";

/**
 * FPO Registration Wizard Store
 * Persists form data across page refreshes during registration process
 */

export type RegistrationStep = "eligibility" | "organization" | "contact" | "bank" | "documents" | "review";

interface RegistrationState {
  // Current step
  currentStep: RegistrationStep;

  // Form data for each step
  eligibility: Partial<EligibilityFormData>;
  organization: Partial<OrganizationDetailsFormData>;
  contact: Partial<ContactPersonFormData>;
  bank: Partial<BankDetailsFormData>;
  documents: Partial<DocumentUploadFormData>;

  // Terms acceptance
  termsAccepted: boolean;
  privacyAccepted: boolean;

  // Uploaded file URLs (temporary storage)
  uploadedFiles: {
    registrationCertificate?: string;
    bankDocument?: string;
    authorizedSignatoryId?: string;
    additionalDocuments?: string[];
  };

  // Actions
  setCurrentStep: (step: RegistrationStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  updateEligibility: (data: Partial<EligibilityFormData>) => void;
  updateOrganization: (data: Partial<OrganizationDetailsFormData>) => void;
  updateContact: (data: Partial<ContactPersonFormData>) => void;
  updateBank: (data: Partial<BankDetailsFormData>) => void;
  updateDocuments: (data: Partial<DocumentUploadFormData>) => void;

  setTermsAccepted: (accepted: boolean) => void;
  setPrivacyAccepted: (accepted: boolean) => void;

  setUploadedFile: (key: keyof RegistrationState["uploadedFiles"], url: string) => void;
  addAdditionalDocument: (url: string) => void;
  removeAdditionalDocument: (url: string) => void;

  // Get complete form data for submission
  getCompleteData: () => {
    eligibility: Partial<EligibilityFormData>;
    organization: Partial<OrganizationDetailsFormData>;
    contact: Partial<ContactPersonFormData>;
    bank: Partial<BankDetailsFormData>;
    documents: Partial<DocumentUploadFormData>;
    termsAccepted: boolean;
    privacyAccepted: boolean;
  };

  // Reset store (after successful submission or cancellation)
  reset: () => void;
}

const STEP_ORDER: RegistrationStep[] = ["eligibility", "organization", "contact", "bank", "documents", "review"];

const initialState = {
  currentStep: "eligibility" as RegistrationStep,
  eligibility: {},
  organization: {},
  contact: {},
  bank: {},
  documents: {},
  termsAccepted: false,
  privacyAccepted: false,
  uploadedFiles: {},
};

export const useRegistrationStore = create<RegistrationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const currentIndex = STEP_ORDER.indexOf(get().currentStep);
        if (currentIndex < STEP_ORDER.length - 1) {
          set({ currentStep: STEP_ORDER[currentIndex + 1] });
        }
      },

      prevStep: () => {
        const currentIndex = STEP_ORDER.indexOf(get().currentStep);
        if (currentIndex > 0) {
          set({ currentStep: STEP_ORDER[currentIndex - 1] });
        }
      },

      updateEligibility: (data) =>
        set((state) => ({
          eligibility: { ...state.eligibility, ...data },
        })),

      updateOrganization: (data) =>
        set((state) => ({
          organization: { ...state.organization, ...data },
        })),

      updateContact: (data) =>
        set((state) => ({
          contact: { ...state.contact, ...data },
        })),

      updateBank: (data) =>
        set((state) => ({
          bank: { ...state.bank, ...data },
        })),

      updateDocuments: (data) =>
        set((state) => ({
          documents: { ...state.documents, ...data },
        })),

      setTermsAccepted: (accepted) => set({ termsAccepted: accepted }),

      setPrivacyAccepted: (accepted) => set({ privacyAccepted: accepted }),

      setUploadedFile: (key, url) =>
        set((state) => ({
          uploadedFiles: { ...state.uploadedFiles, [key]: url },
        })),

      addAdditionalDocument: (url) =>
        set((state) => ({
          uploadedFiles: {
            ...state.uploadedFiles,
            additionalDocuments: [...(state.uploadedFiles.additionalDocuments || []), url],
          },
        })),

      removeAdditionalDocument: (url) =>
        set((state) => ({
          uploadedFiles: {
            ...state.uploadedFiles,
            additionalDocuments: (state.uploadedFiles.additionalDocuments || []).filter((u) => u !== url),
          },
        })),

      getCompleteData: () => {
        const state = get();
        return {
          eligibility: state.eligibility,
          organization: state.organization,
          contact: state.contact,
          bank: state.bank,
          documents: state.documents,
          termsAccepted: state.termsAccepted,
          privacyAccepted: state.privacyAccepted,
        };
      },

      reset: () => set(initialState),
    }),
    {
      name: "fpo-registration",
      // Only persist for 24 hours
      partialize: (state) => ({
        currentStep: state.currentStep,
        eligibility: state.eligibility,
        organization: state.organization,
        contact: state.contact,
        bank: state.bank,
        documents: state.documents,
        termsAccepted: state.termsAccepted,
        privacyAccepted: state.privacyAccepted,
        uploadedFiles: state.uploadedFiles,
      }),
    },
  ),
);
