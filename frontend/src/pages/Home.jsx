import React, { useContext, useEffect, useRef, useState } from 'react'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { CgMenuRight } from 'react-icons/cg'
import { RxCross1 } from 'react-icons/rx'
import { FiSend } from 'react-icons/fi'

function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } = useContext(userDataContext)
  const navigate = useNavigate()
  const [listening, setListening] = useState(false)
  const [userText, setUserText] = useState('')
  const [aiText, setAiText] = useState('')
  const [typedCommand, setTypedCommand] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [commandError, setCommandError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const isSpeakingRef = useRef(false)
  const recognitionRef = useRef(null)
  const isRecognizingRef = useRef(false)

  const handleLogOut = async () => {
    try { await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true }) }
    catch (error) { console.error('Logout error:', error) }
    finally { setUserData(null); navigate('/signin') }
  }

  const startRecognition = () => {
    if (!isSpeakingRef.current && !isRecognizingRef.current) {
      try { recognitionRef.current?.start() }
      catch (error) { if (error.name !== 'InvalidStateError') console.error('Start error:', error) }
    }
  }

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'hi-IN'
    const hindiVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang === 'hi-IN')
    if (hindiVoice) utterance.voice = hindiVoice
    isSpeakingRef.current = true
    utterance.onend = () => { setAiText(''); isSpeakingRef.current = false; setTimeout(startRecognition, 800) }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const handleCommand = (data) => {
    if (!data?.response) { setAiText('I could not process that command.'); return }
    setAiText(data.response)
    speak(data.response)
    const query = encodeURIComponent(data.userInput || '')
    const destinations = {
      'google-search': `https://www.google.com/search?q=${query}`,
      'calculator-open': 'https://www.google.com/search?q=calculator',
      'instagram-open': 'https://www.instagram.com/',
      'facebook-open': 'https://www.facebook.com/',
      'weather-show': 'https://www.google.com/search?q=weather',
      'youtube-search': `https://www.youtube.com/results?search_query=${query}`,
      'youtube-play': query ? `https://www.youtube.com/results?search_query=${query}` : 'https://www.youtube.com/',
    }
    if (destinations[data.type]) window.location.assign(destinations[data.type])
  }

  const handleTypedCommand = async (event) => {
    event.preventDefault()
    const command = typedCommand.trim()
    if (!command || isSending) return
    setCommandError(''); setIsSending(true); setUserText(command); setAiText('')
    try {
      const data = await getGeminiResponse(command)
      if (!data?.response) throw new Error('The assistant did not return a response.')
      handleCommand(data); setTypedCommand('')
    } catch (error) {
      console.error('Text command error:', error)
      setCommandError(error.response?.data?.response || "I couldn't send that command. Please try again.")
    }
    finally { setIsSending(false) }
  }

  const handleVoiceCommand = async (transcript) => {
    const assistantName = userData?.assistantName?.trim()
    const command = assistantName
      ? transcript.replace(new RegExp(`^${assistantName}[, ]*`, 'i'), '').trim()
      : transcript
    if (!command) return

    setUserText(transcript)
    setAiText('')
    setCommandError('')
    try {
      const data = await getGeminiResponse(command)
      handleCommand(data)
    } catch (error) {
      console.error('Voice command error:', error)
      setCommandError(error.response?.data?.response || "I couldn't process that voice command.")
    }
  }

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return undefined
    const recognition = new SpeechRecognition()
    recognition.continuous = true; recognition.lang = 'en-US'; recognition.interimResults = false
    recognitionRef.current = recognition
    let isMounted = true
    recognition.onstart = () => { isRecognizingRef.current = true; setListening(true) }
    recognition.onend = () => { isRecognizingRef.current = false; setListening(false); if (isMounted && !isSpeakingRef.current) setTimeout(startRecognition, 1000) }
    recognition.onerror = (event) => { isRecognizingRef.current = false; setListening(false); if (event.error !== 'aborted') console.warn('Recognition error:', event.error) }
    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim()
      if (!transcript) return
      recognition.stop(); isRecognizingRef.current = false; setListening(false)
      await handleVoiceCommand(transcript)
    }
    const startTimeout = setTimeout(startRecognition, 1000)
    const greeting = new SpeechSynthesisUtterance(`Hello ${userData.name}, what can I help you with?`)
    greeting.lang = 'hi-IN'; window.speechSynthesis.speak(greeting)
    return () => { isMounted = false; clearTimeout(startTimeout); recognition.stop(); window.speechSynthesis.cancel() }
  }, [])

  const history = userData.history?.slice(-7).reverse() || []
  const suggestions = ['Search Google for...', 'Play on YouTube', 'What is the weather?']

  return (
    <div className='min-h-screen w-full overflow-hidden bg-[#080b14] text-white'>
      <header className='flex h-[76px] items-center justify-between border-b border-white/10 px-5 lg:px-10'>
        <div><p className='text-[11px] font-medium uppercase tracking-[0.3em] text-cyan-300'>Voice workspace</p><h1 className='mt-1 text-xl font-semibold'>{userData?.assistantName || 'Assistant'}</h1></div>
        <div className='hidden items-center gap-3 lg:flex'><button className='rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-200 transition hover:bg-white/10' onClick={() => navigate('/customize')}>Customize</button><button className='rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#080b14] transition hover:bg-cyan-100' onClick={handleLogOut}>Log out</button></div>
        <CgMenuRight className='h-7 w-7 cursor-pointer lg:hidden' onClick={() => setMenuOpen(true)} />
      </header>

      <div className={`fixed inset-0 z-20 bg-[#080b14]/95 p-6 backdrop-blur-lg ${menuOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform lg:hidden`}>
        <RxCross1 className='absolute right-6 top-6 h-6 w-6 cursor-pointer' onClick={() => setMenuOpen(false)} />
        <div className='mt-16 flex flex-col gap-3'><button className='rounded-lg bg-white px-4 py-3 text-left font-semibold text-[#080b14]' onClick={() => navigate('/customize')}>Customize assistant</button><button className='rounded-lg border border-white/15 px-4 py-3 text-left' onClick={handleLogOut}>Log out</button></div>
        <div className='mt-10 border-t border-white/10 pt-6'><p className='text-xs uppercase tracking-[0.2em] text-gray-400'>Recent commands</p><div className='mt-4 flex flex-col gap-3'>{history.slice(0, 5).map((item, index) => <p key={index} className='truncate text-sm text-gray-300'>{item}</p>)}</div></div>
      </div>

      <main className='mx-auto grid min-h-[calc(100vh-76px)] max-w-[1500px] grid-cols-1 gap-6 p-5 lg:grid-cols-[230px_minmax(0,1fr)_300px] lg:p-10'>
        <aside className='hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:block'><p className='text-xs uppercase tracking-[0.2em] text-gray-400'>Recent commands</p><div className='mt-5 flex flex-col gap-4'>{history.map((item, index) => <p key={index} className='border-b border-white/5 pb-3 text-sm leading-5 text-gray-300'>{item}</p>)}</div></aside>

        <section className='flex min-h-[500px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,#19344a,#0d121d_55%)] px-5 py-8'>
          <div className='mb-8 flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs text-cyan-200'><span className={`h-2 w-2 rounded-full ${listening ? 'bg-cyan-300 shadow-[0_0_12px_#67e8f9]' : 'bg-gray-500'}`} />{listening ? 'Listening for your voice' : isSending ? 'Processing command' : 'Ready for a command'}</div>
          <div className='flex h-[220px] w-[220px] items-center justify-center overflow-hidden rounded-full border border-cyan-200/20 bg-black/30 shadow-[0_0_70px_rgba(34,211,238,0.12)] sm:h-[280px] sm:w-[280px]'><img src={userData?.assistantImage} alt={`${userData?.assistantName} avatar`} className='h-full w-full object-cover' /></div>
          <p className='mt-5 text-sm text-gray-400'>Hello {userData?.name}</p><p className='mt-2 max-w-[520px] text-center text-lg font-medium text-gray-100'>{userText || aiText || 'What would you like me to do?'}</p>
        </section>

        <aside className='flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5'><p className='text-xs uppercase tracking-[0.2em] text-gray-400'>Command center</p><h2 className='mt-2 text-lg font-semibold'>Tell me what to do</h2><div className='mt-5 flex flex-wrap gap-2'>{suggestions.map((suggestion) => <button key={suggestion} type='button' onClick={() => setTypedCommand(suggestion)} className='rounded-full border border-white/10 px-3 py-2 text-left text-xs text-gray-300 transition hover:border-cyan-300/50 hover:text-cyan-200'>{suggestion}</button>)}</div>
          <form onSubmit={handleTypedCommand} className='mt-auto pt-6'><label htmlFor='typed-command' className='mb-2 block text-xs text-gray-400'>Structured command</label><textarea id='typed-command' value={typedCommand} onChange={(event) => setTypedCommand(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit() } }} placeholder='e.g. search YouTube for jazz' rows={4} disabled={isSending} className='w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white outline-none placeholder:text-gray-500 focus:border-cyan-300/60' /><button type='submit' disabled={isSending || !typedCommand.trim()} className='mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-[#071018] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40'><FiSend />{isSending ? 'Sending...' : 'Send command'}</button><p className='mt-2 min-h-[18px] text-xs text-red-300'>{commandError}</p></form>
        </aside>
      </main>
    </div>
  )
}

export default Home