'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface VoiceSOSProps {
  onTranscript: (text: string) => void
  onSOSTrigger?: () => void
}

const SOS_KEYWORDS = ['help', 'emergency', 'tulong', 'saklolo', 'sunog', 'fire', 'rescue']

interface SpeechRecognitionResultEventLike {
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  const recognitionWindow = window as SpeechRecognitionWindow
  return recognitionWindow.SpeechRecognition ?? recognitionWindow.webkitSpeechRecognition ?? null
}

export function VoiceSOS({ onTranscript, onSOSTrigger }: VoiceSOSProps) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSupported(Boolean(getSpeechRecognitionConstructor()))
    }, 0)

    return () => window.clearTimeout(id)
  }, [])

  function createRecognition() {
    const SpeechRecognition = getSpeechRecognitionConstructor()
    if (!SpeechRecognition) return null

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-PH' // Filipino-English

    recognition.onresult = (event: SpeechRecognitionResultEventLike) => {
      let fullTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript
      }
      setTranscript(fullTranscript)
      onTranscript(fullTranscript)

      // Check for SOS keywords
      const lower = fullTranscript.toLowerCase()
      const triggered = SOS_KEYWORDS.some((kw) => lower.includes(kw))
      if (triggered && onSOSTrigger) {
        onSOSTrigger()
        toast.success('SOS keyword detected!')
      }
    }

    recognition.onerror = () => {
      setListening(false)
      toast.error('Voice recognition error. Try again.')
    }

    recognition.onend = () => {
      setListening(false)
    }

    return recognition
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const recognition = createRecognition()
    if (!recognition) {
      toast.error('Speech recognition not supported')
      return
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
    toast.info('Listening... Speak now')
  }

  if (!supported) return null

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={listening ? 'destructive' : 'outline'}
        className={`w-full h-12 gap-2 ${listening ? 'animate-pulse bg-red-600 hover:bg-red-700' : 'border-slate-300'}`}
        onClick={toggleListening}
      >
        {listening ? (
          <>
            <MicOff className="w-5 h-5" />
            Stop Listening
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            Voice SOS — Speak to Describe
          </>
        )}
      </Button>
      {listening && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Volume2 className="w-3.5 h-3.5 animate-pulse text-red-500" />
          <span>Say &quot;Help&quot;, &quot;Emergency&quot;, or &quot;Tulong&quot; for instant SOS</span>
        </div>
      )}
      {transcript && (
        <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-200">
          <span className="font-medium text-slate-800">Heard:</span> {transcript}
        </p>
      )}
    </div>
  )
}
