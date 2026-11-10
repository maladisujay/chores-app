import { useCallback, useEffect, useState } from 'react'
import { getBackend } from './lib/backend.js'
import { HouseProvider, useHouse } from './store.jsx'
import { FeedbackProvider } from './components/Feedback.jsx'
import { Spinner, Button } from './components/ui.jsx'
import TabBar from './components/TabBar.jsx'
import Welcome from './screens/Welcome.jsx'
import HomeScreen from './screens/HomeScreen.jsx'
import CalendarScreen from './screens/CalendarScreen.jsx'
import LeaderboardScreen from './screens/LeaderboardScreen.jsx'
import HouseScreen from './screens/HouseScreen.jsx'
import LogChoreSheet from './sheets/LogChoreSheet.jsx'
import LogDetailSheet from './sheets/LogDetailSheet.jsx'
import DemoBar from './components/DemoBar.jsx'

function readJoinCode() {
  const m = location.hash.match(/join=([A-Za-z0-9]{6})/)
  if (m) {
    history.replaceState(null, '', location.pathname + location.search)
    return m[1].toUpperCase()
  }
  return null
}

export default function App() {
  return (
    <FeedbackProvider>
      <Root />
    </FeedbackProvider>
  )
}

function Root() {
  const [backend, setBackend] = useState(null)
  const [houses, setHouses] = useState(null)
  const [houseId, setHouseId] = useState(() => localStorage.getItem('current-house'))
  const [bootError, setBootError] = useState(null)
  const [joinCode, setJoinCode] = useState(readJoinCode)
  const [adding, setAdding] = useState(false) // joining/creating another home while in one

  const loadHouses = useCallback(async (b = backend) => {
    const list = await b.rpc('my_houses')
    setHouses(list)
    return list
  }, [backend])

  useEffect(() => {
    ;(async () => {
      try {
        const b = await getBackend()
        await b.ensureSession()
        setBackend(b)
        const list = await b.rpc('my_houses')
        setHouses(list)
      } catch (e) {
        setBootError(e)
      }
    })()
    const onHash = () => {
      const c = readJoinCode()
      if (c) setJoinCode(c)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const current = houses?.find((h) => h.id === houseId) || houses?.[0]
  useEffect(() => {
    if (current) localStorage.setItem('current-house', current.id)
  }, [current])

  const enterHouse = useCallback(
    async (id) => {
      await loadHouses()
      setHouseId(id)
      localStorage.setItem('current-house', id)
      setAdding(false)
      setJoinCode(null)
    },
    [loadHouses],
  )

  const lostAccess = useCallback(async () => {
    const list = await loadHouses()
    setHouseId(list[0]?.id || null)
  }, [loadHouses])

  if (bootError) {
    return (
      <div className="boot">
        <div className="boot-card glass">
          <h2>Can't connect</h2>
          <p>{bootError.message}</p>
          <Button onClick={() => location.reload()}>Try again</Button>
        </div>
      </div>
    )
  }
  if (!backend || !houses) {
    return (
      <div className="boot">
        <div className="boot-logo"><img src="icon.svg" alt="" /></div>
        <Spinner size={26} />
      </div>
    )
  }

  if (!current || adding || joinCode) {
    return (
      <>
        <Welcome
          backend={backend}
          joinCode={joinCode}
          onDone={enterHouse}
          onCancel={current ? () => { setAdding(false); setJoinCode(null) } : null}
        />
        {backend.mode === 'demo' && <DemoBar backend={backend} houseId={current?.id} onSwitched={() => location.reload()} />}
      </>
    )
  }

  return (
    <HouseProvider key={current.id} backend={backend} houseId={current.id} onLostAccess={lostAccess}>
      <Shell
        houses={houses}
        onSwitchHouse={(id) => setHouseId(id)}
        onAddHouse={() => setAdding(true)}
        onLeft={lostAccess}
        onHousesChanged={loadHouses}
      />
      {backend.mode === 'demo' && <DemoBar backend={backend} houseId={current.id} onSwitched={() => location.reload()} />}
    </HouseProvider>
  )
}

function Shell(props) {
  const h = useHouse()
  const [tab, setTab] = useState('home')
  const [logOpen, setLogOpen] = useState(false)
  const [logTask, setLogTask] = useState(null)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  if (h.loading) {
    return (
      <div className="boot">
        {h.error ? (
          <div className="boot-card glass">
            <h2>Couldn't load your home</h2>
            <p>{h.error.message}</p>
            <Button onClick={h.refresh}>Retry</Button>
          </div>
        ) : (
          <Spinner size={26} />
        )}
      </div>
    )
  }

  const openLog = (log) => setDetail(log.id)
  const detailLog = detail ? h.logs.find((l) => l.id === detail) : null

  return (
    <div className="app">
      <main className="screen" key={tab}>
        {tab === 'home' && <HomeScreen onOpenLog={openLog} onGo={setTab} onQuickLog={(id) => { setLogTask(id); setLogOpen(true) }} />}
        {tab === 'calendar' && <CalendarScreen onOpenLog={openLog} />}
        {tab === 'ranks' && <LeaderboardScreen onOpenLog={openLog} />}
        {tab === 'house' && <HouseScreen {...props} />}
      </main>
      <TabBar tab={tab} onTab={setTab} onLog={() => { setLogTask(null); setLogOpen(true) }} badge={h.isOwner ? h.pendingRequests.length : 0} />
      <LogChoreSheet open={logOpen} initialTaskId={logTask} onClose={() => setLogOpen(false)} />
      <LogDetailSheet open={!!detailLog} log={detailLog} onClose={() => setDetail(null)} />
    </div>
  )
}
