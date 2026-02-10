import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

export function AuthCardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md animate-fade-in space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Star className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold">별들에게 물어봐</h1>
          <p className="text-sm text-muted-foreground">영상 제작 관리 플랫폼</p>
        </div>
        <Card className="shadow-lg">
          <CardContent className="pt-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
