import { formatCurrency } from "@/lib/format";

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
}: SummaryBarProps) {
  const items = [
    {
      label: "Total Debits",
      value: formatCurrency(sumDebit),
      color: "text-red-600",
    },
    {
      label: "Total Credits",
      value: formatCurrency(sumCredit),
      color: "text-green-600",
    },
    {
      label: "Difference",
      value: formatCurrency(difference),
      color: difference >= 0 ? "text-green-600" : "text-red-600",
    },
    ...(postedBalance !== undefined
      ? [
          {
            label: "Posted Balance",
            value: formatCurrency(postedBalance),
            color: postedBalance >= 0 ? "text-green-600" : "text-red-600",
          },
        ]
      : []),
    ...(totalBalance !== undefined
      ? [
          {
            label: "Total Balance",
            value: formatCurrency(totalBalance),
            color: totalBalance >= 0 ? "text-green-600" : "text-red-600",
          },
        ]
      : []),
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`py-2 px-3 ${
            i < items.length - 1 ? "lg:border-r lg:border-border" : ""
          }`}
        >
          <p className="text-sm text-muted-foreground">{item.label}</p>
          <p className={`text-xl font-semibold ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
