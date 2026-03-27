export function resolveVehicleImageUrl(imagePath: string | undefined) {
  if (!imagePath) {
    return "/images/vehicle-sedan.svg";
  }

  if (imagePath.startsWith("/") || imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  return "/images/vehicle-sedan.svg";
}
