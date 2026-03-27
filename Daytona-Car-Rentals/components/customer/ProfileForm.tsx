"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { UserProfile } from "@/types";

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters.").max(80, "Display name must be 80 characters or fewer."),
  phone: z
    .string()
    .min(1, "Phone number is required.")
    .refine(isPortalPhoneNumber, "Enter a valid US phone number or E.164 number."),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required.")
    .refine((value) => {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return false;
      }

      const adultThreshold = new Date();
      adultThreshold.setFullYear(adultThreshold.getFullYear() - 18);
      return date <= adultThreshold;
    }, "You must be at least 18 years old."),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  smsOptIn: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile.displayName,
      phone: profile.phone,
      dateOfBirth: profile.dateOfBirth,
      addressLine1: profile.address?.line1 ?? "",
      addressLine2: profile.address?.line2 ?? "",
      city: profile.address?.city ?? "",
      state: profile.address?.state ?? "",
      zip: profile.address?.zip ?? "",
      smsOptIn: profile.smsOptIn ?? false,
    },
  });

  function onSubmit(values: ProfileFormValues) {
    setServerError(null);
    setSuccess(null);

    startTransition(async () => {
      const address =
        values.addressLine1 || values.addressLine2 || values.city || values.state || values.zip
          ? {
              line1: values.addressLine1 || "",
              ...(values.addressLine2 ? { line2: values.addressLine2 } : {}),
              city: values.city || "",
              state: values.state || "",
              zip: values.zip || "",
              country: "US",
            }
          : undefined;

      try {
        const response = await fetch("/api/me/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            displayName: values.displayName,
            phone: values.phone,
            dateOfBirth: values.dateOfBirth,
            address,
            smsOptIn: values.smsOptIn,
          }),
        });
        const data = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          throw new Error(data?.error ?? "Unable to save profile.");
        }

        setSuccess("Profile updated successfully.");
      } catch (error) {
        setServerError(error instanceof Error ? error.message : "Unable to save profile.");
      }
    });
  }

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      {serverError ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</p> : null}
      {success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Display name" error={form.formState.errors.displayName?.message} {...form.register("displayName")} />
        <Input label="Phone" error={form.formState.errors.phone?.message} {...form.register("phone")} />
        <Input
          label="Date of birth"
          type="date"
          error={form.formState.errors.dateOfBirth?.message}
          {...form.register("dateOfBirth")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Address line 1" {...form.register("addressLine1")} />
        <Input label="Address line 2" {...form.register("addressLine2")} />
        <Input label="City" {...form.register("city")} />
        <Input label="State" {...form.register("state")} />
        <Input label="Zip" {...form.register("zip")} />
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <input className="mt-1 h-4 w-4 accent-orange-500" type="checkbox" {...form.register("smsOptIn")} />
        <span>
          <span className="block text-sm font-medium text-slate-900">SMS updates</span>
          <span className="mt-1 block text-sm text-slate-500">
            Receive booking confirmations and pickup reminders by text message.
          </span>
        </span>
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          Save Profile
        </Button>
      </div>
    </form>
  );
}

function isPortalPhoneNumber(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/[^\d+]/g, "");
    return /^\+\d{10,15}$/.test(digits);
  }

  const digits = trimmed.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}
