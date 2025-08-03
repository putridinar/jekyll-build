import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GitBranch, Crown } from "lucide-react"

export default function SettingsPage() {
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo`;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl lg:text-3xl font-bold font-headline">Settings</h1>
      <Tabs defaultValue="github" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="github">GitHub</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="github">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">GitHub Integration</CardTitle>
              <CardDescription>
                Connect your GitHub account to publish content directly to your repositories.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-secondary/50">
                 <div>
                    <h3 className="font-semibold">Not Connected</h3>
                    <p className="text-sm text-muted-foreground">You have not connected your GitHub account yet.</p>
                 </div>
                 <Button className="mt-2 sm:mt-0" asChild>
                    <a href={githubUrl}>
                      <GitBranch className="mr-2 h-4 w-4" />
                      Connect with GitHub
                    </a>
                 </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="billing">
           <Card>
            <CardHeader>
              <CardTitle className="font-headline">Billing</CardTitle>
              <CardDescription>
                Manage your subscription and billing details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 rounded-lg border p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="font-semibold flex items-center">
                                <Crown className="mr-2 h-5 w-5 text-yellow-500" />
                                Pro Plan
                            </h3>
                            <p className="text-sm text-muted-foreground">$19 / month</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 sm:mt-0">Next renewal: July 30, 2024</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-end gap-2 border-t pt-4">
                        <Button variant="outline">Manage Subscription</Button>
                        <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">Cancel Plan</Button>
                    </div>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
