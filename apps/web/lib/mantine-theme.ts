import {
	createTheme,
	type MantineColorScheme,
	type MantineColorsTuple,
	type MantineThemeOverride,
} from "@mantine/core";
import type { ThemeMode, ThemeName } from "@schema";
import colors from "tailwindcss/colors";

const pick = (p: Record<string, string>): MantineColorsTuple =>
	[
		p["50"],
		p["100"],
		p["200"],
		p["300"],
		p["400"],
		p["500"],
		p["600"],
		p["700"],
		p["800"],
		p["900"],
	] as unknown as MantineColorsTuple;

// 16:NEUN turquoise palette: consistent in Mantine components and CSS.
const sixteenNine: Record<string, string> = {
  "50": "#edfafa",
  "100": "#d7f2f0",
  "200": "#afe3e0",
  "300": "#82d0cc",
  "400": "#55b8b6",
  "500": "#39a5a2",
  "600": "#238f8d",
  "700": "#187674",
  "800": "#175e5d",
  "900": "#144d4c",
};

const twForTheme: Record<ThemeName, keyof typeof colors> = {
	indigo: "blue",
	violet: "violet",
	teal: "teal",
	brand: "neutral",
};

function paletteFor(theme: ThemeName) {
	const brandTW = colors[twForTheme[theme]] as Record<string, string>;
	const grayTW = colors.zinc as Record<string, string>;

	return {
		brand: theme === "teal" ? pick(sixteenNine) : pick(brandTW),
		gray: pick(grayTW),
		// optional: expose a couple extra Tailwind palettes to Mantine components
		red: pick(colors.red),
		yellow: pick(colors.amber),
		green: pick(colors.green),
		blue: pick(colors.blue),
		violet: pick(colors.violet),
		teal: pick(colors.teal),
	};
}

export const createMantineTheme = ({
	theme,
	mode,
}: {
	theme: ThemeName;
	mode: ThemeMode;
}) => {
	const palettes = paletteFor(theme);

	const override: MantineThemeOverride = {
		colors: palettes,
		primaryColor: "brand",
		primaryShade: { light: 6, dark: 4 },
		fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",

		components: {
			Button: {
				defaultProps: {
					w: { base: "100%", sm: "auto" },
				},
				styles: {
					label: {
						whiteSpace: "normal",
						textAlign: "center",
					},
				},
			},
		},

		headings: {
			fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
		},
	};

	return {
		theme: createTheme(override),
		colorScheme: (mode === "system" ? "auto" : mode) as MantineColorScheme,
	};
};
