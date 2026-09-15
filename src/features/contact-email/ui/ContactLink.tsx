import type { ComponentProps, ReactElement } from 'react';
import * as ObfuscateModule from 'react-obfuscate';
import { flip } from '../model/obfuscation';

// react-obfuscate forwards unknown props to the anchor but does not declare them.
type ObfuscateProps = ComponentProps<typeof ObfuscateModule.default> & { className?: string };
type ObfuscateComponent = (props: ObfuscateProps) => ReactElement;

/**
 * react-obfuscate publishes a CommonJS main without an exports map, so under
 * Node's ESM interop (prerendering) its default export arrives wrapped once
 * more than in the browser bundle. Unwrap it so both sides get the component.
 */
function resolveObfuscate(): ObfuscateComponent {
	const exported: unknown = ObfuscateModule.default;
	if (typeof exported === 'function') return exported as ObfuscateComponent;
	return (exported as { default: ObfuscateComponent }).default;
}

const ObfuscateLink = resolveObfuscate();

interface ContactLinkProps {
	/** The address, reversed with `flip()` on the server. */
	reversed: string;
	/** Visible text. When omitted the address itself is shown. */
	label?: string;
	className?: string;
}

/**
 * A mailto link that stays unreadable to scrapers until a person hovers,
 * focuses, or clicks it. react-obfuscate keeps the href as a placeholder and
 * only writes the real `mailto:` on human interaction.
 */
export function ContactLink({ reversed, label, className }: ContactLinkProps) {
	const address = flip(reversed);

	if (label === undefined) {
		return <ObfuscateLink email={address} className={className} />;
	}

	return (
		<ObfuscateLink email={address} className={className} obfuscateChildren={false} linkText="#contact">
			{label}
		</ObfuscateLink>
	);
}
