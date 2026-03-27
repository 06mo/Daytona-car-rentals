"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SignaturePad } from "@/components/admin/SignaturePad";
import { Button } from "@/components/ui/Button";
import { uploadFileWithProgress } from "@/lib/firebase/client-storage";
import type { ChecklistType, FuelLevel, VehicleChecklist } from "@/types";

const fuelLevels: FuelLevel[] = ["empty", "quarter", "half", "three_quarter", "full"];

function formatFuelLevel(value: FuelLevel) {
  return value.replaceAll("_", " ");
}

export function ChecklistForm({
  bookingId,
  checklist,
  type,
  vehicleLabel,
}: {
  bookingId: string;
  checklist: VehicleChecklist | null;
  type: ChecklistType;
  vehicleLabel: string;
}) {
  const router = useRouter();
  const [fuelLevel, setFuelLevel] = useState<FuelLevel>(checklist?.fuelLevel ?? "full");
  const [odometerMiles, setOdometerMiles] = useState(String(checklist?.odometerMiles ?? ""));
  const [conditionNotes, setConditionNotes] = useState(checklist?.conditionNotes ?? "");
  const [damageNoted, setDamageNoted] = useState(checklist?.damageNoted ?? false);
  const [damageDescription, setDamageDescription] = useState(checklist?.damageDescription ?? "");
  const [photoRefs, setPhotoRefs] = useState<string[]>(checklist?.photoRefs ?? []);
  const [adminSignature, setAdminSignature] = useState<string | undefined>(checklist?.adminSignature);
  const [customerSignature, setCustomerSignature] = useState<string | undefined>(checklist?.customerSignature);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isSubmitted = checklist?.status === "submitted";
  const submitLabel = type === "pickup" ? "Submit & Mark Active" : "Submit & Mark Completed";
  const statusLabel = checklist?.status ?? "draft";
  const helperText = useMemo(
    () => (type === "pickup" ? "Complete this before releasing the vehicle." : "Complete this before closing the rental."),
    [type],
  );

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadedRefs: string[] = [];

      for (const file of Array.from(files).slice(0, Math.max(0, 10 - photoRefs.length))) {
        const safeName = `${Date.now()}-${file.name.replaceAll(/\s+/g, "-")}`;
        const result = await uploadFileWithProgress({
          file,
          path: `bookings/${bookingId}/checklists/${type}/photos/${safeName}`,
        });
        uploadedRefs.push(result.storageRef);
      }

      setPhotoRefs((current) => [...current, ...uploadedRefs].slice(0, 10));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload checklist photos.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(status: "draft" | "submitted") {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/checklists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          fuelLevel,
          odometerMiles: Number(odometerMiles),
          conditionNotes,
          damageNoted,
          damageDescription: damageDescription || undefined,
          photoRefs,
          adminSignature,
          customerSignature,
          status,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save checklist.");
      }

      router.push(`/admin/bookings/${bookingId}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save checklist.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">{type === "pickup" ? "Pickup checklist" : "Dropoff checklist"} for {vehicleLabel}</p>
        <p className="mt-1">{helperText}</p>
        <p className="mt-1">Current status: <span className="font-semibold capitalize">{statusLabel}</span></p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Fuel level
          <select
            className="h-11 rounded-2xl border border-slate-300 px-4"
            disabled={isSubmitted}
            onChange={(event) => setFuelLevel(event.target.value as FuelLevel)}
            value={fuelLevel}
          >
            {fuelLevels.map((level) => (
              <option key={level} value={level}>{formatFuelLevel(level)}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Odometer miles
          <input
            className="h-11 rounded-2xl border border-slate-300 px-4"
            disabled={isSubmitted}
            min={0}
            onChange={(event) => setOdometerMiles(event.target.value)}
            type="number"
            value={odometerMiles}
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Condition notes
        <textarea
          className="min-h-28 rounded-3xl border border-slate-300 px-4 py-3"
          disabled={isSubmitted}
          onChange={(event) => setConditionNotes(event.target.value)}
          value={conditionNotes}
        />
      </label>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium text-slate-700">Damage noted?</p>
        <div className="mt-3 flex gap-3">
          <Button disabled={isSubmitted} onClick={() => setDamageNoted(false)} type="button" variant={!damageNoted ? "primary" : "secondary"}>
            No
          </Button>
          <Button disabled={isSubmitted} onClick={() => setDamageNoted(true)} type="button" variant={damageNoted ? "primary" : "secondary"}>
            Yes
          </Button>
        </div>
        {damageNoted ? (
          <textarea
            className="mt-4 min-h-24 w-full rounded-3xl border border-slate-300 px-4 py-3"
            disabled={isSubmitted}
            onChange={(event) => setDamageDescription(event.target.value)}
            placeholder="Describe the damage or condition concern"
            value={damageDescription}
          />
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Photos</p>
            <p className="mt-1 text-xs text-slate-500">Upload up to 10 condition photos.</p>
          </div>
          <label className={`inline-flex cursor-pointer items-center rounded-full px-4 py-2 text-sm font-semibold ${isSubmitted ? "bg-slate-100 text-slate-400" : "bg-slate-900 text-white"}`}>
            Add Photos
            <input className="hidden" disabled={isSubmitted || uploading} multiple onChange={(event) => uploadPhotos(event.target.files)} type="file" />
          </label>
        </div>
        {uploading ? <p className="mt-3 text-sm text-slate-500">Uploading photos...</p> : null}
        {photoRefs.length > 0 ? (
          <div className="mt-4 grid gap-2 text-xs text-slate-500">
            {photoRefs.map((photoRef) => (
              <p key={photoRef} className="truncate">{photoRef}</p>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No photos attached yet.</p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SignaturePad disabled={isSubmitted} label="Admin signature" onChange={setAdminSignature} value={adminSignature} />
        <SignaturePad disabled={isSubmitted} label="Customer signature" onChange={setCustomerSignature} value={customerSignature} />
      </div>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap justify-end gap-3">
        <Button asChild type="button" variant="secondary" href={`/admin/bookings/${bookingId}`}>
          Back to Booking
        </Button>
        {!isSubmitted ? (
          <>
            <Button disabled={saving} onClick={() => submit("draft")} type="button" variant="secondary">
              Save Draft
            </Button>
            <Button disabled={saving} onClick={() => submit("submitted")} type="button">
              {submitLabel}
            </Button>
          </>
        ) : (
          <Link className="text-sm font-semibold text-slate-600" href={`/admin/bookings/${bookingId}`}>
            Checklist submitted
          </Link>
        )}
      </div>
    </div>
  );
}
