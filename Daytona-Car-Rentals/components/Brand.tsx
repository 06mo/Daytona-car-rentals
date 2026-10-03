import Image from "next/image";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={`brand-lockup ${light ? "brand-light" : ""}`}>
      <Image src="/brand/mark.svg" width={50} height={42} alt="" />
      <span>
        DAYTONA<small>CAR RENTALS</small>
      </span>
    </span>
  );
}
