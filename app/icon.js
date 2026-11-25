import { ImageResponse } from "next/og";
import { AppIcon } from "@/lib/appIcon";

export const contentType = "image/png";

export function generateImageMetadata() {
  return [
    { id: "192", size: { width: 192, height: 192 }, contentType },
    { id: "512", size: { width: 512, height: 512 }, contentType },
  ];
}

export default async function Icon({ id }) {
  const size = Number(await id);
  return new ImageResponse(<AppIcon size={size} />, { width: size, height: size });
}
