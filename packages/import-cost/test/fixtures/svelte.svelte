
<script lang="ts">
	import { func1 } from 'chai';

	export const name = 'import-cost';

	function getName() {
		return name;
	}

	$: document.title = name;

	$: {
		console.log(`hi`);
	}

	$: _name = getName();
</script>

<style lang="css">
</style>

<svelte:head>
	<title>TestApp</title>
	Name: {_name}
</svelte:head>
