import type { AstroComponent as LucideComponent } from '@lucide/astro'

export type Theme = 'light' | 'dark'

export interface Info {
    icon: LucideComponent
    text: string
}

export interface Social extends Info {
    url: string
}

export interface Skill {
    text: string
    description: string
    progress: number
}

export interface Project {
    start: number
    end?: number
    title: string
    description: string
    url: string
}

export interface Product {
    url: string
    cover: string
    title: string
    description: string
    price: number // 0 = Free
}