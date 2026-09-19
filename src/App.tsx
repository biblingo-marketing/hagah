import { useRoute } from './nav'
import { Boundaries } from './screens/Boundaries'
import { Blocks } from './screens/Blocks'
import { Plan } from './screens/Plan'
import { Today } from './screens/Today'
import { Encode } from './screens/Encode'

export default function App() {
  const [route] = useRoute()
  if (route.startsWith('/boundaries')) return <Boundaries />
  if (route.startsWith('/blocks')) return <Blocks />
  if (route.startsWith('/plan')) return <Plan />
  if (route.startsWith('/encode/')) return <Encode chunkId={route.slice('/encode/'.length)} />
  return <Today />
}
