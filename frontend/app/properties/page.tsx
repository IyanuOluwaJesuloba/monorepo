"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Heart,
  MapPin,
  Bed,
  Bath,
  Square,
  Search,
  SlidersHorizontal,
  Home,
  SearchX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { allProperties, propertyFilters } from "@/lib/mockData";

const properties = allProperties;
const locations = propertyFilters.locations;
const priceRanges = propertyFilters.priceRanges;
const bedOptions = propertyFilters.bedOptions;
const bathOptions = ["Any", "1", "2", "3", "4+"];

function formatNgn(price: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(price);
}

function parseNumberOrUndefined(v: string | null) {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseCsv(v: string | null) {
  if (!v) return [] as string[];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function PropertiesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const minMaxPrice = useMemo(() => {
    const prices = properties.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max };
  }, []);

  const [favorites, setFavorites] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [selectedLocation, setSelectedLocation] = useState(
    () => searchParams.get("loc") ?? "All Locations",
  );
  const [priceRange, setPriceRange] = useState<[number, number]>(() => [
    parseNumberOrUndefined(searchParams.get("min")) ?? minMaxPrice.min,
    parseNumberOrUndefined(searchParams.get("max")) ?? minMaxPrice.max,
  ]);
  const [selectedBeds, setSelectedBeds] = useState(
    () => searchParams.get("beds") ?? "Any",
  );
  const [selectedBaths, setSelectedBaths] = useState(
    () => searchParams.get("baths") ?? "Any",
  );
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    () => parseCsv(searchParams.get("am")),
  );
  const [showFilters, setShowFilters] = useState(false);

  const allAmenities = useMemo(() => {
    const set = new Set<string>();
    for (const p of properties) {
      for (const f of p.features ?? []) set.add(f);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, []);

  const locationSuggestions = useMemo(() => {
    const allLocations = Array.from(
      new Set(properties.map((p) => p.location).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return allLocations
      .filter((l) => l.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchQuery]);

  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);

    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    else params.delete("q");

    if (selectedLocation && selectedLocation !== "All Locations")
      params.set("loc", selectedLocation);
    else params.delete("loc");

    if (selectedBeds && selectedBeds !== "Any") params.set("beds", selectedBeds);
    else params.delete("beds");

    if (selectedBaths && selectedBaths !== "Any") params.set("baths", selectedBaths);
    else params.delete("baths");

    if (priceRange[0] !== minMaxPrice.min) params.set("min", String(priceRange[0]));
    else params.delete("min");

    if (priceRange[1] !== minMaxPrice.max) params.set("max", String(priceRange[1]));
    else params.delete("max");

    if (selectedAmenities.length > 0) params.set("am", selectedAmenities.join(","));
    else params.delete("am");

    const next = params.toString();
    const current = searchParamsString;
    if (next !== current) {
      const url = next ? `${pathname}?${next}` : pathname;
      router.replace(url, { scroll: false });
    }
  }, [
    debouncedQuery,
    searchQuery,
    selectedLocation,
    selectedBeds,
    selectedBaths,
    priceRange,
    selectedAmenities,
    minMaxPrice.min,
    minMaxPrice.max,
    pathname,
    router,
    searchParamsString,
  ]);

  const showResultsLoading = searchQuery !== debouncedQuery;

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id],
    );
  };

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      property.location.toLowerCase().includes(debouncedQuery.toLowerCase());

    const matchesLocation =
      selectedLocation === "All Locations" ||
      property.location.includes(selectedLocation);

    const matchesPrice =
      property.price >= priceRange[0] && property.price <= priceRange[1];

    let matchesBeds = true;
    if (selectedBeds !== "Any") {
      if (selectedBeds === "4+") matchesBeds = property.beds >= 4;
      else matchesBeds = property.beds === Number.parseInt(selectedBeds);
    }

    let matchesBaths = true;
    if (selectedBaths !== "Any") {
      if (selectedBaths === "4+") matchesBaths = property.baths >= 4;
      else matchesBaths = property.baths === Number.parseInt(selectedBaths);
    }

    const matchesAmenities =
      selectedAmenities.length === 0 ||
      selectedAmenities.every((a) => (property.features ?? []).includes(a));

    return (
      matchesSearch &&
      matchesLocation &&
      matchesPrice &&
      matchesBeds &&
      matchesBaths &&
      matchesAmenities
    );
  });

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Header */}
      <section className="border-b-3 border-foreground bg-muted py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h1 className="mb-4 font-mono text-3xl font-black md:text-5xl">
            Find Your <span className="text-primary">Perfect Home</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Browse through our collection of verified rental properties. All
            listings come with our rent-now-pay-later option.
          </p>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="border-b-3 border-foreground bg-card py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by location or property name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-3 border-foreground bg-background pl-12 py-6 font-medium shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
              />

              {locationSuggestions.length > 0 && (
                <div className="absolute top-full z-20 mt-2 w-full overflow-hidden border-3 border-foreground bg-background shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                  {locationSuggestions.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        setSearchQuery(loc);
                        setSelectedLocation(loc);
                      }}
                      className="flex w-full items-center justify-between border-b-2 border-foreground/20 px-4 py-3 text-left text-sm font-medium hover:bg-muted"
                    >
                      <span>{loc}</span>
                      <span className="text-xs text-muted-foreground">Use as location</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={() => setShowFilters(!showFilters)}
              className="border-3 border-foreground bg-background px-6 py-6 font-bold text-foreground shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] md:w-auto"
            >
              <SlidersHorizontal className="mr-2 h-5 w-5" />
              Filters
              {(selectedLocation !== "All Locations" ||
                selectedBeds !== "Any" ||
                selectedBaths !== "Any" ||
                selectedAmenities.length > 0 ||
                priceRange[0] !== minMaxPrice.min ||
                priceRange[1] !== minMaxPrice.max) && (
                <span className="ml-2 flex h-6 w-6 items-center justify-center bg-primary text-xs font-bold">
                  {
                    [
                      selectedLocation !== "All Locations",
                      selectedBeds !== "Any",
                      selectedBaths !== "Any",
                      selectedAmenities.length > 0,
                      priceRange[0] !== minMaxPrice.min ||
                        priceRange[1] !== minMaxPrice.max,
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </Button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-6 border-3 border-foreground bg-background p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-mono text-lg font-bold">
                  Filter Properties
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedLocation("All Locations");
                    setSelectedBeds("Any");
                    setSelectedBaths("Any");
                    setSelectedAmenities([]);
                    setPriceRange([minMaxPrice.min, minMaxPrice.max]);
                  }}
                  className="text-sm underline"
                >
                  Clear All
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <p className="mb-2 block font-mono text-sm font-bold">Location</p>
                  <div className="flex flex-wrap gap-2">
                    {locations.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => setSelectedLocation(loc)}
                        className={`border-2 border-foreground px-3 py-2 text-sm font-medium transition-all ${
                          selectedLocation === loc
                            ? "bg-foreground text-background"
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 block font-mono text-sm font-bold">
                    Price Range (Annual)
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{formatNgn(priceRange[0])}</span>
                      <span className="font-medium">{formatNgn(priceRange[1])}</span>
                    </div>
                    <Slider
                      value={priceRange}
                      min={minMaxPrice.min}
                      max={minMaxPrice.max}
                      step={50000}
                      onValueChange={(v) => setPriceRange(v as [number, number])}
                    />
                    <div className="flex flex-wrap gap-2">
                      {priceRanges.map((range) => {
                        const isActive =
                          (range === "Any Price" &&
                            priceRange[0] === minMaxPrice.min &&
                            priceRange[1] === minMaxPrice.max) ||
                          (range === "Under ₦2M" &&
                            priceRange[0] === minMaxPrice.min &&
                            priceRange[1] === 2000000) ||
                          (range === "₦2M - ₦5M" &&
                            priceRange[0] === 2000000 &&
                            priceRange[1] === 5000000) ||
                          (range === "₦5M - ₦10M" &&
                            priceRange[0] === 5000000 &&
                            priceRange[1] === 10000000) ||
                          (range === "Above ₦10M" &&
                            priceRange[0] === 10000000 &&
                            priceRange[1] === minMaxPrice.max);

                        return (
                          <button
                            key={range}
                            onClick={() => {
                              if (range === "Any Price")
                                setPriceRange([minMaxPrice.min, minMaxPrice.max]);
                              else if (range === "Under ₦2M")
                                setPriceRange([minMaxPrice.min, 2000000]);
                              else if (range === "₦2M - ₦5M")
                                setPriceRange([2000000, 5000000]);
                              else if (range === "₦5M - ₦10M")
                                setPriceRange([5000000, 10000000]);
                              else if (range === "Above ₦10M")
                                setPriceRange([10000000, minMaxPrice.max]);
                            }}
                            className={`border-2 border-foreground px-3 py-2 text-sm font-medium transition-all ${
                              isActive
                                ? "bg-foreground text-background"
                                : "bg-background hover:bg-muted"
                            }`}
                          >
                            {range}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 block font-mono text-sm font-bold">Beds / Baths</p>
                  <div className="grid gap-3">
                    <Select value={selectedBeds} onValueChange={setSelectedBeds}>
                      <SelectTrigger className="w-full border-3 border-foreground bg-background shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                        <SelectValue placeholder="Beds" />
                      </SelectTrigger>
                      <SelectContent>
                        {bedOptions.map((beds) => (
                          <SelectItem key={beds} value={beds}>
                            {beds === "Any"
                              ? "Any beds"
                              : `${beds} bed${beds === "1" ? "" : "s"}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedBaths} onValueChange={setSelectedBaths}>
                      <SelectTrigger className="w-full border-3 border-foreground bg-background shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                        <SelectValue placeholder="Baths" />
                      </SelectTrigger>
                      <SelectContent>
                        {bathOptions.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b === "Any"
                              ? "Any baths"
                              : `${b} bath${b === "1" ? "" : "s"}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button className="w-full border-3 border-foreground bg-background font-bold text-foreground shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                          Amenities
                          {selectedAmenities.length > 0 && (
                            <span className="ml-2 flex h-6 w-6 items-center justify-center bg-primary text-xs font-bold">
                              {selectedAmenities.length}
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 border-3 border-foreground bg-background p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="font-mono text-sm font-bold">Select amenities</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAmenities([])}
                            className="text-sm underline"
                          >
                            Clear
                          </Button>
                        </div>
                        <div className="max-h-64 space-y-2 overflow-auto pr-1">
                          {allAmenities.map((a) => {
                            const checked = selectedAmenities.includes(a);
                            return (
                              <label
                                key={a}
                                className="flex cursor-pointer items-center gap-3 border-2 border-foreground/20 bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => {
                                    const next = Boolean(v);
                                    setSelectedAmenities((prev) =>
                                      next
                                        ? Array.from(new Set([...prev, a]))
                                        : prev.filter((x) => x !== a),
                                    );
                                  }}
                                />
                                <span>{a}</span>
                              </label>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-muted-foreground">
              Showing{" "}
              <span className="font-bold text-foreground">
                {filteredProperties.length}
              </span>{" "}
              properties
            </p>
          </div>

          {filteredProperties.length === 0 ? (
            <div className="border-3 border-foreground bg-muted p-12 text-center shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <SearchX className="mx-auto h-16 w-16 text-muted-foreground" />
              <p className="font-mono text-xl font-bold mb-2 mt-4">
                No properties found
              </p>
              <p className="text-muted-foreground">
                Try adjusting your filters or search query.
              </p>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedLocation("All Locations");
                  setSelectedBeds("Any");
                  setSelectedBaths("Any");
                  setSelectedAmenities([]);
                  setPriceRange([minMaxPrice.min, minMaxPrice.max]);
                }}
                className="mt-6 border-3 border-foreground bg-primary font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {showResultsLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="group border-3 border-foreground bg-card p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
                    >
                      <Skeleton className="mb-4 aspect-4/3 w-full" />
                      <Skeleton className="h-5 w-4/5" />
                      <Skeleton className="mt-3 h-4 w-2/3" />
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                      <Skeleton className="mt-6 h-10 w-full" />
                    </div>
                  ))
                : filteredProperties.map((property) => (
                    <div
                      key={property.id}
                      className="group border-3 border-foreground bg-card shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                    >
                      <div className="relative aspect-4/3 border-b-3 border-foreground bg-muted">
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <Home className="h-12 w-12" />
                        </div>
                        {property.tag && (
                          <span
                            className={`absolute left-3 top-3 border-2 border-foreground ${property.tagColor} px-2 py-1 text-xs font-bold`}
                          >
                            {property.tag}
                          </span>
                        )}
                        <button
                          onClick={() => toggleFavorite(property.id)}
                          className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center border-2 border-foreground bg-background transition-colors ${
                            favorites.includes(property.id)
                              ? "text-destructive"
                              : ""
                          }`}
                        >
                          <Heart
                            className={`h-5 w-5 ${favorites.includes(property.id) ? "fill-current" : ""}`}
                          />
                        </button>
                      </div>

                      <div className="p-4">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="font-mono text-lg font-bold leading-tight">
                            {property.title}
                          </h3>
                        </div>

                        <div className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{property.location}</span>
                        </div>

                        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Bed className="h-4 w-4" />
                            {property.beds}
                          </span>
                          <span className="flex items-center gap-1">
                            <Bath className="h-4 w-4" />
                            {property.baths}
                          </span>
                          <span className="flex items-center gap-1">
                            <Square className="h-4 w-4" />
                            {property.sqm}m²
                          </span>
                        </div>

                        {/* Whistleblower Info */}
                        {property.whistleblower && (
                          <div className="mb-3 bg-secondary/20 border-2 border-secondary px-3 py-2">
                            <p className="text-xs font-bold text-secondary mb-1">
                              Reported by Resident
                            </p>
                            <p className="text-sm font-bold">
                              {property.whistleblower.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {property.whistleblower.rating}⭐ (
                              {property.whistleblower.reviews} reviews)
                            </p>
                          </div>
                        )}

                        <div className="border-t-2 border-dashed border-foreground/30 pt-4">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Annual Rent
                              </p>
                              <p className="font-mono text-xl font-black">
                                {formatNgn(property.price)}
                              </p>
                            </div>
                            <Link href={`/properties/${property.id}`}>
                              <Button className="border-2 border-foreground bg-primary px-4 py-2 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)]">
                                View
                              </Button>
                            </Link>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            From{" "}
                            <span className="font-bold text-primary">
                              {formatNgn(Math.round(property.price / 12))}/mo
                            </span>{" "}
                            with Sheltaflex
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        From{" "}
                        <span className="font-bold text-primary">
                          {formatPrice(Math.round(property.price / 12))}/mo
                        </span>{" "}
                        with Shelterflex
                      </p>
                    </div>
                  ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
