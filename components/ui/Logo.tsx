import Image from "next/image";
import iconSrc from "@/app/icons/favicon-96x96.png";

interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export function Logo({ collapsed, className }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 overflow-hidden ${className ?? ""}`}>
      <Image
        src={iconSrc}
        alt="DevLeep"
        width={28}
        height={28}
        className="shrink-0 object-contain"
        priority
      />
      {!collapsed && (
        <span className="font-mono font-bold text-sm text-white tracking-tight whitespace-nowrap">
          DevLeep
        </span>
      )}
    </div>
  );
}
