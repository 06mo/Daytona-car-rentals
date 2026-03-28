"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type {
  BookingExtras,
  BookingPricing,
  BookingRiskProfile,
  DocumentStatus,
  ExtrasPricing,
  ProtectionPackage,
  ProtectionPackageId,
  ProtectionPricing,
  Vehicle,
} from "@/types";
import { getClientServices } from "@/lib/firebase/client";
import { getFallbackProtectionPricing, listProtectionPackages } from "@/lib/protection/config";
import { toBookingApiDateTime } from "@/lib/utils/bookingDateTime";
import { getBookingDraftStorageKey, getBookingResumeStorageKey } from "@/lib/utils/bookingDraft";
import { computeBookingPricing } from "@/lib/utils/pricing";

type BookingDocumentState = {
  insuranceUploaded: boolean;
  insuranceStatus?: DocumentStatus;
  insuranceVerified: boolean;
  licenseUploaded: boolean;
  licenseStatus?: DocumentStatus;
  licenseVerified: boolean;
};

export type BookingState = {
  documents: BookingDocumentState;
  endDate: string;
  extras: BookingExtras;
  pickupLocation: string;
  pricing: BookingPricing;
  promoCode: string;
  protectionPackage: ProtectionPackageId;
  returnLocation: string;
  startDate: string;
  termsConsentedAt?: string;
  termsVersion?: string;
  step: number;
  totalDays: number;
  vehicleId: string;
};

type BookingContextValue = {
  clearDraft: () => void;
  extrasPricing: ExtrasPricing;
  hasRecoveredDraft: boolean;
  lastSavedAt: string | null;
  protectionPackages: ProtectionPackage[];
  protectionPricing: ProtectionPricing;
  riskProfile: BookingRiskProfile | null;
  riskProfileLoading: boolean;
  promoError: string | null;
  setPromoCode: (code: string) => void;
  setDocumentStatus: (type: "license" | "insurance", uploaded: boolean) => void;
  setDocumentReviewStatus: (type: "license" | "insurance", status?: DocumentStatus) => void;
  setDocumentVerificationStatus: (type: "license" | "insurance", verified: boolean) => void;
  setPricing: (pricing: BookingPricing) => void;
  setRiskProfile: (riskProfile: BookingRiskProfile | null) => void;
  setProtectionPackage: (packageId: ProtectionPackageId) => void;
  setStep: (step: number) => void;
  setTermsConsent: (consentedAt: string, termsVersion: string) => void;
  state: BookingState;
  toggleExtra: (key: keyof BookingExtras) => void;
  updateDates: (start: string, end: string) => void;
  updateLocation: (pickup: string, returnLoc: string) => void;
  vehicle: Vehicle;
};

type StoredBookingDraft = {
  savedAt: string;
  state: Pick<
    BookingState,
    | "documents"
    | "endDate"
    | "extras"
    | "pickupLocation"
    | "promoCode"
    | "protectionPackage"
    | "returnLocation"
    | "startDate"
    | "termsConsentedAt"
    | "termsVersion"
    | "step"
    | "vehicleId"
  >;
};

type StoredBookingResumeState = {
  savedAt: string;
  state: Pick<
    BookingState,
    | "endDate"
    | "extras"
    | "pickupLocation"
    | "promoCode"
    | "protectionPackage"
    | "returnLocation"
    | "startDate"
    | "termsConsentedAt"
    | "termsVersion"
    | "step"
    | "vehicleId"
  >;
};

const defaultExtrasPricing: ExtrasPricing = {
  additionalDriver: 1500,
  gps: 1000,
  childSeat: 800,
  updatedAt: new Date(),
};
const defaultProtectionPricing = getFallbackProtectionPricing();

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({
  children,
  initialEndDate = "",
  initialLocation = "",
  initialStartDate = "",
  initialResume = false,
  initialResumeStep,
  vehicle,
}: {
  children: ReactNode;
  initialEndDate?: string;
  initialLocation?: string;
  initialStartDate?: string;
  initialResume?: boolean;
  initialResumeStep?: number;
  vehicle: Vehicle;
}) {
  const [extrasPricing, setExtrasPricing] = useState(defaultExtrasPricing);
  const [protectionPricing, setProtectionPricing] = useState(defaultProtectionPricing);
  const [riskProfile, setRiskProfileState] = useState<BookingRiskProfile | null>(null);
  const [riskProfileLoading, setRiskProfileLoading] = useState(false);
  const [hasRecoveredDraft, setHasRecoveredDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  function createInitialState(): BookingState {
    return {
      vehicleId: vehicle.id,
      startDate: initialStartDate,
      endDate: initialEndDate,
      totalDays: 0,
      pickupLocation: initialLocation,
      returnLocation: initialLocation,
      promoCode: "",
      termsConsentedAt: undefined,
      termsVersion: undefined,
      protectionPackage: "standard",
      extras: {
        additionalDriver: false,
        gps: false,
        childSeat: false,
        cdw: false,
      },
      pricing: {
        dailyRate: vehicle.dailyRate,
        totalDays: 0,
        baseAmount: 0,
        extrasAmount: 0,
        protectionAmount: 0,
        depositAmount: vehicle.depositAmount,
        totalAmount: 0,
      },
      documents: {
        insuranceUploaded: false,
        insuranceStatus: undefined,
        insuranceVerified: false,
        licenseUploaded: false,
        licenseStatus: undefined,
        licenseVerified: false,
      },
      step: 1,
    };
  }

  const [state, setState] = useState<BookingState>(() => createInitialState());

  function clearDraft() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(getBookingDraftStorageKey(vehicle.id));
      window.sessionStorage.removeItem(getBookingResumeStorageKey(vehicle.id));
    }

    setState(createInitialState());
    setRiskProfileState(null);
    setRiskProfileLoading(false);
    setPromoError(null);
    setHasRecoveredDraft(false);
    setLastSavedAt(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPricing() {
      try {
        const [extrasResponse, protectionResponse] = await Promise.all([
          fetch("/api/booking/extras-pricing"),
          fetch("/api/booking/protection-pricing"),
        ]);

        if (!extrasResponse.ok || !protectionResponse.ok) {
          return;
        }

        const [extrasData, protectionData] = (await Promise.all([
          extrasResponse.json(),
          protectionResponse.json(),
        ])) as [{ extrasPricing?: ExtrasPricing }, { protectionPricing?: ProtectionPricing }];

        if (!cancelled && extrasData.extrasPricing) {
          setExtrasPricing({
            ...extrasData.extrasPricing,
            updatedAt: new Date(extrasData.extrasPricing.updatedAt),
          });
        }

        if (!cancelled && protectionData.protectionPricing) {
          setProtectionPricing({
            ...protectionData.protectionPricing,
            updatedAt: new Date(protectionData.protectionPricing.updatedAt),
          });
        }
      } catch {
        return;
      }
    }

    loadPricing();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (initialResume) {
      const rawResumeState = window.sessionStorage.getItem(getBookingResumeStorageKey(vehicle.id));

      if (rawResumeState) {
        try {
          const parsedResumeState = JSON.parse(rawResumeState) as StoredBookingResumeState;

          if (parsedResumeState.state.vehicleId === vehicle.id) {
            setState((current) => ({
              ...current,
              ...parsedResumeState.state,
              step: Math.min(Math.max(initialResumeStep ?? parsedResumeState.state.step, 1), 5),
            }));
            setHasRecoveredDraft(true);
            setLastSavedAt(parsedResumeState.savedAt);
            return;
          }

          window.sessionStorage.removeItem(getBookingResumeStorageKey(vehicle.id));
        } catch {
          window.sessionStorage.removeItem(getBookingResumeStorageKey(vehicle.id));
        }
      }
    }

    const rawDraft = window.localStorage.getItem(getBookingDraftStorageKey(vehicle.id));

    if (!rawDraft) {
      return;
    }

    try {
      const parsedDraft = JSON.parse(rawDraft) as StoredBookingDraft;

      if (parsedDraft.state.vehicleId !== vehicle.id) {
        window.localStorage.removeItem(getBookingDraftStorageKey(vehicle.id));
        return;
      }

      setState((current) => ({
        ...current,
        ...parsedDraft.state,
        step: Math.min(Math.max(initialResumeStep ?? parsedDraft.state.step, 1), 5),
      }));
      setHasRecoveredDraft(true);
      setLastSavedAt(parsedDraft.savedAt);
    } catch {
      window.localStorage.removeItem(getBookingDraftStorageKey(vehicle.id));
    }
  }, [initialResume, initialResumeStep, vehicle.id]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasMeaningfulDraft =
      Boolean(state.startDate) ||
      Boolean(state.endDate) ||
      Boolean(state.pickupLocation) ||
      Boolean(state.returnLocation) ||
      Boolean(state.promoCode) ||
      state.step > 1 ||
      Object.values(state.extras).some(Boolean) ||
      state.documents.licenseUploaded ||
      state.documents.insuranceUploaded;

    if (!hasMeaningfulDraft) {
      window.localStorage.removeItem(getBookingDraftStorageKey(vehicle.id));
      window.sessionStorage.removeItem(getBookingResumeStorageKey(vehicle.id));
      setLastSavedAt(null);
      return;
    }

    const savedAt = new Date().toISOString();
    const draft: StoredBookingDraft = {
      savedAt,
      state: {
        vehicleId: state.vehicleId,
        startDate: state.startDate,
        endDate: state.endDate,
        pickupLocation: state.pickupLocation,
        returnLocation: state.returnLocation,
        promoCode: state.promoCode,
        termsConsentedAt: state.termsConsentedAt,
        termsVersion: state.termsVersion,
        protectionPackage: state.protectionPackage,
        extras: state.extras,
        documents: state.documents,
        step: state.step,
      },
    };

    window.localStorage.setItem(getBookingDraftStorageKey(vehicle.id), JSON.stringify(draft));
    const resumeState: StoredBookingResumeState = {
      savedAt,
      state: {
        vehicleId: state.vehicleId,
        startDate: state.startDate,
        endDate: state.endDate,
        pickupLocation: state.pickupLocation,
        returnLocation: state.returnLocation,
        promoCode: state.promoCode,
        termsConsentedAt: state.termsConsentedAt,
        termsVersion: state.termsVersion,
        protectionPackage: state.protectionPackage,
        extras: state.extras,
        step: state.step,
      },
    };
    window.sessionStorage.setItem(getBookingResumeStorageKey(vehicle.id), JSON.stringify(resumeState));
    setLastSavedAt(savedAt);
  }, [state, vehicle.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadRiskProfile() {
      if (!state.startDate || !state.endDate || new Date(state.endDate) <= new Date(state.startDate)) {
        if (!cancelled) {
          setRiskProfileLoading(false);
          setRiskProfileState(null);
        }
        return;
      }

      try {
        const currentUser = getClientServices()?.auth.currentUser;
        const token = currentUser ? await currentUser.getIdToken() : "";

        if (!token) {
          if (!cancelled) {
            setRiskProfileLoading(false);
            setRiskProfileState(null);
          }
          return;
        }

        if (!cancelled) {
          setRiskProfileLoading(true);
        }

        const response = await fetch("/api/booking/risk-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vehicleId: state.vehicleId,
            startDate: toBookingApiDateTime(state.startDate),
            endDate: toBookingApiDateTime(state.endDate),
            protectionPackage: state.protectionPackage,
            promoCode: state.promoCode || undefined,
          }),
        });

        if (!response.ok) {
          if (!cancelled) {
            setRiskProfileLoading(false);
            setRiskProfileState(null);
          }
          return;
        }

        const data = (await response.json()) as { riskProfile?: BookingRiskProfile };

        if (!cancelled) {
          setRiskProfileState(data.riskProfile ?? null);
        }
      } catch {
        if (!cancelled) {
          setRiskProfileLoading(false);
          setRiskProfileState(null);
        }
      } finally {
        if (!cancelled) {
          setRiskProfileLoading(false);
        }
      }
    }

    loadRiskProfile();

    return () => {
      cancelled = true;
    };
  }, [state.endDate, state.protectionPackage, state.promoCode, state.startDate, state.vehicleId]);

  useEffect(() => {
    if (!riskProfile || riskProfile.allowedProtectionPackages.includes(state.protectionPackage)) {
      return;
    }

    const nextProtectionPackage = riskProfile.allowedProtectionPackages[0];

    if (!nextProtectionPackage) {
      return;
    }

    setState((current) => ({
      ...current,
      protectionPackage: nextProtectionPackage,
    }));
  }, [riskProfile, state.protectionPackage]);

  useEffect(() => {
    if (!state.startDate || !state.endDate) {
      setState((current) => ({
        ...current,
        totalDays: 0,
        pricing: {
          dailyRate: vehicle.dailyRate,
          totalDays: 0,
          baseAmount: 0,
          extrasAmount: 0,
          protectionAmount: 0,
          depositAmount: vehicle.depositAmount,
          totalAmount: 0,
          promoDiscountAmount: 0,
        },
      }));
      return;
    }

    if (new Date(state.endDate) <= new Date(state.startDate)) {
      return;
    }

    const pricing = computeBookingPricing(
      vehicle,
      extrasPricing,
      protectionPricing,
      state.extras,
      state.protectionPackage,
      new Date(state.startDate),
      new Date(state.endDate),
    );

    setState((current) => ({
      ...current,
      totalDays: pricing.totalDays,
      pricing,
    }));
  }, [extrasPricing, protectionPricing, state.endDate, state.extras, state.protectionPackage, state.startDate, vehicle]);

  function setStep(step: number) {
    setState((current) => ({ ...current, step }));
  }

  function setTermsConsent(consentedAt: string, termsVersion: string) {
    setState((current) => ({
      ...current,
      termsConsentedAt: consentedAt,
      termsVersion,
    }));
  }

  function updateDates(start: string, end: string) {
    setState((current) => ({ ...current, startDate: start, endDate: end }));
  }

  function updateLocation(pickup: string, returnLoc: string) {
    setState((current) => ({
      ...current,
      pickupLocation: pickup,
      returnLocation: returnLoc,
    }));
  }

  function toggleExtra(key: keyof BookingExtras) {
    setState((current) => ({
      ...current,
      extras: {
        ...current.extras,
        [key]: !current.extras[key],
      },
    }));
  }

  function setProtectionPackage(packageId: ProtectionPackageId) {
    setState((current) => ({
      ...current,
      protectionPackage: packageId,
    }));
  }

  function setDocumentStatus(type: "license" | "insurance", uploaded: boolean) {
    setState((current) => ({
      ...current,
      documents: {
        ...current.documents,
        licenseUploaded: type === "license" ? uploaded : current.documents.licenseUploaded,
        insuranceUploaded: type === "insurance" ? uploaded : current.documents.insuranceUploaded,
      },
    }));
  }

  function setDocumentReviewStatus(type: "license" | "insurance", status?: DocumentStatus) {
    setState((current) => ({
      ...current,
      documents: {
        ...current.documents,
        licenseStatus: type === "license" ? status : current.documents.licenseStatus,
        insuranceStatus: type === "insurance" ? status : current.documents.insuranceStatus,
      },
    }));
  }

  function setDocumentVerificationStatus(type: "license" | "insurance", verified: boolean) {
    setState((current) => ({
      ...current,
      documents: {
        ...current.documents,
        licenseVerified: type === "license" ? verified : current.documents.licenseVerified,
        insuranceVerified: type === "insurance" ? verified : current.documents.insuranceVerified,
      },
    }));
  }

  function setPricing(pricing: BookingPricing) {
    setState((current) => ({ ...current, pricing, totalDays: pricing.totalDays }));
  }

  function setRiskProfile(riskProfileValue: BookingRiskProfile | null) {
    setRiskProfileState(riskProfileValue);
  }

  function setPromoCode(code: string) {
    setPromoError(null);
    setState((current) => ({ ...current, promoCode: code }));
  }

  return (
    <BookingContext.Provider
      value={{
        clearDraft,
        state,
        hasRecoveredDraft,
        lastSavedAt,
        extrasPricing,
        protectionPackages: listProtectionPackages(protectionPricing),
        protectionPricing,
        riskProfile,
        riskProfileLoading,
        promoError,
        setPromoCode,
        setStep,
        setTermsConsent,
        updateDates,
        updateLocation,
        toggleExtra,
        setProtectionPackage,
        setDocumentStatus,
        setDocumentReviewStatus,
        setDocumentVerificationStatus,
        setPricing,
        setRiskProfile,
        vehicle,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);

  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider.");
  }

  return context;
}
