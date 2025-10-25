import {
	AlarmClock,
	BookOpen,
	Github,
	ListMusic,
	Mail,
	Plane,
	Twitter,
	User,
} from "@lucide/astro";
import Bluesky from "./assets/bluesky.svg";
import Desktop from "./assets/desktop.svg";
import Discord from "./assets/discord.svg";
import Embedded from "./assets/embedded.svg";
import LastFM from "./assets/lastfm.svg";
import Mobile from "./assets/mobile.svg";
import Steam from "./assets/steam.svg";
import Telegram from "./assets/telegram.svg";
import Web from "./assets/web.svg";
import type { Info, Project, Skill, Social } from "./types";

export const Information: Info[] = [
	{
		icon: Plane,
		text: "Your Mom's House",
	},
];

export const MiscIcons = {
	User: User,
	AlarmClock: AlarmClock,
	BookOpen: BookOpen,
	ListMusic: ListMusic,
};

export const Platforms = {
	Web: Web,
	Mobile: Mobile,
	Desktop: Desktop,
	Embedded: Embedded,
};

export const Socials: Social[] = [
	{
		text: "Discord",
		url: "https://discord.com/users/929208515883569182",
		icon: Discord,
	},
	{
		text: "Telegram",
		url: "https://t.me/krystalskullofficial",
		icon: Telegram,
	},
	{
		text: "BlueSky",
		url: "https://bsky.app/profile/did:plc:l36smqxi5tikdooukmctmfi6",
		icon: Bluesky,
	},
	{
		text: "Twitter",
		url: "https://twitter.com/krstlskll69",
		icon: Twitter,
	},
	{
		text: "GitHub",
		url: "https://github.com/KrstlSkll69",
		icon: Github,
	},
	{
		text: "Last.fm",
		url: "https://www.last.fm/user/krystalskull_",
		icon: LastFM,
	},
	{
		text: "Steam",
		url: "https://steamcommunity.com/id/KrystalSkull69",
		icon: Steam,
	},
	{
		text: "Email",
		url: "mailto:indianajone@nest.rip",
		icon: Mail,
	},
];

export const Skills: Skill[] = [
	{
		text: "Software design",
		description: "Sass, CSS, & HTML",
		progress: 85,
	},
	{
		text: "Software development",
		description: "Visual Studio Code",
		progress: 75,
	},
];

export const Projects: Project[] = [
	{
		start: 2023,
		title: "Equicord",
		description:
			"The other cutest Discord mod, currently the head of support and community manager.",
		url: "https://equicord.org",
	},
	{
		start: 2024,
		title: "CSS Snippets",
		description: "A collection of CSS Snippets I made for discord.",
		url: "https://github.com/KrstlSkll69/vc-snippets",
	},
	{
		start: 2023,
		title: "AIO Emu Boogie",
		description: "A discord server with 1,400+ people.",
		url: "https://discord.gg/rVpjqJU564",
	},
	{
		start: 2024,
		title: "Nest.rip",
		description:
			"An image/file hosting service with a focus on privacy and security.",
		url: "https://nest.rip/",
	},
	{
		start: 2024,
		title: "UserPFP",
		description:
			"A Discord theme/plugin that allows having animated profile pictures without Nitro.",
		url: "https://github.com/UserPFP/UserPFP",
	},
];

export const Friends = [
	{
		url: "https://www.thororen.com",
		img: "https://www.thororen.com/assets/thororen.png",
		alt: "thororen",
		name: "thororen",
	},
	{
		url: "https://creations.works",
		img: "https://creations.works/public/assets/pfp.png",
		alt: "creations",
		name: "creations",
	},
	{
		url: "https://alphexo.dev/",
		img: "/assets/images/friends/753e891b-422b-405b-b8b1-4d167821f651.avif",
		alt: "Alphexo",
		name: "Alphexo",
	},
	{
		url: "https://catboys.zip/",
		img: "/assets/images/friends/784be1d3-8a78-4a9f-b308-7f372f22f8ce.avif",
		alt: "ToastedPotato",
		name: "Toast",
	},
	{
		url: "https://tesk.page/",
		img: "https://tesk.page/assets/logo-512x512.webp",
		alt: "EvilSkeleton",
		name: "EvilSkeleton",
	},
	{
		url: "https://zaynedrift.com/",
		img: "/assets/images/friends/10e5f8de-3492-4723-acc4-462a4e3d6c2d.avif",
		alt: "Zaynedrift",
		name: "Zayne",
	},
	{
		url: "https://shoritsu.xyz/",
		img: "/assets/images/friends/d76c4c47-c83b-4844-a8a1-f491f22b66e6.avif",
		alt: "Sho",
		name: "Sho",
	},
	{
		url: "https://nin0.dev/",
		img: "/assets/images/friends/3f5752e0-e696-4c95-9803-b04a24a14396.avif",
		alt: "nin0 dev",
		name: "nin0dev",
	},
	{
		url: "https://github.com/Jair4x",
		img: "/assets/images/friends/ad2f93fd-6a6b-4457-8de9-1a80dab063dd.avif",
		alt: "Jairo",
		name: "Jair4x",
	},
	{
		url: "https://zoey-on-github.github.io/",
		img: "/assets/images/friends/48652d6f-090f-4a07-a487-c4fc041eeaed.avif",
		alt: "juliethefoxcoon",
		name: "JulieFox",
	},
	{
		url: "https://hhls.xyz/",
		img: "/assets/images/friends/0f3fe256-ff47-4f3b-9d44-032f423c0d09.avif",
		alt: "hahalosahalt",
		name: "hahalosahalt",
	},
	{
		url: "https://sadan.zip/",
		img: "https://sadan.zip/assets/avatar.webp",
		alt: "sadan",
		name: "sadan",
	},
	{
		url: "https://bims.sh/",
		img: "https://bims.sh/image.png",
		alt: "bims.sh",
		name: "Bims",
	},
	{
		url: "https://mantikafasi.dev/",
		img: "/assets/images/friends/d2e4e58d-7276-4e0e-9e92-83d0c1086fd9.avif",
		alt: "mantikafasi",
		name: "mantikafasi",
	},
	{
		url: "https://github.com/vmohammad24/",
		img: "/assets/images/friends/390d8532-d10a-4e8e-8db6-7b280c959d8c.avif",
		alt: "mohammad",
		name: "vmohammad",
	},
	{
		url: "https://cortex.rest/",
		img: "/assets/images/friends/3f8eabe6-5225-43b5-9ca4-f9066fd168f2.avif",
		alt: "environment.",
		name: "Cortex",
	},
	{
		url: "https://nurmarv.in/",
		img: "/assets/images/friends/1406dbb3-8a79-42bc-be07-570edc7bdc6b.gif",
		alt: "Marvin",
		name: "Marvin",
	},
	{
		url: "https://github.com/SerStars",
		img: "/assets/images/friends/059f7385-40df-4312-bbab-678b3f68720a.avif",
		alt: "SerStars_lol",
		name: "SerStars",
	},
	{
		url: "https://github.com/EepyElvyra",
		img: "/assets/images/friends/c9c602d5-14b2-449f-b5d3-bfd4cc23ebbf.avif",
		alt: "EepyElvyra",
		name: "Elvyra",
	},
	{
		url: "https://rushii.dev/",
		img: "/assets/images/friends/a20cf785-fe1b-453f-b956-5303931b2add.avif",
		alt: "Rushii",
		name: "Rushii",
	},
	{
		url: "https://mudaranrhiod.xyz/",
		img: "/assets/images/friends/b28b3673-32da-4871-933f-452f0c5c865e.avif",
		alt: "Mudrhiod",
		name: "Moodle",
	},
];

export function shuffle<T>(array: T[]): T[] {
	return array
		.map((value) => ({ value, sort: Math.random() }))
		.sort((a, b) => a.sort - b.sort)
		.map(({ value }) => value);
}
