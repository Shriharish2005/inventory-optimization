import { Link } from "react-router";
import { Boxes } from "lucide-react";

const FullLogo = () => {
  return (
    <Link to={"/"} className="flex items-center gap-2.5 max-w-[40px] lg:max-w-none overflow-hidden">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
        <Boxes className="size-4.5" strokeWidth={2} />
      </span>
      <span className="hidden lg:flex flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground">Inventory</span>
        <span className="text-xs text-muted-foreground -mt-0.5">Planning</span>
      </span>
    </Link>
  );
};

export default FullLogo;
