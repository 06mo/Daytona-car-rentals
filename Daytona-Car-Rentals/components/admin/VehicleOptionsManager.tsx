"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getClientServices } from "@/lib/firebase/client";
import { defaultVehicleFeaturePresets, defaultVehicleLocations } from "@/lib/data/vehicleOptions";

type VehicleOptionsState = {
  featurePresets: string[];
  locations: string[];
};

function normalizeValues(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

export function VehicleOptionsManager() {
  const [options, setOptions] = useState<VehicleOptionsState>({
    featurePresets: defaultVehicleFeaturePresets,
    locations: defaultVehicleLocations,
  });
  const [newFeature, setNewFeature] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const currentUser = getClientServices()?.auth.currentUser;
        const token = currentUser ? await currentUser.getIdToken() : "";

        if (!token) {
          throw new Error("Sign in is required before loading fleet options.");
        }

        const response = await fetch("/api/admin/vehicle-options", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = (await response.json()) as { error?: string; options?: VehicleOptionsState };

        if (!response.ok || !data.options) {
          throw new Error(data.error ?? "Vehicle options could not be loaded.");
        }

        if (!cancelled) {
          setOptions({
            featurePresets: data.options.featurePresets,
            locations: data.options.locations,
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Vehicle options could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasLocations = options.locations.length > 0;
  const hasFeaturePresets = options.featurePresets.length > 0;
  const featureCountLabel = useMemo(() => `${options.featurePresets.length} preset${options.featurePresets.length === 1 ? "" : "s"}`, [options.featurePresets.length]);
  const locationCountLabel = useMemo(() => `${options.locations.length} location${options.locations.length === 1 ? "" : "s"}`, [options.locations.length]);

  function addLocation() {
    if (!newLocation.trim()) {
      return;
    }

    setOptions((current) => ({
      ...current,
      locations: normalizeValues([...current.locations, newLocation]),
    }));
    setNewLocation("");
    setError(null);
  }

  function addFeaturePreset() {
    if (!newFeature.trim()) {
      return;
    }

    setOptions((current) => ({
      ...current,
      featurePresets: normalizeValues([...current.featurePresets, newFeature]),
    }));
    setNewFeature("");
    setError(null);
  }

  function removeLocation(location: string) {
    setOptions((current) => ({
      ...current,
      locations: current.locations.filter((item) => item !== location),
    }));
  }

  function removeFeaturePreset(feature: string) {
    setOptions((current) => ({
      ...current,
      featurePresets: current.featurePresets.filter((item) => item !== feature),
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      const currentUser = getClientServices()?.auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : "";

      if (!token) {
        throw new Error("Sign in is required before saving fleet options.");
      }

      const response = await fetch("/api/admin/vehicle-options", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          featurePresets: options.featurePresets,
          locations: options.locations,
        }),
      });
      const data = (await response.json()) as { error?: string; options?: VehicleOptionsState };

      if (!response.ok || !data.options) {
        throw new Error(data.error ?? "Vehicle options could not be saved.");
      }

      setOptions({
        featurePresets: data.options.featurePresets,
        locations: data.options.locations,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Vehicle options could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Pick-up Locations</h2>
              <p className="mt-1 text-sm text-slate-500">These power the homepage, fleet filters, booking flow, and vehicle detail location selectors.</p>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">{locationCountLabel}</span>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Input
              className="flex-1"
              label="Add location"
              onChange={(event) => setNewLocation(event.target.value)}
              placeholder="Daytona Beach Shores"
              value={newLocation}
            />
            <Button className="sm:mt-[30px]" onClick={addLocation} type="button" variant="secondary">
              Add
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {hasLocations ? (
              options.locations.map((location) => (
                <button
                  key={location}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  onClick={() => removeLocation(location)}
                  type="button"
                >
                  {location} <span className="text-slate-400">×</span>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500">No locations added yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Feature Presets</h2>
              <p className="mt-1 text-sm text-slate-500">These appear as easy toggles in the vehicle form so you do not have to retype common features every time.</p>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">{featureCountLabel}</span>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Input
              className="flex-1"
              label="Add feature preset"
              onChange={(event) => setNewFeature(event.target.value)}
              placeholder="Panoramic Sunroof"
              value={newFeature}
            />
            <Button className="sm:mt-[30px]" onClick={addFeaturePreset} type="button" variant="secondary">
              Add
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {hasFeaturePresets ? (
              options.featurePresets.map((feature) => (
                <button
                  key={feature}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  onClick={() => removeFeaturePreset(feature)}
                  type="button"
                >
                  {feature} <span className="text-slate-400">×</span>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500">No feature presets added yet.</p>
            )}
          </div>
        </section>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading fleet options...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex justify-end">
        <Button loading={saving} onClick={handleSave} type="button">
          Save Fleet Options
        </Button>
      </div>
    </div>
  );
}
