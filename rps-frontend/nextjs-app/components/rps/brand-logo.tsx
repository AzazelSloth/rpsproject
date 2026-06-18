import Image from "next/image";
import logoIcone from "@/app/logoIcone.png";

export function BrandLogo({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const dimensions = compact
    ? { width: 144, height: 80, sizes: "144px" }
    : { width: 188, height: 105, sizes: "188px" };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <Image
        src={logoIcone}
        alt="Laroche360"
        width={dimensions.width}
        height={dimensions.height}
        sizes={dimensions.sizes}
        className="h-auto max-w-full"
      />
    </div>
  );
}
