'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { type Collaborator, type Profile } from '@/lib/types'
import { toast } from 'sonner'
import AvatarWithFrame from '@/components/AvatarWithFrame'
import { fetchEquippedFrames } from '@/lib/fetch-frames'

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
  const supabase = useMemo(() => createClient(), [])
  const [open, setOpen] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [frameMap, setFrameMap] = useState<Map<string, string>>(new Map())

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

  useEffect(() => {
    const allIds = [
      ...collaborators.map((c) => c.user_id),
      ...profiles.map((p) => p.id),
    ]
    const uniqueIds = Array.from(new Set(allIds))
    if (uniqueIds.length === 0) return
    fetchEquippedFrames(uniqueIds).then(setFrameMap)
  }, [collaborators, profiles])

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
                      <AvatarWithFrame
                        userId={c.user_id}
                        avatarUrl={c.profiles?.avatar_url}
                        displayName={c.profiles?.display_name}
                        frameId={frameMap.get(c.user_id) ?? null}
                        size={32}
                      />
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
                    <AvatarWithFrame
                      userId={p.id}
                      avatarUrl={p.avatar_url}
                      displayName={p.display_name}
                      frameId={frameMap.get(p.id) ?? null}
                      size={28}
                    />
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
