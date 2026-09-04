import { AlertTriangle } from 'lucide-react'
import { PRODUCER_PORTAL_DISABLED_MESSAGE } from '@/config/featureFlags'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'

export default function ProducerPortalDisabledNotice() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12 text-center">
        <AlertTriangle className="mb-4 h-10 w-10 text-muted-foreground" />
        <CardTitle className="mb-2 text-lg">Portal no habilitado</CardTitle>
        <CardDescription>{PRODUCER_PORTAL_DISABLED_MESSAGE}</CardDescription>
      </CardContent>
    </Card>
  )
}
