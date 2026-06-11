/**
 * @file src/module/roll-parser.ts
 * handles roll term parsing and floating tooltip rendering.
 **/

interface RollComponent {
	label: string;
	value: string;
	sign: string;
	is_dice: boolean;
	results_str?: string;
	damage_type?: string;
}

export class RollParser 
{
	private static active_target: HTMLElement | null = null;
	private static tooltip_element: HTMLDivElement | null = null;
	private static hover_timeout: number | null = null;
	private static cached_x: number = 0;
	private static cached_y: number = 0;
	private static listeners_activated: boolean = false;
	private static is_pinned: boolean = false;

	/**
	 * activates delegated event listeners globally on the document
	 **/
	public static activate_listeners( ): void 
	{
		if ( RollParser.listeners_activated ) 
		{
			return;
		}

		RollParser.listeners_activated = true;

		/**
		 * listen globally for clicks to dismiss active tooltips
		 **/
		document.addEventListener( 'click', ( event: MouseEvent ) => 
		{
			if ( RollParser.tooltip_element ) 
			{
				const current_target = event.target as HTMLElement;
				const inside_tooltip = RollParser.tooltip_element.contains( current_target );
				if ( !inside_tooltip ) 
				{
					RollParser.unpin_and_destroy( );
				}
			}
		}, 
		{ 
			capture: true 
		} );

		/**
		 * listen globally for mouse entering roll elements using capture phase
		 **/
		document.addEventListener( 'mouseover', ( event: MouseEvent ) => 
		{
			const target = ( event.target as HTMLElement ).closest( '#chat-log .dice-total, #chat-log .midi-qol-attack-roll .dice-total, #chat-log .midi-qol-damage-roll .dice-total, .inline-roll, .message .dice-total' ) as HTMLElement;
			
			if ( !target || target === RollParser.active_target ) 
			{
				return;
			}

			RollParser.active_target = target;
			RollParser.cached_x = event.clientX;
			RollParser.cached_y = event.clientY;

			RollParser.handle_mouseenter( target );
		}, 
		{ 
			capture: true 
		} );

		/**
		 * listen globally for mouse movement using capture phase
		 **/
		document.addEventListener( 'mousemove', ( event: MouseEvent ) => 
		{
			RollParser.cached_x = event.clientX;
			RollParser.cached_y = event.clientY;

			if ( RollParser.active_target && !RollParser.is_pinned ) 
			{
				const current_target = event.target as HTMLElement;
				
				/**
				 * check if the active target is still in the document
				 **/
				const in_dom = document.body.contains( RollParser.active_target );
				
				/**
				 * check if cursor is over the active target
				 **/
				const over_target = in_dom && ( RollParser.active_target === current_target || RollParser.active_target.contains( current_target ) );

				if ( !over_target ) 
				{
					const pinning_enabled = ( game as any ).settings.get( 'yugen-modifiers', 'enable-pinning' ) ?? true;
					if ( pinning_enabled && ( event.shiftKey || event.ctrlKey ) ) 
					{
						RollParser.pin_tooltip( );
					}
					else 
					{
						RollParser.handle_mouseleave( );
					}
				}
				else if ( RollParser.tooltip_element ) 
				{
					RollParser.position_tooltip( event.clientX, event.clientY );
				}
			}
		}, 
		{ 
			capture: true 
		} );

		/**
		 * listen globally for mouse leaving the window to clean up
		 **/
		document.addEventListener( 'mouseleave', ( ) => 
		{
			if ( !RollParser.is_pinned ) 
			{
				RollParser.handle_mouseleave( );
			}
		} );
	}

	/**
	 * handles the mouseenter event on a dice total
	 **/
	private static handle_mouseenter( target: HTMLElement ): void 
	{
		RollParser.unpin_and_destroy( );
		RollParser.clear_hover( );

		/** get the tooltip delay setting value **/
		const delay = ( game as any ).settings.get( 'yugen-modifiers', 'tooltip-delay' ) ?? 150;

		RollParser.hover_timeout = window.setTimeout( ( ) => 
		{
			RollParser.show_tooltip( target, RollParser.cached_x, RollParser.cached_y );
		}, delay );
	}

	/**
	 * handles the mouseleave event
	 **/
	private static handle_mouseleave( ): void 
	{
		RollParser.clear_hover( );
		RollParser.destroy_tooltip( );
		RollParser.active_target = null;
	}

	/**
	 * clears the active hover timeout
	 **/
	private static clear_hover( ): void 
	{
		if ( RollParser.hover_timeout !== null ) 
		{
			clearTimeout( RollParser.hover_timeout );
			RollParser.hover_timeout = null;
		}
	}

	/**
	 * destroys the active tooltip DOM element
	 **/
	private static destroy_tooltip( ): void 
	{
		if ( RollParser.tooltip_element ) 
		{
			RollParser.tooltip_element.remove( );
			RollParser.tooltip_element = null;
		}
	}

	/**
	 * positions the tooltip element safely on the screen
	 **/
	private static position_tooltip( x: number, y: number ): void 
	{
		if ( !RollParser.tooltip_element ) 
		{
			return;
		}

		const tooltip_width = RollParser.tooltip_element.offsetWidth;
		const tooltip_height = RollParser.tooltip_element.offsetHeight;

		const window_width = window.innerWidth;
		const window_height = window.innerHeight;

		let final_x = x + 15;
		let final_y = y + 15;

		if ( final_x + tooltip_width > window_width ) 
		{
			final_x = x - tooltip_width - 15;
		}

		if ( final_y + tooltip_height > window_height ) 
		{
			final_y = y - tooltip_height - 15;
		}

		final_x = Math.max( 5, Math.min( final_x, window_width - tooltip_width - 5 ) );
		final_y = Math.max( 5, Math.min( final_y, window_height - tooltip_height - 5 ) );

		RollParser.tooltip_element.style.left = `${ final_x }px`;
		RollParser.tooltip_element.style.top = `${ final_y }px`;
	}

	/**
	 * shows the tooltip with roll breakdown math
	 **/
	private static show_tooltip( target: HTMLElement, x: number, y: number ): void 
	{
		RollParser.destroy_tooltip( );

		let roll: any = null;
		let message: any = null;
		let actor: any = null;

		const is_inline = target.classList.contains( 'inline-roll' ) || target.closest( '.inline-roll' );

		if ( is_inline ) 
		{
			const inline_el = target.closest( '.inline-roll' ) as HTMLElement;
			const roll_data = inline_el?.dataset.roll || inline_el?.getAttribute( 'data-roll' );

			if ( roll_data ) 
			{
				try 
				{
					const decoded = decodeURIComponent( roll_data );
					const parsed = JSON.parse( decoded );
					const RollClass = ( globalThis as any ).Roll;

					if ( RollClass ) 
					{
						roll = RollClass.fromJSON( JSON.stringify( parsed ) );
					}
				}
				catch ( e ) 
				{
					/** fallback to formula **/
				}
			}
		}

		if ( !is_inline ) 
		{
			const message_el = target.closest( '.message' ) as HTMLElement;
			const message_id = message_el?.dataset.messageId;

			if ( !message_id ) 
			{
				return;
			}

			/** fetch the chat message by id **/
			message = ( game as any ).messages.get( message_id );

			if ( !message || !message.rolls || message.rolls.length === 0 ) 
			{
				return;
			}

			const all_totals = Array.from( message_el.querySelectorAll( '.dice-total, .midi-qol-attack-roll .dice-total, .midi-qol-damage-roll .dice-total' ) );
			const index = all_totals.indexOf( target );

			roll = message.rolls[ index ];

			const clean_text = ( target.textContent || '' ).replace( /\s+/g, '' );
			const parsed_total = parseFloat( clean_text );

			if ( !roll || Math.round( roll.total ) !== Math.round( parsed_total ) ) 
			{
				const match = message.rolls.find( ( r: any ) => 
				{
					return Math.round( r.total ) === Math.round( parsed_total );
				} );

				if ( match ) 
				{
					roll = match;
				}
			}

			if ( !roll ) 
			{
				return;
			}

			/** get the actor associated with the chat message **/
			let actor_inst = message.actor;
			if ( !actor_inst && message.speaker ) 
			{
				if ( message.speaker.token && message.speaker.scene ) 
				{
					const scene = ( game as any ).scenes.get( message.speaker.scene );
					const token = scene?.tokens.get( message.speaker.token );
					actor_inst = token?.actor;
				}

				if ( !actor_inst && message.speaker.actor ) 
				{
					actor_inst = ( game as any ).actors.get( message.speaker.actor );
				}
			}

			actor = actor_inst;
		}

		if ( !roll ) 
		{
			return;
		}

		const components = RollParser.parse_roll_components( roll, message, actor );

		RollParser.tooltip_element = document.createElement( 'div' );
		RollParser.tooltip_element.className = 'yugen-modifiers-tooltip';

		let is_critical = false;
		let is_fumble = false;

		if ( roll.terms ) 
		{
			for ( const term of roll.terms ) 
			{
				if ( ( typeof term.faces === 'number' || term.constructor.name === 'Die' ) && term.faces === 20 && term.results ) 
				{
					const active_results = term.results.filter( ( r: any ) => 
					{
						return r.active !== false && !r.discarded;
					} );
					for ( const res of active_results ) 
					{
						if ( res.result === 20 ) 
						{
							is_critical = true;
						}
						if ( res.result === 1 ) 
						{
							is_fumble = true;
						}
					}
				}
			}
		}

		if ( is_critical ) 
		{
			RollParser.tooltip_element.classList.add( 'critical' );
		}

		if ( is_fumble && !is_critical ) 
		{
			RollParser.tooltip_element.classList.add( 'fumble' );
		}

		const header = document.createElement( 'div' );
		header.className = 'yugen-modifiers-header';

		const formula_span = document.createElement( 'span' );
		formula_span.className = 'yugen-modifiers-formula';
		formula_span.textContent = roll.formula;

		const total_wrapper = document.createElement( 'div' );
		total_wrapper.className = 'yugen-modifiers-total-wrapper';

		const total_label = document.createElement( 'span' );
		total_label.className = 'yugen-modifiers-total-label';
		total_label.textContent = 'Total';

		const total_val = document.createElement( 'span' );
		total_val.className = 'yugen-modifiers-total';
		total_val.textContent = roll.total.toString( );

		const adv_mode = roll.options?.advantageMode;

		if ( adv_mode === 1 ) 
		{
			const badge = document.createElement( 'span' );
			badge.className = 'yugen-modifiers-badge advantage';
			badge.textContent = 'Adv';
			total_wrapper.appendChild( badge );
		}

		if ( adv_mode === -1 ) 
		{
			const badge = document.createElement( 'span' );
			badge.className = 'yugen-modifiers-badge disadvantage';
			badge.textContent = 'Dis';
			total_wrapper.appendChild( badge );
		}

		total_wrapper.appendChild( total_label );
		total_wrapper.appendChild( total_val );
		header.appendChild( formula_span );
		header.appendChild( total_wrapper );

		const divider = document.createElement( 'div' );
		divider.className = 'yugen-modifiers-divider';

		const list = document.createElement( 'ul' );
		list.className = 'yugen-modifiers-list';

		for ( const comp of components ) 
		{
			const item = document.createElement( 'li' );
			item.className = 'yugen-modifiers-item';

			const icon_span = document.createElement( 'span' );
			icon_span.className = 'yugen-modifiers-icon';

			let icon_class = 'fa-plus';

			if ( comp.is_dice ) 
			{
				icon_class = 'fa-dice-d20';
			}

			if ( comp.sign === '-' ) 
			{
				icon_class = 'fa-minus';
			}

			icon_span.innerHTML = `<i class="fas ${ icon_class }"></i>`;

			const label_span = document.createElement( 'span' );
			label_span.className = 'yugen-modifiers-label';
			label_span.textContent = comp.label;

			if ( comp.damage_type ) 
			{
				const dmg_badge = document.createElement( 'span' );
				dmg_badge.className = 'yugen-modifiers-damage-type';

				const icons: Record<string, string> = 
				{
					acid: 'fa-flask',
					bludgeoning: 'fa-hammer',
					cold: 'fa-snowflake',
					fire: 'fa-fire',
					force: 'fa-hand-sparkles',
					lightning: 'fa-bolt',
					necrotic: 'fa-skull',
					piercing: 'fa-bullseye',
					poison: 'fa-skull-crossbones',
					psychic: 'fa-brain',
					radiant: 'fa-sun',
					slashing: 'fa-slash',
					thunder: 'fa-volume-up'
				};

				const colors: Record<string, string> = 
				{
					acid: '#a3e635',
					bludgeoning: '#94a3b8',
					cold: '#38bdf8',
					fire: '#f87171',
					force: '#60a5fa',
					lightning: '#facc15',
					necrotic: '#c084fc',
					piercing: '#94a3b8',
					poison: '#34d399',
					psychic: '#f472b6',
					radiant: '#fbbf24',
					slashing: '#94a3b8',
					thunder: '#a78bfa'
				};

				const icon = icons[ comp.damage_type ] || 'fa-tint';
				const color = colors[ comp.damage_type ] || '#94a3b8';

				dmg_badge.style.color = color;
				dmg_badge.style.backgroundColor = `${ color }1c`;
				dmg_badge.style.border = `1px solid ${ color }40`;
				dmg_badge.innerHTML = `<i class="fas ${ icon }"></i> ${ comp.damage_type }`;

				label_span.appendChild( dmg_badge );
			}

			if ( comp.results_str ) 
			{
				const results_span = document.createElement( 'span' );
				results_span.className = 'yugen-modifiers-dice-results';
				results_span.textContent = comp.results_str;
				label_span.appendChild( results_span );
			}

			const value_span = document.createElement( 'span' );
			value_span.className = 'yugen-modifiers-value';

			const clean_val = comp.value.replace( /\s+/g, '' );

			if ( clean_val.startsWith( '+' ) ) 
			{
				value_span.classList.add( 'positive' );
			}

			if ( clean_val.startsWith( '-' ) ) 
			{
				value_span.classList.add( 'negative' );
			}

			value_span.textContent = clean_val;

			item.appendChild( icon_span );
			item.appendChild( label_span );
			item.appendChild( value_span );
			list.appendChild( item );
		}

		RollParser.tooltip_element.appendChild( header );
		RollParser.tooltip_element.appendChild( divider );
		RollParser.tooltip_element.appendChild( list );

		document.body.appendChild( RollParser.tooltip_element );
		RollParser.position_tooltip( x, y );

		requestAnimationFrame( ( ) => 
		{
			RollParser.tooltip_element?.classList.add( 'visible' );
		} );
	}

	/**
	 * parses roll terms into descriptive components
	 **/
	private static parse_roll_components( roll: any, message: any, actor: any ): RollComponent[] 
	{
		const components: RollComponent[] = [ ];
		let current_sign = '+';

		if ( roll.terms && roll.terms.length > 0 ) 
		{
			for ( const term of roll.terms ) 
			{
				if ( typeof term.operator === 'string' || term.constructor.name === 'OperatorTerm' || term.operator ) 
				{
					current_sign = term.operator || current_sign;
					continue;
				}

				if ( typeof term.faces === 'number' || term.constructor.name === 'Die' || term.faces ) 
				{
					const num_dice = term.number || 1;
					const faces = term.faces || 20;
					const formula = term.formula || `${ num_dice }d${ faces }`;

					const results = term.results || [ ];
					const active_results = results.filter( ( r: any ) => 
					{
						return r.active !== false && !r.discarded;
					} ).map( ( r: any ) => 
					{
						return r.result;
					} );

					const sum = active_results.reduce( ( a: number, b: number ) => 
					{
						return a + b;
					}, 0 );

					const result_parts = results.map( ( r: any ) => 
					{
						if ( r.discarded || r.active === false ) 
						{
							return `[${ r.result }]`;
						}
						return r.result.toString( );
					} );

					const results_str = result_parts.length > 0 ? `(${ result_parts.join( ', ' ) })` : '';

					let label = term.options?.flavor || term.flavor;
					if ( !label && faces !== 20 ) 
					{
						const resolved = RollParser.resolve_dice_label( formula, roll, message, actor );
						if ( resolved ) 
						{
							label = resolved;
						}
					}

					const dmg_type = RollParser.get_damage_type( term );

					components.push( {
						label: label ? `${ label } (${ formula })` : `Base Die (${ formula })`,
						value: `${ current_sign }${ sum }`,
						sign: current_sign,
						is_dice: true,
						results_str: results_str,
						damage_type: dmg_type || undefined
					} );

					continue;
				}

				if ( ( typeof term.number === 'number' && typeof term.faces === 'undefined' ) || term.constructor.name === 'NumericTerm' || typeof term.number === 'number' ) 
				{
					const val = term.number;
					const dmg_type = RollParser.get_damage_type( term ) || undefined;
					const breakdown = RollParser.breakdown_numeric_modifier( val, roll, actor );

					if ( breakdown && breakdown.length > 0 ) 
					{
						for ( const comp of breakdown ) 
						{
							comp.damage_type = dmg_type;
							if ( current_sign === '-' ) 
							{
								const clean_num = parseFloat( comp.value );
								const negated = -clean_num;
								comp.value = negated >= 0 ? `+${ negated }` : `${ negated }`;
								comp.sign = negated >= 0 ? '+' : '-';
							}
							components.push( comp );
						}
					}
					else 
					{
						const resolved_label = RollParser.resolve_numeric_label( val, roll, message, actor );
						components.push( {
							label: resolved_label,
							value: `${ current_sign }${ val }`,
							sign: current_sign,
							is_dice: false,
							damage_type: dmg_type
						} );
					}

					continue;
				}

				if ( term.terms || term.rolls ) 
				{
					components.push( {
						label: term.formula || 'Group',
						value: `${ current_sign }${ term.total }`,
						sign: current_sign,
						is_dice: false
					} );

					continue;
				}
			}
		}

		if ( !roll.terms || roll.terms.length === 0 ) 
		{
			const fallback = RollParser.parse_formula_string( roll.formula );
			components.push( ...fallback );
		}

		return components;
	}

	/**
	 * fallback parser for flat algebraic formula strings
	 **/
	private static parse_formula_string( formula: string ): RollComponent[] 
	{
		const components: RollComponent[] = [ ];
		const regex = /([+-]?)\s*([0-9]+d[0-9]+|[0-9]+)/g;
		let match;

		while ( ( match = regex.exec( formula ) ) !== null ) 
		{
			const sign = match[ 1 ] || '+';
			const term_str = match[ 2 ];

			if ( term_str.includes( 'd' ) ) 
			{
				components.push( {
					label: `Base Die (${ term_str })`,
					value: `${ sign }${ term_str }`,
					sign: sign,
					is_dice: true
				} );
			}

			if ( !term_str.includes( 'd' ) ) 
			{
				components.push( {
					label: 'Modifier',
					value: `${ sign }${ term_str }`,
					sign: sign,
					is_dice: false
				} );
			}
		}

		return components;
	}

	/**
	 * attempts to resolve a descriptive label for a numeric modifier
	 **/
	private static resolve_numeric_label( value: number, roll: any, message: any, actor: any ): string 
	{
		if ( !actor ) 
		{
			return 'Modifier';
		}

		const abs_val = Math.abs( value );

		/** check if value matches proficiency bonus **/
		const prof = actor.system.attributes?.prof || actor.system.prof;
		if ( prof && Math.abs( prof ) === abs_val ) 
		{
			return 'Proficiency Bonus';
		}

		/** check if roll has a specific ability associated **/
		const roll_ability = roll.options?.ability;
		if ( roll_ability && actor.system.abilities?.[ roll_ability ] ) 
		{
			const mod = actor.system.abilities[ roll_ability ].mod;
			if ( Math.abs( mod ) === abs_val ) 
			{
				const ability_names: Record<string, string> = 
				{
					str: 'Strength',
					dex: 'Dexterity',
					con: 'Constitution',
					int: 'Intelligence',
					wis: 'Wisdom',
					cha: 'Charisma'
				};
				const name = ability_names[ roll_ability ] || roll_ability.toUpperCase( );
				return `${ name } Modifier`;
			}
		}

		/** check all ability modifiers as a fallback **/
		if ( actor.system.abilities ) 
		{
			for ( const [ key, ability ] of Object.entries( actor.system.abilities ) as [ string, any ][ ] ) 
			{
				if ( ability && Math.abs( ability.mod ) === abs_val ) 
				{
					const ability_names: Record<string, string> = 
					{
						str: 'Strength',
						dex: 'Dexterity',
						con: 'Constitution',
						int: 'Intelligence',
						wis: 'Wisdom',
						cha: 'Charisma'
					};
					const name = ability_names[ key ] || key.toUpperCase( );
					return `${ name } Modifier`;
				}
			}
		}

		/** check active effects matching this change **/
		const effects = actor.appliedEffects || actor.effects || [ ];
		for ( const effect of effects ) 
		{
			if ( effect.disabled || effect.isSuppressed ) 
			{
				continue;
			}
			if ( effect.changes ) 
			{
				for ( const change of effect.changes ) 
				{
					const change_val = parseFloat( change.value );
					if ( !isNaN( change_val ) && Math.abs( change_val ) === abs_val ) 
					{
						return effect.name || effect.label || 'Active Effect';
					}
				}
			}
		}

		return 'Modifier';
	}

	/**
	 * attempts to resolve a descriptive label for a dice term
	 **/
	private static resolve_dice_label( formula: string, roll: any, message: any, actor: any ): string | null 
	{
		if ( !actor ) 
		{
			return null;
		}

		const clean_formula = formula.replace( /\s+/g, '' ).toLowerCase( );
		const is_debug = ( game as any ).settings.get( 'yugen-modifiers', 'debug-mode' );

		if ( is_debug ) 
		{
			console.log( 'yugen-modifiers | resolving dice label for formula:', formula, 'on actor:', actor.name );
		}

		/** check active effects matching this formula **/
		const effects = actor.appliedEffects || actor.effects || [ ];
		for ( const effect of effects ) 
		{
			if ( effect.disabled || effect.isSuppressed ) 
			{
				continue;
			}
			if ( effect.changes ) 
			{
				for ( const change of effect.changes ) 
				{
					const change_val = change.value?.toString( ).replace( /\s+/g, '' ).toLowerCase( );
					if ( is_debug ) 
					{
						console.log( 'yugen-modifiers | checking active effect:', effect.name || effect.label, 'change key:', change.key, 'change value:', change.value );
					}
					if ( change_val && ( change_val === clean_formula || change_val.includes( clean_formula ) ) ) 
					{
						return effect.name || effect.label;
					}
				}
			}
		}

		/** check actor items matching this formula **/
		if ( actor.items ) 
		{
			for ( const item of actor.items ) 
			{
				const dmg_parts = item.system.damage?.parts;
				if ( dmg_parts ) 
				{
					for ( const part of dmg_parts ) 
					{
						const part_formula = part[ 0 ]?.toString( ).replace( /\s+/g, '' ).toLowerCase( );
						if ( part_formula && ( part_formula === clean_formula || part_formula.includes( clean_formula ) ) ) 
						{
							return item.name;
						}
					}
				}

				const attack_bonus = item.system.attackBonus?.toString( ).replace( /\s+/g, '' ).toLowerCase( );
				if ( attack_bonus && ( attack_bonus === clean_formula || attack_bonus.includes( clean_formula ) ) ) 
				{
					return item.name;
				}
			}
		}

		return null;
	}

	/**
	 * extracts a known damage type from a roll term flavor
	 **/
	private static get_damage_type( term: any ): string | null 
	{
		const flavor = ( term.options?.flavor || term.flavor || '' ).toLowerCase( );
		const dmg_types = [
			'acid',
			'bludgeoning',
			'cold',
			'fire',
			'force',
			'lightning',
			'necrotic',
			'piercing',
			'poison',
			'psychic',
			'radiant',
			'slashing',
			'thunder'
		];

		for ( const type of dmg_types ) 
		{
			if ( flavor.includes( type ) ) 
			{
				return type;
			}
		}

		return null;
	}

	/**
	 * locks the active tooltip on the screen in a pinned state
	 **/
	private static pin_tooltip( ): void 
	{
		if ( !RollParser.tooltip_element || RollParser.is_pinned ) 
		{
			return;
		}

		RollParser.is_pinned = true;
		RollParser.tooltip_element.classList.add( 'pinned' );

		const header = RollParser.tooltip_element.querySelector( '.yugen-modifiers-header' );
		if ( header ) 
		{
			const pin = document.createElement( 'span' );
			pin.className = 'yugen-modifiers-pin-indicator';
			pin.innerHTML = '<i class="fas fa-thumbtack"></i> Pinned';

			const total_wrapper = header.querySelector( '.yugen-modifiers-total-wrapper' );
			if ( total_wrapper ) 
			{
				header.insertBefore( pin, total_wrapper );
			}
			else 
			{
				header.appendChild( pin );
			}
		}

		document.addEventListener( 'keydown', RollParser.global_keydown_handler );
	}

	/**
	 * captures escape key presses to dismiss a pinned tooltip
	 **/
	private static global_keydown_handler = ( event: KeyboardEvent ): void => 
	{
		if ( event.key === 'Escape' ) 
		{
			RollParser.unpin_and_destroy( );
		}
	};

	/**
	 * releases the pinned lock and hides the active tooltip
	 **/
	private static unpin_and_destroy( ): void 
	{
		RollParser.is_pinned = false;
		document.removeEventListener( 'keydown', RollParser.global_keydown_handler );
		RollParser.handle_mouseleave( );
	}

	/**
	 * breaks down a flat numeric modifier into its constituents (e.g. ability mod + proficiency)
	 **/
	private static breakdown_numeric_modifier( value: number, roll: any, actor: any ): RollComponent[] | null 
	{
		if ( !actor ) 
		{
			return null;
		}

		const components: RollComponent[] = [ ];
		let ab_mod = 0;
		let prof_contrib = 0;
		let other_bonus = 0;
		let ability_name = '';
		let bonus_label = 'Bonus';

		const ability_names: Record<string, string> = 
		{
			str: 'Strength',
			dex: 'Dexterity',
			con: 'Constitution',
			int: 'Intelligence',
			wis: 'Wisdom',
			cha: 'Charisma'
		};

		/** 1. check if it is a skill check **/
		const skill_id = roll.options?.skill;
		if ( skill_id && actor.system.skills?.[ skill_id ] ) 
		{
			const skill = actor.system.skills[ skill_id ];
			const ab = skill.ability || 'dex';
			
			ab_mod = actor.system.abilities[ ab ]?.mod || 0;
			ability_name = ability_names[ ab ] || ab.toUpperCase( );

			const prof = actor.system.attributes?.prof || 0;
			const prof_mult = skill.value || 0;
			prof_contrib = Math.floor( prof * prof_mult );

			other_bonus = ( skill.bonuses?.check ? parseFloat( skill.bonuses.check ) : 0 ) || 0;
			bonus_label = 'Skill Bonus';
		}

		/** 2. check if it is a saving throw **/
		const is_save = roll.options?.type === 'save' || roll.options?.savingThrow;
		const ability_id = roll.options?.ability;
		if ( !skill_id && is_save && ability_id && actor.system.abilities?.[ ability_id ] ) 
		{
			const ability = actor.system.abilities[ ability_id ];
			
			ab_mod = ability.mod || 0;
			ability_name = ability_names[ ability_id ] || ability_id.toUpperCase( );

			const prof = actor.system.attributes?.prof || 0;
			prof_contrib = ability.proficient ? prof : 0;

			other_bonus = ( ability.bonuses?.save ? parseFloat( ability.bonuses.save ) : 0 ) || 0;
			bonus_label = 'Save Bonus';
		}

		/** 3. check if it is a standard ability check **/
		const is_ability = roll.options?.type === 'ability' || ( roll.options?.ability && !is_save );
		if ( !skill_id && is_ability && ability_id && actor.system.abilities?.[ ability_id ] ) 
		{
			const ability = actor.system.abilities[ ability_id ];
			
			ab_mod = ability.mod || 0;
			ability_name = ability_names[ ability_id ] || ability_id.toUpperCase( );

			other_bonus = ( ability.bonuses?.check ? parseFloat( ability.bonuses.check ) : 0 ) || 0;
			bonus_label = 'Check Bonus';
		}

		/** 4. check if it is an attack roll **/
		const is_attack = roll.options?.type === 'attack';
		if ( is_attack ) 
		{
			const item_id = roll.options?.itemId || roll.options?.item?.id;
			const item = actor.items?.get( item_id );
			
			let ab = 'str';
			if ( item ) 
			{
				ab = item.ability || ( item.system.properties?.has?.( 'fin' ) ? 'dex' : 'str' );
			}
			
			ab_mod = actor.system.abilities[ ab ]?.mod || 0;
			ability_name = ability_names[ ab ] || ab.toUpperCase( );

			const prof = actor.system.attributes?.prof || 0;
			const is_proficient = item?.system.proficient || false;
			prof_contrib = is_proficient ? prof : 0;

			other_bonus = ( item?.system.attack?.bonus ? parseFloat( item.system.attack.bonus ) : 0 ) || 0;
			bonus_label = 'Weapon Bonus';
		}

		if ( !ability_name ) 
		{
			return null;
		}

		const resolved_sum = ab_mod + prof_contrib + other_bonus;

		if ( ab_mod !== 0 ) 
		{
			components.push( {
				label: `${ ability_name } Modifier`,
				value: ab_mod >= 0 ? `+${ ab_mod }` : `${ ab_mod }`,
				sign: ab_mod >= 0 ? '+' : '-',
				is_dice: false
			} );
		}

		if ( prof_contrib !== 0 ) 
		{
			components.push( {
				label: 'Proficiency Bonus',
				value: prof_contrib >= 0 ? `+${ prof_contrib }` : `${ prof_contrib }`,
				sign: prof_contrib >= 0 ? '+' : '-',
				is_dice: false
			} );
		}

		if ( other_bonus !== 0 ) 
		{
			components.push( {
				label: bonus_label,
				value: other_bonus >= 0 ? `+${ other_bonus }` : `${ other_bonus }`,
				sign: other_bonus >= 0 ? '+' : '-',
				is_dice: false
			} );
		}

		const diff = value - resolved_sum;
		if ( diff !== 0 ) 
		{
			components.push( {
				label: 'Other Modifiers',
				value: diff >= 0 ? `+${ diff }` : `${ diff }`,
				sign: diff >= 0 ? '+' : '-',
				is_dice: false
			} );
		}

		return components;
	}
}
