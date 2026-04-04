'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { type Collaborator, type Profile } from '@/lib/types'
import { getAvatarGradient } from '@/lib/avatar-gradient'
import { toast } from 'sonner'

interface ManageCollaboratorsProps {
  recipeId: string
  ownerId: string
  collaborators: Collaborator[]
  onUpdate: (collaborators: Collaborator[]) => void
}

export default function ManageCollaborators({
  recipeId,
  ownerId,
  collaborators,
  onUpdate,
}: ManageCollaboratorsProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    async function fetchProfiles() {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
      setProfiles((data as Profile[]) ?? [])
    }
    fetchProfiles()
  }, [open])

  const existingIds = new Set([ownerId, ...collaborators.map((c) => c.user_id)])
  const availableProfiles = profiles
    .filter((p) => !existingIds.has(p.id))
    .filter((p) =>
      searchQuery.trim()
        ? p.display_name.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    )

  async function addCollaborator(profile: Profile) {
    setLoading(true)
    const { error } = await supabase
      .from('recipe_collaborators')
      .insert({ recipe_id: recipeId, user_id: profile.id })
    setLoading(false)

    if (error) {
      toast.error(`שגיאה בהוספת שותף: ${error.message}`)
      return
    }

    const newCollab: Collaborator = {
      user_id: profile.id,
      profiles: {
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      },
    }
    onUpdate([...collaborators, newCollab])
    setSearchQuery('')
    toast.success(`${profile.display_name} נוסף/ה כשותף/ה`)
  }

  async function removeCollaborator(userId: string) {
    setLoading(true)
    const { error } = await supabase
      .from('recipe_collaborators')
      .delete()
      .eq('recipe_id', recipeId)
      .eq('user_id', userId)
    setLoading(false)

    if (error) {
      toast.error('שגיאה בהסרת שותף')
      return
    }

    onUpdate(collaborators.filter((c) => c.user_id !== userId))
    toast.success('השותף/ה הוסר/ה')
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 active:scale-95"
      >
        <span className="material-symbols-outlined text-base">group</span>
        ניהול שותפים
        <span className="material-symbols-outlined text-base transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          expand_more
        </span>
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 space-y-4">
          {/* Current collaborators */}
          {collaborators.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">שותפים נוכחיים</h4>
              <div className="flex flex-col gap-2">
                {collaborators.map((c) => (
                  <div
                    key={c.user_id}
                    className="flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {c.profiles?.avatar_url ? (
                        <Image
                          src={c.profiles.avatar_url}
                          alt={c.profiles.display_name}
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: getAvatarGradient(c.user_id) }}
                        >
                          {c.profiles?.display_name?.charAt(0) ?? '?'}
                        </span>
                      )}
                      <span className="text-sm text-gray-700">{c.profiles?.display_name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCollaborator(c.user_id)}
                      disabled={loading}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-error/10 hover:text-error transition-colors disabled:opacity-50"
                      title="הסר שותף"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add collaborator */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">הוספת שותף/ה</h4>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש לפי שם..."
              className="w-full rounded-lg border border-gray-200 p-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
            {availableProfiles.length > 0 ? (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200">
                {availableProfiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addCollaborator(p)}
                    disabled={loading}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-surface-container-low disabled:opacity-50"
                  >
                    {p.avatar_url ? (
                      <Image
                        src={p.avatar_url}
                        alt={p.display_name}
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: getAvatarGradient(p.id) }}
                      >
                        {p.display_name?.charAt(0) ?? '?'}
                      </span>
                    )}
                    <span>{p.display_name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-400">
                {searchQuery.trim() ? 'לא נמצאו משתמשים' : 'כל המשתמשים כבר שותפים'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
