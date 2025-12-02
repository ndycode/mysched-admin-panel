import { useEffect, useRef, useState } from 'react'

import { Button, Input, Select } from '@/components/ui'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { X, Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/SmoothDropdown'

import { ANALYTICS_OPTIONS } from '../constants'

type AnalyticsConfigureDialogProps = {
  open: boolean
  provider: string | null
  destination: string | null
  onSubmit: (provider: string | null, destination: string) => Promise<void> | void
  onClose: () => void
}

export function AnalyticsConfigureDialog({ open, provider, destination, onSubmit, onClose }: AnalyticsConfigureDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState(provider ?? 'none')
  const [destinationInput, setDestinationInput] = useState(destination ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const destinationRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    setSelectedProvider(provider ?? 'none')
    setDestinationInput(destination ?? '')
    setSubmitting(false)
    setError(null)
  }, [open, provider, destination])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const normalizedProvider = selectedProvider === 'none' ? null : selectedProvider
      await onSubmit(normalizedProvider, destinationInput)
      onClose()
    } catch (err) {
      const message = (err as { message?: string } | null)?.message ?? 'Unable to save analytics configuration.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()} className="max-w-3xl" initialFocus={destinationRef as React.RefObject<HTMLElement>}>
      <DialogHeader>
        <h2 className="text-lg font-semibold text-foreground">Configure analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">Update provider credentials and destination for analytics exports.</p>
      </DialogHeader>
      <DialogBody>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              className="caps-label caps-label--muted block"
              htmlFor="analytics-config-provider"
            >
              Provider
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  id="analytics-config-provider"
                  className="w-full rounded-full border-2 border-input bg-background/70 px-4 h-11 text-sm text-foreground shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-between"
                >
                  <span>{ANALYTICS_OPTIONS.find(opt => opt.value === selectedProvider)?.label}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-full">
                {ANALYTICS_OPTIONS.map(option => (
                  <DropdownMenuItem key={option.value} onClick={() => setSelectedProvider(option.value)}>
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-2">
            <label
              className="caps-label caps-label--muted block"
              htmlFor="analytics-config-destination"
            >
              Destination
            </label>
            <Input
              id="analytics-config-destination"
              ref={(node) => {
                destinationRef.current = node
              }}
              value={destinationInput}
              onChange={event => setDestinationInput(event.target.value)}
              placeholder="Workspace or dataset"
              aria-label="Analytics destination"
            />
          </div>
          {error ? <p className="text-sm text-[#be123c]">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3">
            <AnimatedActionBtn
              icon={X}
              label="Cancel"
              onClick={onClose}
              disabled={submitting}
              variant="secondary"
            />
            <AnimatedActionBtn
              icon={Check}
              label="Save changes"
              onClick={() => {
                const form = document.querySelector('form')
                if (form) form.requestSubmit()
              }}
              isLoading={submitting}
              loadingLabel="Saving..."
              variant="primary"
            />
          </div>
        </form>
      </DialogBody>
    </Dialog>
  )
}
