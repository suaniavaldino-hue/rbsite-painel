import Image from "next/image";

import { cn } from "@/lib/utils/cn";

type LogoWordmarkProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function LogoWordmark({
  className,
  imageClassName,
  priority = false,
}: LogoWordmarkProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <Image
        src="/brand/rbsite-logo.png"
        alt="RB Site"
        width={430}
        height={96}
        priority={priority}
        className={cn(
          "h-auto w-full max-w-[14rem] object-contain md:max-w-[18rem]",
          imageClassName,
        )}
      />
    </div>
  );
}
