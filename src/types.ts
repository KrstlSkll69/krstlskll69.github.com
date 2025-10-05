import type { AstroComponent as LucideComponent } from '@lucide/astro'

// Base interface structure for any item that has an icon and a text.
export interface BaseItem {
    icon: LucideComponent
    text?: string
}

export interface Social extends BaseItem {
    url: string
}

export interface Skill {
    text: string
    subtext: string
    progress: number
}

export interface Project {
    start: number
    end?: number
    title: string
    description: string
    url: string
}
