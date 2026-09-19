import { useRoute, navigate } from './nav'
import { Boundaries } from './screens/Boundaries'
import { Shell } from './components/Shell'
import { program, chunks, translation } from './content/content'

function Home() {
  return (
    <Shell>
      <div className="pt-10 pb-6">
        <h1 className="font-scripture text-5xl tracking-tight">Hagah</h1>
        <p className="text-neutral-500 mt-2 text-sm">by Biblingo</p>
      </div>

      <div className="rounded-2xl bg-ink-900 border border-ink-700 p-5 mb-6">
        <div className="label mb-1">Program</div>
        <div className="font-scripture text-3xl">{program.title}</div>
        <div className="text-neutral-400 text-sm mt-1">
          {program.subtitle} · {chunks.length} chunks ready
        </div>
      </div>

      <div className="space-y-3">
        <button className="tap-primary w-full" onClick={() => navigate('/boundaries')}>
          Review chunk boundaries
        </button>
      </div>

      <p className="text-xs text-neutral-600 leading-relaxed mt-10 pb-10">{translation.attribution}</p>
    </Shell>
  )
}

export default function App() {
  const [route] = useRoute()
  if (route.startsWith('/boundaries')) return <Boundaries />
  return <Home />
}
