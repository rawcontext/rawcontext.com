export interface MotionPreference {
	readonly reduced: boolean;
	subscribe(listener: () => void): () => void;
	dispose(): void;
}

/** Live view of `prefers-reduced-motion`, so a scene can react when it changes. */
export function createMotionPreference(): MotionPreference {
	const query = window.matchMedia('(prefers-reduced-motion: reduce)');
	const listeners = new Set<() => void>();
	const notify = () => {
		for (const listener of listeners) listener();
	};
	query.addEventListener('change', notify);
	return {
		get reduced() {
			return query.matches;
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		dispose() {
			listeners.clear();
			query.removeEventListener('change', notify);
		},
	};
}
