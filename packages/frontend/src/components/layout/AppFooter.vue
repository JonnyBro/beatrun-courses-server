<template>
	<footer class="border-t">
		<div
			class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 font-hud text-sm uppercase text-muted-foreground sm:flex-row"
		>
			<i18n-t keypath="footer.tagline" tag="p">
				<template #key><kbd>F4</kbd></template>
			</i18n-t>
			<a
				href="https://github.com/JonnyBro/beatrun-courses-server"
				target="_blank"
				rel="noopener"
				class="hover:text-hl"
			>
				{{ $t("footer.source") }}
			</a>
		</div>
	</footer>
</template>
