import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface SummaryBarProps {
  sumDebit: number;
  sumCredit: number;
  difference: number;
  postedBalance?: number;
  totalBalance?: number;
  carryOver?: number;
}

export function SummaryBar({
  sumDebit,
  sumCredit,
  difference,
  postedBalance,
  totalBalance,
  carryOver,
}: SummaryBarProps) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-muted-foreground">Total Debits</p>
          <p className="text-xl font-semibold text-red-600">
            {formatCurrency(sumDebit)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-muted-foreground">Total Credits</p>
          <p className="text-xl font-semibold text-green-600">
            {formatCurrency(sumCredit)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-muted-foreground">Difference</p>
          <p
            className={`text-xl font-semibold ${
              difference >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(difference)}
          </p>
        </CardContent>
      </Card>
      {postedBalance !== undefined && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Posted Balance</p>
            <p
              className={`text-xl font-semibold ${
                postedBalance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(postedBalance)}
            </p>
          </CardContent>
        </Card>
      )}
      {totalBalance !== undefined && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">
              Total Balance
            </p>
            <p
              className={`text-xl font-semibold ${
                totalBalance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(totalBalance)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
