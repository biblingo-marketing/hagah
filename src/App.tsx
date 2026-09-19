import { useRoute } from './nav'
import { Today } from './screens/Today'
import { Boundaries } from './screens/Boundaries'
import { Blocks } from './screens/Blocks'
import { Plan } from './screens/Plan'
import { Encode } from './screens/Encode'
import { RecallCheck } from './screens/RecallCheck'
import { WeeklyCheck } from './screens/WeeklyCheck'
import { RunCard } from './screens/RunCard'
import { Commute } from './screens/Commute'
import { RandomEntry } from './screens/RandomEntry'
import { Integrity } from './screens/Integrity'
import { Settings } from './screens/Settings'

export default function App() {
  const [route] = useRoute()
  if (route.startsWith('/boundaries')) return <Boundaries />
  if (route.startsWith('/blocks')) return <Blocks />
  if (route.startsWith('/plan')) return <Plan />
  if (route.startsWith('/encode/')) return <Encode chunkId={route.slice('/encode/'.length)} />
  if (route.startsWith('/recall')) return <RecallCheck />
  if (route.startsWith('/weekly')) return <WeeklyCheck />
  if (route.startsWith('/run')) return <RunCard />
  if (route.startsWith('/commute')) return <Commute />
  if (route.startsWith('/random-entry')) return <RandomEntry />
  if (route.startsWith('/integrity')) return <Integrity />
  if (route.startsWith('/settings')) return <Settings />
  return <Today />
}
