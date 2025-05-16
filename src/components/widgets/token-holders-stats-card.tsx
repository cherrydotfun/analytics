import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Copy } from "lucide-react";
import { abbreviateAddress, abbreviateNumber } from "@/lib/formatting";
import { handleCopy } from "@/lib/utils/copy-to-clipboard";

/*  Type for clarity  */
export interface HolderRow {
  address:        string;   // full pubkey
  short:          string;   // abbreviated display
  exposurePct:    number;
  sellScore:      number;   // 0-1
  label:          string;   // Diamond / Neutral / …
  sizeX:          number;   // USD cost basis
  uPnlX:          number;   // unrealised ROI (dec)
  rPnlX:          number;   // realised ROI (dec)
  pnlDollarRatio: number;   // pnlDollarRatio the real one 
  tProfitUSD:     number;   // total profit in USD on the current token
  cashUSD:        number;
  basePF:         number | null;
  isFresh:        boolean;
  avgTotalPnlUSD: number;
  avgWinRatePct:  number;
}

/*  Main table component  */
export function HolderRiskTable({ holders }: { holders: any[] }) {
  return (
    <Table>
      <TableCaption>Live risk snapshot per top holder</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Holder</TableHead>
          <TableHead className="text-right">Supply&nbsp;%</TableHead>
          <TableHead className="text-right">Sell Probability</TableHead>
          <TableHead className="text-right">P/L&nbsp;%</TableHead>
          <TableHead className="text-right">Bet&nbsp;USD</TableHead>
          <TableHead className="text-right">Currrent&nbsp;PNL&nbsp;USD</TableHead>
          <TableHead className="text-right">Cash&nbsp;USD</TableHead>
          <TableHead className="text-right">Avg&nbsp;Win-Rate</TableHead>
          <TableHead className="text-right">Avg&nbsp;PNL&nbsp;USD</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {holders.map((h) => (
          <TableRow key={h.address} className={(h.isFresh || h.sizeX === 0)? "opacity-70" : ""}>
            {/* Holder identity + copy button */}
            <TableCell>
              <div className="flex items-center gap-2">
                {/* <Avatar className="size-5 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {h.short.slice(0, 2)}
                  </AvatarFallback>
                </Avatar> */}
                <span>{h.short}</span>
                <Button
                  variant="link"
                  size="icon"
                  className="size-4"
                  onClick={(e) => handleCopy(e, h.address)}
                >
                  <Copy className="size-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {h.label}
                {h.isFresh && " · fresh wallet"}
              </p>
            </TableCell>

            {/* % of supply */}
            <TableCell className="text-right">
              {h.exposurePct.toFixed(2)}%
            </TableCell>

            {/* Sell score coloured bar */}
            <TableCell className="text-right">
                <TooltipProvider>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <span
                        className="inline-block h-2 w-16 rounded-full bg-muted"
                        style={{ background: `rgba(255,60,0,${h.sellScore})` }}
                        />
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                        <div className="text-sm font-medium">
                        Chance of selling soon: {(h.sellScore * 100).toFixed(2)}%
                        </div>
                    </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </TableCell>

            {/* Total ROI */}
            <TableCell className="text-right">
              {(h.pnlDollarRatio * 100).toFixed(0)}%
            </TableCell>

            {/* Position size */}
            <TableCell className="text-right">
              ${abbreviateNumber(h.sizeX)}
            </TableCell>

            {/* Total PnL */}
            <TableCell className="text-right">
              ${abbreviateNumber(h.tProfitUSD)}
            </TableCell>

            {/* Cash cushion */}
            <TableCell className="text-right">
              ${abbreviateNumber(h.cashUSD)}
            </TableCell>

            {/* avgWinRatePct */}
            <TableCell className="text-right">
              {abbreviateNumber(h.avgWinRatePct)}%
            </TableCell>

            {/* Avg pnl usd */}
            <TableCell className="text-right">
              ${abbreviateNumber(h.avgTotalPnlUSD)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
