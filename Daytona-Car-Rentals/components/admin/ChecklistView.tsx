"use client";

import { getDownloadURL, ref } from "firebase/storage";
import { useEffect, useState } from "react";

import { getClientServices } from "@/lib/firebase/client";
import type { VehicleChecklist } from "@/types";

function formatFuelLevel(value: VehicleChecklist["fuelLevel"]) {
  return value.replaceAll("_", " ");
}

export function ChecklistView({ checklist }: { checklist: VehicleChecklist }) {
  const [resolvedPhotoUrls, setResolvedPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function resolvePhotos() {
      const services = getClientServices();

      if (!services) {
        if (!cancelled) {
          setResolvedPhotoUrls(checklist.photoRefs);
        }
        return;
      }

      const urls = await Promise.all(
        checklist.photoRefs.map(async (photoRef) => {
          if (photoRef.startsWith("data:") || photoRef.startsWith("http")) {
            return photoRef;
          }

          try {
            return await getDownloadURL(ref(services.storage, photoRef));
          } catch {
            return photoRef;
          }
        }),
      );

      if (!cancelled) {
        setResolvedPhotoUrls(urls);
      }
    }

    resolvePhotos();

    return () => {
      cancelled = true;
    };
  }, [checklist.photoRefs]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Fuel level</p>
          <p className="mt-2 text-base font-semibold capitalize text-slate-900">{formatFuelLevel(checklist.fuelLevel)}</p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Odometer</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{checklist.odometerMiles.toLocaleString()} miles</p>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-500">Condition notes</p>
        <p className="mt-2 text-sm text-slate-700">{checklist.conditionNotes || "No notes recorded."}</p>
      </div>

      <div className="rounded-3xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-500">Damage</p>
        <p className="mt-2 text-sm text-slate-700">
          {checklist.damageNoted ? checklist.damageDescription ?? "Damage noted." : "No damage noted."}
        </p>
      </div>

      <div className="rounded-3xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-500">Photos</p>
        {resolvedPhotoUrls.length > 0 ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {resolvedPhotoUrls.map((photoUrl) => (
              <img key={photoUrl} alt="Checklist vehicle condition" className="h-40 w-full rounded-2xl object-cover" src={photoUrl} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-700">No photos attached.</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Admin signature</p>
          {checklist.adminSignature ? (
            <img alt="Admin signature" className="mt-3 h-28 w-full rounded-2xl border border-slate-200 bg-white object-contain" src={checklist.adminSignature} />
          ) : (
            <p className="mt-2 text-sm text-slate-700">Not captured.</p>
          )}
        </div>
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Customer signature</p>
          {checklist.customerSignature ? (
            <img alt="Customer signature" className="mt-3 h-28 w-full rounded-2xl border border-slate-200 bg-white object-contain" src={checklist.customerSignature} />
          ) : (
            <p className="mt-2 text-sm text-slate-700">Not captured.</p>
          )}
        </div>
      </div>
    </div>
  );
}
