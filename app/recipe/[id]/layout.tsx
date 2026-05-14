import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface Props {
  params: { id: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: recipe } = await supabase
      .from('recipes')
      .select('title, description, image_url, profiles!created_by(display_name)')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single()

    if (!recipe) {
      return { title: 'מתכון לא נמצא — BISHILicious' }
    }

    const profiles = recipe.profiles as unknown as { display_name: string } | { display_name: string }[] | null
    const author = Array.isArray(profiles) ? profiles[0]?.display_name || '' : profiles?.display_name || ''
    const title = `${recipe.title} — BISHILicious`
    const description = recipe.description
      ? `${recipe.description.slice(0, 120)}${recipe.description.length > 120 ? '...' : ''}`
      : `מתכון ${recipe.title}${author ? ` מאת ${author}` : ''}`

    return {
      title,
      description,
      openGraph: {
        title: recipe.title,
        description,
        images: recipe.image_url ? [{ url: recipe.image_url, width: 800, height: 600 }] : [],
        type: 'article',
        siteName: 'BISHILicious',
        locale: 'he_IL',
      },
      twitter: {
        card: recipe.image_url ? 'summary_large_image' : 'summary',
        title: recipe.title,
        description,
        images: recipe.image_url ? [recipe.image_url] : [],
      },
    }
  } catch {
    return { title: 'BISHILicious' }
  }
}

export default function RecipeLayout({ children }: Props) {
  return children
}
