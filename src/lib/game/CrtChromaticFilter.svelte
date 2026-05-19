<!--
  CRT chromatic aberration filter definitions.
  Applied via CSS `filter: url(#crt-chromatic)` on the canvas at NATIVE device-pixel
  resolution — NOT inside the WebGL dither pass — because the dither pass renders at
  dot resolution (~256-px short edge) where sub-pixel UV offsets either snap to
  integers under NearestFilter (effect lost) or smear the dither dots under
  LinearFilter. Doing it after the pixelated upscale gives true 1-px-class R/B fringing
  without disturbing the dot grid.
-->

<svg
	class="crt-chromatic-defs"
	width="0"
	height="0"
	aria-hidden="true"
	focusable="false"
	data-testid="crt-chromatic-defs"
>
	<defs>
		<filter id="crt-chromatic" x="-2%" y="-2%" width="104%" height="104%">
			<feColorMatrix
				in="SourceGraphic"
				type="matrix"
				values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
				result="r_only"
			></feColorMatrix>
			<feOffset in="r_only" dx="3" dy="0" result="r_shifted"></feOffset>
			<feColorMatrix
				in="SourceGraphic"
				type="matrix"
				values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
				result="g_only"
			></feColorMatrix>
			<feColorMatrix
				in="SourceGraphic"
				type="matrix"
				values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
				result="b_only"
			></feColorMatrix>
			<feOffset in="b_only" dx="-3" dy="0" result="b_shifted"></feOffset>
			<feComposite
				in="r_shifted"
				in2="g_only"
				operator="arithmetic"
				k1="0"
				k2="1"
				k3="1"
				k4="0"
				result="rg"
			></feComposite>
			<feComposite in="rg" in2="b_shifted" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"
			></feComposite>
		</filter>
	</defs>
</svg>

<style>
	.crt-chromatic-defs {
		position: absolute;
		width: 0;
		height: 0;
		pointer-events: none;
	}
</style>
