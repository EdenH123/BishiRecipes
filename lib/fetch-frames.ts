import { createClient } from '@/lib/supabase'
import { getShopItem } from '@/lib/coins'

/** Fetch equipped frame IDs for a list of user IDs. Returns a Map<userId, frameId>. */
export async function fetchEquippedFrames(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (userIds.length === 0) return map

  const supabase = createClient()
  const { data } = await supabase
    .from('user_items')
    .select('user_id, item_id')
    .in('user_id', userIds)
    .eq('equipped', true)

  if (data) {
    for (const row of data) {
      const item = getShopItem(row.item_id)
      if (item?.type === 'frame') {
        map.set(row.user_id, row.item_id)
      }
    }
  }

  return map
}
