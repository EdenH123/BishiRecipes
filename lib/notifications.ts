import { createClient } from '@/lib/supabase'

type NotificationType = 'comment' | 'rating' | 'favorite' | 'reaction' | 'new_recipe' | 'recipe_edited' | 'new_user'

interface SendNotificationOptions {
  recipientId: string
  type: NotificationType
  title: string
  body?: string
  recipeId?: string
  actorId?: string
}

/** Send a notification to a single user */
export async function sendNotification(opts: SendNotificationOptions) {
  const supabase = createClient()
  // Don't notify yourself
  if (opts.actorId && opts.actorId === opts.recipientId) return

  await supabase.from('notifications').insert({
    user_id: opts.recipientId,
    type: opts.type,
    title: opts.title,
    body: opts.body || '',
    recipe_id: opts.recipeId || null,
    actor_id: opts.actorId || null,
  })
}

/** Send a notification to all users except the actor */
export async function sendNotificationToAll(opts: {
  type: NotificationType
  title: string
  body?: string
  recipeId?: string
  actorId: string
}) {
  const supabase = createClient()
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .neq('id', opts.actorId)

  if (!users || users.length === 0) return

  const notifications = users.map(u => ({
    user_id: u.id,
    type: opts.type,
    title: opts.title,
    body: opts.body || '',
    recipe_id: opts.recipeId || null,
    actor_id: opts.actorId,
  }))

  await supabase.from('notifications').insert(notifications)
}
