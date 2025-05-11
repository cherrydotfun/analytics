import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TokenRugScoreCard({
  rugCheckScore,
  ddXyzScore,
  cherryDumpRisk,          // 0‥1  (probDump1h from /api/score/)
  ...props
}: {
  rugCheckScore: number | null;
  ddXyzScore:   number | null;
  cherryDumpRisk: number | null;
}) {
  /* helper to map risk → label */
  const label = (v: number | null, scale: "external" | "cherry") => {
    if (v === null) return "Risk unknown";
    if (scale === "cherry") {
      return v >= 0.6 ? "High" : v >= 0.3 ? "Medium" : "Low";
    }
    // RugCheck / DD.xyz thresholds
    return v > 50
      ? "High"
      : v > 20
      ? "Medium"
      : v > 0
      ? "Low"
      : "Appears safe";
  };

  return (
    <TooltipProvider>
      <Card className="w-full h-full" {...props}>
        <CardHeader>
          <CardTitle>Rug risk</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4">
          {/* RugCheck */}
          <div className="flex justify-between">
            <div>RugCheck</div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>{label(rugCheckScore, "external")}</div>
              </TooltipTrigger>
              <TooltipContent>
                <p>RugCheck score: {rugCheckScore ?? "NA"}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* DD.xyz */}
          <div className="flex justify-between">
            <div>DD.xyz</div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>{label(ddXyzScore, "external")}</div>
              </TooltipTrigger>
              <TooltipContent>
                <p>DD.xyz score: {ddXyzScore ?? "NA"}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Cherry.fun dump risk */}
          <div className="flex justify-between font-medium">
            <div className="flex items-center gap-1">
              <span className="text-amber">Cherry.fun</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={
                  cherryDumpRisk === null
                    ? ""
                    : cherryDumpRisk >= 0.6
                    ? "text-destructive"
                    : cherryDumpRisk >= 0.3
                    ? "text-orange-500"
                    : "text-emerald-600"
                }>
                  {label(cherryDumpRisk, "cherry")}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Dump probability (next 1h):{" "}
                  {cherryDumpRisk !== null
                    ? `${(cherryDumpRisk * 100).toFixed(0)}%`
                    : "NA"}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
