import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export function TokenRisksCard({
    risks, ...props
  }: {
    risks: { name: string, level: string }[] | null,
  }) {

    return (
      <Card {...props} className="w-full h-full flex flex-col">
        <CardHeader>
          <CardTitle>AI Summary</CardTitle>
          <CardDescription>
            Automated insights from CherryFun AI agent
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto">
          {risks && risks.length > 0 ? (
            <ul className="list-disc list-inside space-y-2 text-sm">
              {risks.map((line, idx) => (
                <li key={idx} className="leading-relaxed">
                  {line.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No summary available.</p>
          )}
        </CardContent>
      </Card>
    )
}