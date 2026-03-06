import { create } from 'zustand'
import { Guest } from '@galaxy/shared-types'

interface GuestStore {
  guestId: string | null
  guest: Guest | null
  setGuest: (guestId: string, guest: Guest) => void
  clear: () => void
}

// 从 localStorage 恢复
const savedId = localStorage.getItem('galaxy_guest_id')
const savedGuest = (() => {
  try { return JSON.parse(localStorage.getItem('galaxy_guest') ?? 'null') }
  catch { return null }
})()

export const useGuestStore = create<GuestStore>((set) => ({
  guestId: savedId,
  guest: savedGuest,
  setGuest: (guestId, guest) => {
    localStorage.setItem('galaxy_guest_id', guestId)
    localStorage.setItem('galaxy_guest', JSON.stringify(guest))
    set({ guestId, guest })
  },
  clear: () => {
    localStorage.removeItem('galaxy_guest_id')
    localStorage.removeItem('galaxy_guest')
    set({ guestId: null, guest: null })
  },
}))
