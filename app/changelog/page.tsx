import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Bug, Calendar } from "lucide-react";
import { changelog } from "@/lib/changelog";

function getChangeIcon(type: "feature" | "improvement" | "fix") {
  switch (type) {
    case "feature":
      return <Sparkles className="h-4 w-4 text-green-500" />;
    case "improvement":
      return <Zap className="h-4 w-4 text-blue-500" />;
    case "fix":
      return <Bug className="h-4 w-4 text-amber-500" />;
  }
}

function getChangeBadge(type: "feature" | "improvement" | "fix") {
  switch (type) {
    case "feature":
      return <Badge variant="success">New</Badge>;
    case "improvement":
      return <Badge variant="info">Improved</Badge>;
    case "fix":
      return <Badge variant="warning">Fixed</Badge>;
  }
}

export default function ChangelogPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">What&apos;s New</h1>
              <p className="text-gray-500 text-sm">
                Latest updates and improvements to LedgeWise
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {changelog.map((entry, index) => (
            <Card key={entry.version} className={index === 0 ? "border-purple-200 bg-purple-50/30" : ""}>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">
                      {entry.title}
                    </CardTitle>
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      v{entry.version}
                    </Badge>
                    {index === 0 && (
                      <Badge variant="success">Latest</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    {new Date(entry.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <p className="text-gray-600 mt-2">{entry.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {entry.changes.map((change, changeIndex) => (
                    <li
                      key={changeIndex}
                      className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100"
                    >
                      <div className="mt-0.5">
                        {getChangeIcon(change.type)}
                      </div>
                      <div className="flex-1">
                        <span className="text-gray-700">{change.text}</span>
                      </div>
                      <div className="hidden md:block">
                        {getChangeBadge(change.type)}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-gray-50">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">
              Have a feature request or found a bug?{" "}
              <a
                href="https://github.com/anthropics/claude-code/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 hover:underline font-medium"
              >
                Let us know
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
