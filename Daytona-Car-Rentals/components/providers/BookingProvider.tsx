"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type { BookingExtras, BookingPricing, ExtrasPricing, Vehicle } from "@/types";
import { computeBookingPricing } from "@/lib/utils/pricing";

type BookingDocumentState = {
  insuranceUploaded: boolean;
  insuranceVerified: boolean;
  licenseUploaded: boolean;
  licenseVerified: boolean;
};

export type BookingState = {
  documents: BookingDocumentState;
  endDate: string;
  extras: BookingExtras;
  pickupLocation: string;
  pricing: BookingPricing;
  promoCode: string;
  returnLocation: string;
  startDate: string;
  step: number;
  totalDays: number;
  vehicleId: string;
};

type BookingContextValue = {
  extrasPricing: ExtrasPricing;
  promoError: string | null;
  setPromoCode: (code: string) => void;
  setDocumentStatus: (type: "license" | "insurance", uploaded: boolean) => void;
  setDocumentVerificationStatus: (type: "license" | "insurance", verified: boolean) => void;
  setPricing: (pricing: BookingPricing) => void;
  setStep: (step: number) => void;
  state: BookingState;
  toggleExtra: (key: keyof BookingExtras) => void;
  updateDates: (start: string, end: string) => void;
  updateLocation: (pickup: string, returnLoc: string) => void;
  vehicle: Vehicle;
};

const defaultExtrasPricing: ExtrasPricing = {
  additionalDriver: 1500,
  gps: 1000,
  childSeat: 800,
  cdw: 2500,
  updatedAt: new Date(),
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({
  children,
  initialEndDate = "",
  initialLocation = "",
  initialStartDate = "",
  vehicle,
}: {
  children: ReactNode;
  initialEndDate?: string;
  initialLocation?: string;
  initialStartDate?: string;
  vehicle: Vehicle;
}) {
  const [extrasPricing, setExtrasPricing] = useState(defaultExtrasPricing);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [state, setState] = useState<BookingState>(() => ({
    vehicleId: vehicle.id,
    startDate: initialStartDate,
    endDate: initialEndDate,
    totalDays: 0,
    pickupLocation: initialLocation,
    returnLocation: initialLocation,
    promoCode: "",
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
      depositAmount: vehicle.depositAmount,
      totalAmount: 0,
    },
    documents: {
      insuranceUploaded: false,
      insuranceVerified: false,
      licenseUploaded: false,
      licenseVerified: false,
    },
    step: 1,
  }));

  useEffect(() => {
    let cancelled = false;

    async function loadExtrasPricing() {
      try {
        const response = await fetch("/api/booking/extras-pricing");
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { extrasPricing?: ExtrasPricing };
        if (!cancelled && data.extrasPricing) {
          setExtrasPricing({
            ...data.extrasPricing,
            updatedAt: new Date(data.extrasPricing.updatedAt),
          });
        }
      } catch {
        return;
      }
    }

    loadExtrasPricing();

    return () => {
      cancelled = true;
    };
  }, []);

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
      state.extras,
      new Date(state.startDate),
      new Date(state.endDate),
    );

    setState((current) => ({
      ...current,
      totalDays: pricing.totalDays,
      pricing,
    }));
  }, [extrasPricing, state.endDate, state.extras, state.startDate, vehicle]);

  function setStep(step: number) {
    setState((current) => ({ ...current, step }));
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

  function setPromoCode(code: string) {
    setPromoError(null);
    setState((current) => ({ ...current, promoCode: code }));
  }

  return (
    <BookingContext.Provider
      value={{
        state,
        promoError,
        setPromoCode,
        setStep,
        updateDates,
        updateLocation,
        toggleExtra,
        setDocumentStatus,
        setDocumentVerificationStatus,
        setPricing,
        vehicle,
        extrasPricing,
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
