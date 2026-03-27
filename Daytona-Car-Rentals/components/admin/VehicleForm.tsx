"use client";

import Image from "next/image";
import { useMemo, useState, type ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { uploadFileWithProgress } from "@/lib/firebase/client-storage";
import { getClientServices } from "@/lib/firebase/client";
import type { Vehicle, VehicleCategory } from "@/types";

const vehicleFormSchema = z.object({
  make: z.string().trim().min(1, "Make is required."),
  model: z.string().trim().min(1, "Model is required."),
  year: z.coerce.number().int().min(2000, "Enter a valid year."),
  category: z.enum(["economy", "suv", "luxury", "van", "truck", "convertible"]),
  dailyRate: z.coerce.number().min(1, "Daily rate is required."),
  depositAmount: z.coerce.number().min(0, "Deposit is required."),
  seats: z.coerce.number().int().min(1, "Seats must be at least 1."),
  transmission: z.enum(["automatic", "manual"]),
  mileagePolicyMode: z.enum(["unlimited", "limited"]),
  mileagePolicyValue: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      return value;
    },
    z.coerce.number().int().min(1, "Mileage limit must be at least 1.").optional(),
  ),
  location: z.string().trim().min(1, "Location is required."),
  description: z.string().trim().min(20, "Description should be at least 20 characters."),
  featuresText: z.string().trim().min(1, "Add at least one feature."),
  available: z.boolean().default(true),
}).superRefine((value, context) => {
  if (value.mileagePolicyMode === "limited" && !value.mileagePolicyValue) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["mileagePolicyValue"],
      message: "Mileage limit is required when policy is limited.",
    });
  }
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
type VehicleFormInput = z.input<typeof vehicleFormSchema>;

const categoryOptions: VehicleCategory[] = ["economy", "suv", "luxury", "van", "truck", "convertible"];

function toFormValues(vehicle?: Vehicle): VehicleFormValues {
  return {
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    year: vehicle?.year ?? new Date().getFullYear(),
    category: vehicle?.category ?? "economy",
    dailyRate: vehicle ? vehicle.dailyRate / 100 : 99,
    depositAmount: vehicle ? vehicle.depositAmount / 100 : 200,
    seats: vehicle?.seats ?? 5,
    transmission: vehicle?.transmission ?? "automatic",
    mileagePolicyMode: vehicle?.mileagePolicy === "unlimited" ? "unlimited" : "limited",
    mileagePolicyValue: typeof vehicle?.mileagePolicy === "number" ? vehicle.mileagePolicy : undefined,
    location: vehicle?.location ?? "",
    description: vehicle?.description ?? "",
    featuresText: vehicle?.features.join(", ") ?? "",
    available: vehicle?.available ?? true,
  };
}

export function VehicleForm({ vehicle }: { vehicle?: Vehicle | null }) {
  const router = useRouter();
  const [draftVehicleId] = useState(() => vehicle?.id ?? `vehicle-${Date.now().toString(36)}`);
  const [imageUrls, setImageUrls] = useState<string[]>(vehicle?.images ?? []);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<VehicleFormInput, unknown, VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: toFormValues(vehicle ?? undefined),
    shouldUnregister: true,
  });

  const mileagePolicyMode = watch("mileagePolicyMode");
  const uploadEntries = useMemo(() => Object.entries(uploadProgress), [uploadProgress]);

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    if (imageUrls.length + files.length > 5) {
      setSubmitError("You can upload up to 5 images per vehicle.");
      return;
    }

    setSubmitError(null);

    try {
      await Promise.all(
        files.map(async (file) => {
          const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");
          const storagePath = `vehicles/${draftVehicleId}/${Date.now()}-${safeFileName}`;
          const uploadKey = `${file.name}-${file.size}`;
          const { downloadURL } = await uploadFileWithProgress({
            file,
            path: storagePath,
            onProgress: (progress) => {
              setUploadProgress((current) => ({ ...current, [uploadKey]: progress }));
            },
          });

          setImageUrls((current) => [...current, downloadURL].slice(0, 5));
          setUploadProgress((current) => {
            const next = { ...current };
            delete next[uploadKey];
            return next;
          });
        }),
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      event.target.value = "";
    }
  }

  function removeImage(url: string) {
    setImageUrls((current) => current.filter((imageUrl) => imageUrl !== url));
  }

  async function onSubmit(values: VehicleFormValues) {
    try {
      setSubmitting(true);
      setSubmitError(null);

      const currentUser = getClientServices()?.auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : "";

      if (!token) {
        throw new Error("Sign in is required before saving a vehicle.");
      }

      const features = values.featuresText
        .split(",")
        .map((feature) => feature.trim())
        .filter(Boolean);

      if (features.length === 0) {
        throw new Error("Add at least one feature.");
      }

      if (imageUrls.length === 0) {
        throw new Error("Upload at least one vehicle image.");
      }

      const payload = {
        id: draftVehicleId,
        make: values.make,
        model: values.model,
        year: values.year,
        category: values.category,
        dailyRate: Math.round(values.dailyRate * 100),
        depositAmount: Math.round(values.depositAmount * 100),
        seats: values.seats,
        transmission: values.transmission,
        mileagePolicy: values.mileagePolicyMode === "unlimited" ? "unlimited" : values.mileagePolicyValue ?? 0,
        location: values.location,
        description: values.description,
        features,
        images: imageUrls,
        available: values.available,
      };

      const response = await fetch(vehicle ? `/api/admin/vehicles/${vehicle.id}` : "/api/admin/vehicles", {
        method: vehicle ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string; vehicle?: { id: string } };

      if (!response.ok || !data.vehicle) {
        throw new Error(data.error ?? "Vehicle could not be saved.");
      }

      router.push("/admin/fleet");
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Vehicle could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <Input error={errors.make?.message} label="Make" {...register("make")} />
        <Input error={errors.model?.message} label="Model" {...register("model")} />
        <Input error={errors.year?.message} label="Year" min={2000} type="number" {...register("year")} />

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Category</span>
          <select className="h-11 rounded-2xl border border-slate-300 bg-white px-4" {...register("category")}>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          {errors.category ? <span className="text-sm text-red-600">{errors.category.message}</span> : null}
        </label>

        <Input error={errors.dailyRate?.message} label="Daily Rate ($)" min={1} step="0.01" type="number" {...register("dailyRate")} />
        <Input error={errors.depositAmount?.message} label="Deposit ($)" min={0} step="0.01" type="number" {...register("depositAmount")} />
        <Input error={errors.seats?.message} label="Seats" min={1} type="number" {...register("seats")} />

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Transmission</span>
          <select className="h-11 rounded-2xl border border-slate-300 bg-white px-4" {...register("transmission")}>
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Mileage Policy</span>
          <select className="h-11 rounded-2xl border border-slate-300 bg-white px-4" {...register("mileagePolicyMode")}>
            <option value="unlimited">Unlimited</option>
            <option value="limited">Limited</option>
          </select>
        </label>

        {mileagePolicyMode === "limited" ? (
          <Input error={errors.mileagePolicyValue?.message} label="Miles per day" min={1} type="number" {...register("mileagePolicyValue")} />
        ) : (
          <div />
        )}

        <Input className="md:col-span-3" error={errors.location?.message} label="Location" {...register("location")} />

        <label className="flex flex-col gap-2 md:col-span-3">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            className="min-h-32 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
            {...register("description")}
          />
          {errors.description ? <span className="text-sm text-red-600">{errors.description.message}</span> : null}
        </label>

        <label className="flex flex-col gap-2 md:col-span-3">
          <span className="text-sm font-medium text-slate-700">Features</span>
          <textarea
            className="min-h-24 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
            placeholder="Bluetooth, Backup Camera, Apple CarPlay"
            {...register("featuresText")}
          />
          {errors.featuresText ? <span className="text-sm text-red-600">{errors.featuresText.message}</span> : null}
        </label>

        <label className="flex items-center gap-3 md:col-span-3">
          <input className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400" type="checkbox" {...register("available")} />
          <span className="text-sm font-medium text-slate-700">Available for booking</span>
        </label>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Images</h2>
            <p className="mt-1 text-sm text-slate-500">Upload up to 5 vehicle images. Download URLs are saved to Firestore.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Upload Images
            <input accept="image/*" className="hidden" multiple onChange={handleImageUpload} type="file" />
          </label>
        </div>

        {uploadEntries.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {uploadEntries.map(([key, progress]) => (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                  <span>{key.split("-")[0]}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-orange-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {imageUrls.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {imageUrls.map((url) => (
              <div key={url} className="overflow-hidden rounded-3xl border border-slate-200">
                <div className="relative aspect-video bg-slate-100">
                  <Image alt="Vehicle image" className="object-cover" fill src={url} />
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="truncate pr-3 text-xs text-slate-500">Saved image</span>
                  <button className="text-sm font-semibold text-red-600" onClick={() => removeImage(url)} type="button">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500">
            No images uploaded yet.
          </div>
        )}
      </div>

      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <div className="flex gap-3">
        <Button asChild href="/admin/fleet" variant="secondary">Cancel</Button>
        <Button disabled={submitting} type="submit">{submitting ? "Saving..." : vehicle ? "Save Vehicle" : "Create Vehicle"}</Button>
      </div>
    </form>
  );
}
